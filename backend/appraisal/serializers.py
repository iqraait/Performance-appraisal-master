from rest_framework import serializers
from .models import Employee, Appraisal, Branch, DepartmentAdmin, TrainingEmployee, WhatsAppConfig, TraineeAssessment
from django.contrib.auth.models import User

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'


import datetime

class AutoCreateBranchField(serializers.SlugRelatedField):
    """
    SlugRelatedField that automatically gets or creates branches by name,
    handles empty/blank strings safely by returning None, and performs case-insensitive matching.
    """
    def to_internal_value(self, data):
        if not data:
            return None
        name = str(data).strip()
        if not name:
            return None
        branch = Branch.objects.filter(name__iexact=name).first()
        if not branch:
            branch, _ = Branch.objects.get_or_create(name=name)
        return branch


class EmployeeSerializer(serializers.ModelSerializer):
    branch = AutoCreateBranchField(slug_field='name', queryset=Branch.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = '__all__'
        validators = []  # Allows smooth upsert handling without premature unique_together rejection

    def to_internal_value(self, data):
        d = data.copy() if hasattr(data, 'copy') else dict(data)
        # Resilient date of joining
        doj = d.get('date_of_joining')
        if not doj or str(doj).strip() == '':
            d['date_of_joining'] = datetime.date.today().isoformat()
        elif isinstance(doj, str):
            cleaned = doj.strip()
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
                try:
                    d['date_of_joining'] = datetime.datetime.strptime(cleaned, fmt).date().isoformat()
                    break
                except ValueError:
                    pass
        if not d.get('assignment_period'):
            d['assignment_period'] = 'April-2026 to June-2026'
        if not d.get('designation'):
            d['designation'] = 'Staff'
        return super().to_internal_value(d)



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser']


class AppraisalSerializer(serializers.ModelSerializer):
    branch = serializers.SlugRelatedField(slug_field='name', queryset=Branch.objects.all(), required=False, allow_null=True)
    submitted_by_detail = UserSerializer(source='submitted_by', read_only=True)

    class Meta:
        model = Appraisal
        fields = '__all__'
        read_only_fields = ['performance_score', 'final_score', 'rating', 'submitted_by']

    def validate(self, data):
        # Validate duplicate submission (same employee + period + department/location)
        employee_code = data.get('employee_code')
        assignment_period = data.get('assignment_period')
        dept = data.get('department')
        loc = data.get('location')
        branch = data.get('branch')
        
        instance = self.instance
        if not employee_code and instance:
            employee_code = instance.employee_code
        if not assignment_period and instance:
            assignment_period = instance.assignment_period
        if not dept and instance:
            dept = instance.department
        if not loc and instance:
            loc = instance.location
        if not branch and instance:
            branch = instance.branch

        if employee_code and assignment_period:
            query = Appraisal.objects.filter(employee_code=employee_code, assignment_period=assignment_period)
            if dept:
                query = query.filter(department=dept)
            if loc:
                query = query.filter(location=loc)
            if branch:
                query = query.filter(branch=branch)
            if instance:
                query = query.exclude(id=instance.id)
            if query.exists():
                raise serializers.ValidationError("An appraisal for this employee in this assignment period, department, location, and branch has already been submitted.")

        # Validate domains are between 0 and 20
        domains = [
            'job_competence',
            'productivity_responsibility',
            'communication_teamwork',
            'professionalism_discipline',
            'initiative_improvement'
        ]
        for field in domains:
            val = data.get(field)
            if val is not None and (val < 0 or val > 20):
                raise serializers.ValidationError({field: "Domain scores must be between 0 and 20."})
        
        # Enforce department/location/branch-wise Grade A/B limit (at most 50% of active staff), EXCEPT for MANAGER POOL
        def get_val(field):
            if field in data:
                return data[field]
            if instance:
                return getattr(instance, field)
            return 0

        job_competence = get_val('job_competence')
        productivity_responsibility = get_val('productivity_responsibility')
        communication_teamwork = get_val('communication_teamwork')
        professionalism_discipline = get_val('professionalism_discipline')
        initiative_improvement = get_val('initiative_improvement')
        total_deduction = get_val('total_deduction')

        performance_score = (
            int(job_competence or 0) +
            int(productivity_responsibility or 0) +
            int(communication_teamwork or 0) +
            int(professionalism_discipline or 0) +
            int(initiative_improvement or 0)
        )
        final_score = performance_score - int(total_deduction or 0)

        # Derived Rating
        if final_score >= 90:
            rating = 'Outstanding (A)'
        elif final_score >= 75:
            rating = 'Very Good (B)'
        else:
            rating = 'Other'

        if rating in ['Outstanding (A)', 'Very Good (B)']:
            department = data.get('department')
            if not department and instance:
                department = instance.department
            location = data.get('location')
            if not location and instance:
                location = instance.location
            
            # Exempt MANAGER POOL from 50% Grade A/B limit
            is_manager_pool = (department and ('MANAGER POOL' in department.strip().upper() or 'MANGER POOL' in department.strip().upper())) or \
                              (location and ('MANAGER POOL' in location.strip().upper() or 'MANGER POOL' in location.strip().upper()))

            if not is_manager_pool:
                if location:
                    # Location-based limit
                    emp_qs = Employee.objects.filter(location=location, status='Active')
                    app_qs = Appraisal.objects.filter(location=location, rating__in=['Outstanding (A)', 'Very Good (B)'])
                    if branch:
                        emp_qs = emp_qs.filter(branch=branch)
                        app_qs = app_qs.filter(branch=branch)

                    total_active_staff = emp_qs.count()
                    if total_active_staff == 0:
                        fallback_qs = Employee.objects.filter(location=location)
                        if branch:
                            fallback_qs = fallback_qs.filter(branch=branch)
                        total_active_staff = fallback_qs.count()
                    
                    max_allowed_ab = max(1, (total_active_staff + 1) // 2)
                    
                    if instance:
                        app_qs = app_qs.exclude(id=instance.id)
                    
                    existing_ab_count = app_qs.count()
                    
                    if existing_ab_count >= max_allowed_ab:
                        raise serializers.ValidationError(
                            f"You have already assessed {existing_ab_count} of your staff in location '{location}' "
                            f"to A or B (Max allowed: {max_allowed_ab} out of {total_active_staff} active staff). "
                            "Please assign to another grade."
                        )
                elif department:
                    # Fallback to Department-based limit if no location
                    emp_qs = Employee.objects.filter(department=department, status='Active')
                    app_qs = Appraisal.objects.filter(department=department, rating__in=['Outstanding (A)', 'Very Good (B)'])
                    if branch:
                        emp_qs = emp_qs.filter(branch=branch)
                        app_qs = app_qs.filter(branch=branch)

                    total_active_staff = emp_qs.count()
                    if total_active_staff == 0:
                        fallback_qs = Employee.objects.filter(department=department)
                        if branch:
                            fallback_qs = fallback_qs.filter(branch=branch)
                        total_active_staff = fallback_qs.count()
                    
                    max_allowed_ab = max(1, (total_active_staff + 1) // 2)
                    
                    if instance:
                        app_qs = app_qs.exclude(id=instance.id)
                    
                    existing_ab_count = app_qs.count()
                    
                    if existing_ab_count >= max_allowed_ab:
                        raise serializers.ValidationError(
                            f"You have already assessed {existing_ab_count} of your staff in department '{department}' "
                            f"to A or B (Max allowed: {max_allowed_ab} out of {total_active_staff} active staff). "
                            "Please assign to another grade."
                        )
        
        return data


class DepartmentAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = DepartmentAdmin
        fields = ['id', 'user', 'user_detail', 'username', 'password', 'departments', 'locations', 'branches', 'whatsapp_number']
        read_only_fields = ['user']

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
        
        user, created = User.objects.get_or_create(username=username, defaults={'is_staff': True})
        if password:
            user.set_password(password)
        user.is_staff = True
        user.save()

        dept_admin, _ = DepartmentAdmin.objects.update_or_create(user=user, defaults=validated_data)
        return dept_admin

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.user.set_password(password)
            instance.user.save()
        return super().update(instance, validated_data)


class TrainingEmployeeSerializer(serializers.ModelSerializer):
    branch = AutoCreateBranchField(slug_field='name', queryset=Branch.objects.all(), required=False, allow_null=True)
    days_remaining = serializers.SerializerMethodField()
    is_alert_due = serializers.SerializerMethodField()
    dept_admins = serializers.SerializerMethodField()

    class Meta:
        model = TrainingEmployee
        fields = '__all__'
        validators = []

    def to_internal_value(self, data):
        d = data.copy() if hasattr(data, 'copy') else dict(data)
        doj = d.get('date_of_joining')
        if not doj or str(doj).strip() == '':
            d['date_of_joining'] = datetime.date.today().isoformat()
        elif isinstance(doj, str):
            cleaned = doj.strip()
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
                try:
                    d['date_of_joining'] = datetime.datetime.strptime(cleaned, fmt).date().isoformat()
                    break
                except ValueError:
                    pass
        if not d.get('designation'):
            d['designation'] = 'Trainee Staff'
        return super().to_internal_value(d)

    def get_days_remaining(self, obj):
        if obj.training_end_date:
            import datetime
            today = datetime.date.today()
            return (obj.training_end_date - today).days
        return None

    def get_is_alert_due(self, obj):
        if obj.training_end_date:
            import datetime
            today = datetime.date.today()
            alert_date = obj.training_end_date - datetime.timedelta(days=7)
            return today >= alert_date
        return False

    def get_dept_admins(self, obj):
        dept = obj.department
        admins = DepartmentAdmin.objects.all()
        matched = []
        for a in admins:
            if dept and dept in a.departments:
                matched.append({
                    'id': a.id,
                    'username': a.user.username,
                    'whatsapp_number': a.whatsapp_number
                })
        return matched

    def create(self, validated_data):
        emp_code = validated_data.get('employee_code')
        instance, created = TrainingEmployee.objects.update_or_create(
            employee_code=emp_code,
            defaults=validated_data
        )
        if not instance.training_end_date:
            instance.training_end_date = instance.calculate_end_date()
            instance.save(update_fields=['training_end_date'])

        # Sync to Employee master record so department admins see them and can appraise them
        Employee.objects.update_or_create(
            employee_code=instance.employee_code,
            department=instance.department,
            location=instance.location,
            defaults={
                'name': instance.name,
                'branch': instance.branch,
                'designation': instance.designation or 'Trainee Staff',
                'date_of_joining': instance.date_of_joining,
                'assignment_period': '1-Month Training Period',
                'status': instance.status or 'Training'
            }
        )

        # Ensure user login account exists
        if not User.objects.filter(username=instance.employee_code).exists():
            User.objects.create_user(username=instance.employee_code, password=instance.employee_code, is_staff=False)

        return instance

    def update(self, instance, validated_data):
        old_emp_code = instance.employee_code
        instance = super().update(instance, validated_data)

        # Recalculate end date if joining date or period was changed and no explicit end date given
        if 'training_end_date' not in validated_data or not validated_data.get('training_end_date'):
            instance.training_end_date = instance.calculate_end_date()
            instance.save(update_fields=['training_end_date'])

        # Sync changes to Employee master record
        Employee.objects.filter(employee_code=old_emp_code).update(
            employee_code=instance.employee_code,
            name=instance.name,
            department=instance.department,
            location=instance.location,
            branch=instance.branch,
            designation=instance.designation,
            date_of_joining=instance.date_of_joining,
            status=instance.status
        )

        if not User.objects.filter(username=instance.employee_code).exists():
            User.objects.create_user(username=instance.employee_code, password=instance.employee_code, is_staff=False)

        return instance


class TraineeAssessmentSerializer(serializers.ModelSerializer):
    branch = AutoCreateBranchField(slug_field='name', queryset=Branch.objects.all(), required=False, allow_null=True)

    evaluator_name = serializers.SerializerMethodField()

    class Meta:
        model = TraineeAssessment
        fields = '__all__'
        read_only_fields = ('total_score', 'percentage', 'performance_rating', 'created_at', 'updated_at')

    def get_evaluator_name(self, obj):
        if obj.evaluator:
            return obj.evaluator.get_full_name() or obj.evaluator.username
        return ""


class WhatsAppConfigSerializer(serializers.ModelSerializer):
    masked_token = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppConfig
        fields = [
            'id', 'api_token', 'masked_token', 'phone_number_id', 
            'business_account_id', 'template_name', 'template_language', 
            'base_url', 'is_enabled', 'updated_at'
        ]
        extra_kwargs = {
            'api_token': {'write_only': True, 'required': False, 'allow_blank': True}
        }

    def get_masked_token(self, obj):
        if obj.api_token:
            token_str = obj.api_token.strip()
            if len(token_str) > 8:
                return f"{token_str[:4]}...{token_str[-4:]}"
            return "******"
        return ""

    def update(self, instance, validated_data):
        token = validated_data.get('api_token')
        if not token:
            validated_data.pop('api_token', None)
        return super().update(instance, validated_data)




