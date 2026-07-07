import os
import django
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'appraisal_system.settings')
django.setup()

from django.contrib.auth.models import User
from appraisal.models import Employee, Appraisal

def seed_db():
    print("Seeding database...")
    
    # 1. Create Superuser
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@appraisal.com', 'adminpass')
        print("Created superuser 'admin' with password 'adminpass'")
    else:
        print("Superuser 'admin' already exists")

    # 2. Mock Employees
    employees_data = [
        {
            'employee_code': 'EMP001',
            'name': 'John Doe',
            'department': 'Engineering',
            'designation': 'Software Engineer',
            'date_of_joining': datetime.date(2024, 1, 15),
            'assignment_period': 'Annual',
            'status': 'Active'
        },
        {
            'employee_code': 'EMP002',
            'name': 'Jane Smith',
            'department': 'Human Resources',
            'designation': 'HR Specialist',
            'date_of_joining': datetime.date(2024, 3, 10),
            'assignment_period': 'Annual',
            'status': 'Active'
        },
        {
            'employee_code': 'EMP003',
            'name': 'David Johnson',
            'department': 'Marketing',
            'designation': 'Marketing Lead',
            'date_of_joining': datetime.date(2023, 8, 1),
            'assignment_period': 'Semi-Annual',
            'status': 'Active'
        },
        {
            'employee_code': 'EMP004',
            'name': 'Emily Brown',
            'department': 'Finance',
            'designation': 'Financial Analyst',
            'date_of_joining': datetime.date(2024, 5, 20),
            'assignment_period': 'Annual',
            'status': 'Active'
        },
        {
            'employee_code': 'EMP005',
            'name': 'Michael Green',
            'department': 'Engineering',
            'designation': 'QA Engineer',
            'date_of_joining': datetime.date(2024, 2, 1),
            'assignment_period': 'Annual',
            'status': 'Inactive'
        }
    ]

    employees = {}
    for emp in employees_data:
        obj, created = Employee.objects.get_or_create(
            employee_code=emp['employee_code'],
            defaults={
                'name': emp['name'],
                'department': emp['department'],
                'designation': emp['designation'],
                'date_of_joining': emp['date_of_joining'],
                'assignment_period': emp['assignment_period'],
                'status': emp['status']
            }
        )
        employees[emp['employee_code']] = obj
        if created:
            print(f"Created employee: {obj.employee_code} - {obj.name}")
            # Create standard staff user
            User.objects.create_user(username=obj.employee_code, password=obj.employee_code, is_staff=False)
            print(f"  Created login: Username: {obj.employee_code} / Password: {obj.employee_code}")
        else:
            print(f"Employee {obj.employee_code} already exists")

    # 3. Mock Appraisals
    admin_user = User.objects.get(username='admin')
    
    appraisals_data = [
        {
            'employee': employees['EMP001'],
            'job_competence': 18,
            'productivity_responsibility': 17,
            'communication_teamwork': 19,
            'professionalism_discipline': 16,
            'initiative_improvement': 17,
            'total_deduction': 0
        },
        {
            'employee': employees['EMP002'],
            'job_competence': 19,
            'productivity_responsibility': 20,
            'communication_teamwork': 19,
            'professionalism_discipline': 19,
            'initiative_improvement': 18,
            'total_deduction': 2
        },
        {
            'employee': employees['EMP003'],
            'job_competence': 12,
            'productivity_responsibility': 14,
            'communication_teamwork': 13,
            'professionalism_discipline': 15,
            'initiative_improvement': 11,
            'total_deduction': 10
        },
        {
            'employee': employees['EMP004'],
            'job_competence': 15,
            'productivity_responsibility': 16,
            'communication_teamwork': 15,
            'professionalism_discipline': 14,
            'initiative_improvement': 15,
            'total_deduction': 0
        }
    ]

    for app in appraisals_data:
        emp = app['employee']
        if not Appraisal.objects.filter(employee_code=emp.employee_code).exists():
            obj = Appraisal(
                employee_code=emp.employee_code,
                employee_name=emp.name,
                department=emp.department,
                designation=emp.designation,
                date_of_joining=emp.date_of_joining,
                assignment_period=emp.assignment_period,
                job_competence=app['job_competence'],
                productivity_responsibility=app['productivity_responsibility'],
                communication_teamwork=app['communication_teamwork'],
                professionalism_discipline=app['professionalism_discipline'],
                initiative_improvement=app['initiative_improvement'],
                total_deduction=app['total_deduction'],
                submitted_by=admin_user
            )
            # Calculations will run on save()
            obj.save()
            print(f"Created appraisal for {obj.employee_code}: score={obj.final_score}, rating={obj.rating}")
        else:
            print(f"Appraisal for {emp.employee_code} already exists")

    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
