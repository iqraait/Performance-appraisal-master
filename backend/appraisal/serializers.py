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
        return data
