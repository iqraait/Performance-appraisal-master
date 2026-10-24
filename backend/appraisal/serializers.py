from rest_framework import serializers
from django.db.models import Q
from .models import (
    Employee, Appraisal, Branch, DepartmentAdmin, TrainingEmployee, 
    WhatsAppConfig, EmailConfig, TraineeAssessment,
    IncentivePeriod, DivisionRate, EmployeeLevelConfig, ExperienceLevelConfig, IncentiveRecord,
    DutyLocation
)
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
    period_name = serializers.CharField(source='incentive_period.name', read_only=True)

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

        # Link to active or specified incentive period
        active_p = IncentivePeriod.objects.filter(is_active=True).first()
        inc_p_val = d.get('incentive_period')
        if inc_p_val == '' or inc_p_val is None or str(inc_p_val).lower() == 'null':
            if active_p:
                d['incentive_period'] = active_p.id
                if not d.get('assignment_period'):
                    d['assignment_period'] = active_p.name
        else:
            try:
                selected_p = IncentivePeriod.objects.filter(id=int(inc_p_val)).first()
                if selected_p:
                    d['incentive_period'] = selected_p.id
                    if not d.get('assignment_period'):
                        d['assignment_period'] = selected_p.name
            except (ValueError, TypeError):
                pass

        if not d.get('assignment_period'):
            d['assignment_period'] = active_p.name if active_p else 'Annual'
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
        read_only_fields = ['performance_score', 'marks_obtained', 'final_score', 'rating', 'submitted_by']

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
        
        # Enforce department/location/branch-wise score limits, EXCEPT for MANAGER POOL
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
        total_deduction_val = int(total_deduction or 0)
        marks_obtained = max(0, performance_score - total_deduction_val)
        final_score = round((marks_obtained * 3.0) / 100.0, 2)

        department = data.get('department')
        if not department and instance:
            department = instance.department
        location = data.get('location')
        if not location and instance:
            location = instance.location
        branch = data.get('branch')
        if not branch and instance:
            branch = instance.branch

        # Exempt MANAGER POOL from score limits
        is_manager_pool = (department and ('MANAGER POOL' in department.strip().upper() or 'MANGER POOL' in department.strip().upper())) or \
                          (location and ('MANAGER POOL' in location.strip().upper() or 'MANGER POOL' in location.strip().upper()))

        if not is_manager_pool and (location or department):
            request = self.context.get('request')
            evaluator_user = request.user if request and request.user and request.user.is_authenticated else None

            loc_staff_count = 0
            if location:
                loc_filter = {'location': location, 'status': 'Active'}
                if department:
                    loc_filter['department'] = department
                loc_qs = Employee.objects.filter(**loc_filter)
                if evaluator_user and hasattr(evaluator_user, 'department_admin'):
                    loc_qs = loc_qs.exclude(employee_code=evaluator_user.username)
                if branch:
                    loc_qs = loc_qs.filter(branch=branch)
                loc_staff_count = loc_qs.count()

            use_location = bool(location and loc_staff_count > 0)
            if use_location:
                scope_type = 'location'
                scope_name = location
                emp_filter = {'location': location, 'status': 'Active'}
                app_filter = {'location': location}
                if department:
                    emp_filter['department'] = department
                    app_filter['department'] = department
                emp_qs = Employee.objects.filter(**emp_filter)
                app_qs = Appraisal.objects.filter(**app_filter)
            else:
                scope_type = 'department'
                scope_name = department
                emp_qs = Employee.objects.filter(department=department, status='Active')
                app_qs = Appraisal.objects.filter(department=department)

            if evaluator_user and hasattr(evaluator_user, 'department_admin'):
                emp_qs = emp_qs.exclude(employee_code=evaluator_user.username)
                app_qs = app_qs.exclude(employee_code=evaluator_user.username)

            if branch:
                emp_qs = emp_qs.filter(branch=branch)
                app_qs = app_qs.filter(branch=branch)

            active_p = IncentivePeriod.objects.filter(is_active=True).first()
            assignment_period = data.get('assignment_period')
            if not assignment_period and instance:
                assignment_period = instance.assignment_period
            if not assignment_period and active_p:
                assignment_period = active_p.name
                data['assignment_period'] = active_p.name

            if active_p:
                period_filter = Q(assignment_period__iexact=active_p.name)
                if active_p.months:
                    period_filter |= Q(assignment_period__iexact=active_p.months)
                if assignment_period and assignment_period.strip().lower() not in [active_p.name.strip().lower(), (active_p.months or '').strip().lower()]:
                    period_filter |= Q(assignment_period__iexact=assignment_period)
                app_qs = app_qs.filter(period_filter)
            elif assignment_period:
                app_qs = app_qs.filter(assignment_period__iexact=assignment_period)

            total_active_staff = emp_qs.count()
            if total_active_staff == 0:
                fallback_qs = Employee.objects.filter(location=location) if use_location else Employee.objects.filter(department=department)
                if branch:
                    fallback_qs = fallback_qs.filter(branch=branch)
                total_active_staff = fallback_qs.count()

            # Rule determination:
            # 1. Staff <= 10: strictly max min(5, ceil(N/2)) staff for score 2.70 - 3.00 (90% - 100%), others < 2.70
            # 2. Staff > 10: max 50% (half) of active staff for score 2.25 - 3.00 (75% - 100%), others < 2.25
            if total_active_staff <= 10:
                threshold_score = 2.70
                threshold_marks = 90
                threshold_label = "2.7 - 3.0 (90% - 100%)"
                max_allowed = min(5, (total_active_staff + 1) // 2) if total_active_staff > 0 else 1
                rule_desc = f"teams with ≤ 10 staff (Max allowed: {max_allowed} out of {total_active_staff} active staff for scores 2.70–3.00; remaining must be < 2.70 / < 90%)"
                app_qs_restricted = app_qs.filter(
                    Q(final_score__gte=2.70) | Q(marks_obtained__gte=90) | Q(rating__icontains='Outstanding')
                )
            else:
                threshold_score = 2.25
                threshold_marks = 75
                threshold_label = "2.25 - 3.0 (75% - 100%)"
                max_allowed = max(1, (total_active_staff + 1) // 2)
                rule_desc = f"teams with > 10 staff (Max allowed 50%: {max_allowed} out of {total_active_staff} active staff for scores 2.25–3.00; remaining must be < 2.25 / < 75%)"
                app_qs_restricted = app_qs.filter(
                    Q(final_score__gte=2.25) | Q(marks_obtained__gte=75) | Q(rating__icontains='Outstanding') | Q(rating__icontains='Very Good')
                )

            is_in_restricted_bracket = (final_score >= threshold_score or marks_obtained >= threshold_marks)

            if is_in_restricted_bracket:
                if instance:
                    app_qs_restricted = app_qs_restricted.exclude(id=instance.id)

                existing_count = app_qs_restricted.count()

                if existing_count >= max_allowed:
                    raise serializers.ValidationError(
                        f"Score limit exceeded: You have already assessed {existing_count} staff in {scope_type} '{scope_name}' "
                        f"to {threshold_label}. Under the rules for {rule_desc}, only {max_allowed} staff can receive "
                        f"{threshold_label}. Please assign a score less than {threshold_score} (< {threshold_marks}%)."
                    )
        
        return data


class DepartmentAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = DepartmentAdmin
        fields = ['id', 'user', 'user_detail', 'username', 'password', 'departments', 'locations', 'branches', 'whatsapp_number', 'email']
        read_only_fields = ['user']

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        email = validated_data.get('email', '')
        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
        
        user, created = User.objects.get_or_create(username=username, defaults={'is_staff': True, 'email': email})
        user.set_password(password or 'Iqraa@123')
        if email:
            user.email = email
        user.is_staff = True
        user.save()

        dept_admin, _ = DepartmentAdmin.objects.update_or_create(user=user, defaults=validated_data)
        return dept_admin

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        email = validated_data.get('email')
        if password:
            instance.user.set_password(password)
        if email is not None:
            instance.user.email = email
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
            if dept and any(str(d).strip().lower() == dept.strip().lower() for d in a.departments):
                matched.append({
                    'id': a.id,
                    'username': a.user.username,
                    'email': a.effective_email,
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
                'assignment_period': f"{instance.training_period_months}-Month Training Period",
                'status': instance.status or 'Training'
            }
        )

        # Ensure user login account exists with default password Iqraa@123
        if not User.objects.filter(username=instance.employee_code).exists():
            User.objects.create_user(username=instance.employee_code, password='Iqraa@123', is_staff=False)

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
            assignment_period=f"{instance.training_period_months}-Month Training Period",
            status=instance.status
        )

        if not User.objects.filter(username=instance.employee_code).exists():
            User.objects.create_user(username=instance.employee_code, password='Iqraa@123', is_staff=False)

        return instance


class TraineeAssessmentSerializer(serializers.ModelSerializer):
    branch = AutoCreateBranchField(slug_field='name', queryset=Branch.objects.all(), required=False, allow_null=True)

    evaluator_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TraineeAssessment
        fields = '__all__'
        read_only_fields = ('total_score', 'percentage', 'performance_rating', 'created_at', 'updated_at', 'approved_at')

    def get_evaluator_name(self, obj):
        if obj.evaluator:
            return obj.evaluator.get_full_name() or obj.evaluator.username
        return ""

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
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


class EmailConfigSerializer(serializers.ModelSerializer):
    masked_password = serializers.SerializerMethodField()

    class Meta:
        model = EmailConfig
        fields = [
            'id', 'smtp_host', 'smtp_port', 'use_tls', 'use_ssl',
            'from_email', 'smtp_user', 'smtp_password', 'masked_password',
            'is_enabled', 'updated_at'
        ]
        extra_kwargs = {
            'smtp_password': {'write_only': True, 'required': False, 'allow_blank': True}
        }

    def get_masked_password(self, obj):
        if obj.smtp_password:
            return "••••••••"
        return ""

    def update(self, instance, validated_data):
        pwd = validated_data.get('smtp_password')
        if not pwd:
            validated_data.pop('smtp_password', None)
        return super().update(instance, validated_data)


class IncentivePeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncentivePeriod
        fields = '__all__'


class DivisionRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DivisionRate
        fields = '__all__'


class EmployeeLevelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeLevelConfig
        fields = '__all__'


class ExperienceLevelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperienceLevelConfig
        fields = '__all__'


class IncentiveRecordSerializer(serializers.ModelSerializer):
    period_name = serializers.ReadOnlyField(source='period.name')
    cutoff_date_formatted = serializers.SerializerMethodField()
    processed_by_username = serializers.SerializerMethodField()

    class Meta:
        model = IncentiveRecord
        fields = '__all__'

    def get_cutoff_date_formatted(self, obj):
        return obj.cutoff_date.strftime('%Y-%m-%d') if obj.cutoff_date else ''

    def get_processed_by_username(self, obj):
        return obj.processed_by.username if obj.processed_by else ''


class DutyLocationSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    staff_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DutyLocation
        fields = [
            'id', 'name', 'code', 'department', 'branch', 
            'branch_name', 'description', 'is_active', 
            'staff_count', 'created_at', 'updated_at'
        ]

    def get_staff_count(self, obj):
        from .models import Employee
        return Employee.objects.filter(location__iexact=obj.name, status='Active', is_trashed=False).count()


