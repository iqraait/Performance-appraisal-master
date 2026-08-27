from rest_framework import serializers
from .models import Employee, Appraisal, Branch, DepartmentAdmin
from django.contrib.auth.models import User

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    branch = serializers.SlugRelatedField(slug_field='name', queryset=Branch.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = '__all__'


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
        fields = ['id', 'user', 'user_detail', 'username', 'password', 'departments', 'locations', 'branches']
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



