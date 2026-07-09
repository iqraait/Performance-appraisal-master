from rest_framework import serializers
from .models import Employee, Appraisal
from django.contrib.auth.models import User

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser']


class AppraisalSerializer(serializers.ModelSerializer):
    submitted_by_detail = UserSerializer(source='submitted_by', read_only=True)

    class Meta:
        model = Appraisal
        fields = '__all__'
        read_only_fields = ['performance_score', 'final_score', 'rating', 'submitted_by']

    def validate(self, data):
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
        
        # Enforce department-wise Grade A/B limit (at most 50% of active staff)
        instance = self.instance
        
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
            
            if department:
                total_active_staff = Employee.objects.filter(department=department, status='Active').count()
                if total_active_staff == 0:
                    total_active_staff = Employee.objects.filter(department=department).count()
                
                max_allowed_ab = max(1, total_active_staff // 2)
                
                existing_ab_query = Appraisal.objects.filter(
                    department=department,
                    rating__in=['Outstanding (A)', 'Very Good (B)']
                )
                if instance:
                    existing_ab_query = existing_ab_query.exclude(id=instance.id)
                
                existing_ab_count = existing_ab_query.count()
                
                if existing_ab_count >= max_allowed_ab:
                    raise serializers.ValidationError(
                        f"You have already assessed {existing_ab_count} of your staff in '{department}' "
                        f"to A or B (Max allowed: {max_allowed_ab} out of {total_active_staff} active staff). "
                        "Please assign to another grade."
                    )
        
        return data
