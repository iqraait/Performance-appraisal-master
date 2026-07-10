from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
import datetime

from .models import Employee, Appraisal

class AppraisalCalculationTests(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            employee_code="EMP999",
            name="Test User",
            department="Testing",
            designation="Tester",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual"
        )

    def test_appraisal_calculations_outstanding(self):
        """Test score calculation for Outstanding (A) rating >= 90"""
        appraisal = Appraisal.objects.create(
            employee_code=self.employee.employee_code,
            employee_name=self.employee.name,
            department=self.employee.department,
            designation=self.employee.designation,
            date_of_joining=self.employee.date_of_joining,
            assignment_period=self.employee.assignment_period,
            job_competence=19,
            productivity_responsibility=19,
            communication_teamwork=18,
            professionalism_discipline=19,
            initiative_improvement=17,
            total_deduction=2
        )
        # Sum is 19+19+18+19+17 = 92
        # Final is 92 - 2 = 90
        self.assertEqual(appraisal.performance_score, 92)
        self.assertEqual(appraisal.final_score, 90)
        self.assertEqual(appraisal.rating, 'Outstanding (A)')

    def test_appraisal_calculations_very_good(self):
        """Test score calculation for Very Good (B) rating: 75 to 89"""
        appraisal = Appraisal.objects.create(
            employee_code=self.employee.employee_code,
            employee_name=self.employee.name,
            department=self.employee.department,
            designation=self.employee.designation,
            date_of_joining=self.employee.date_of_joining,
            assignment_period=self.employee.assignment_period,
            job_competence=16,
            productivity_responsibility=16,
            communication_teamwork=16,
            professionalism_discipline=15,
            initiative_improvement=15,
            total_deduction=3
        )
        # Sum is 16+16+16+15+15 = 78
        # Final is 78 - 3 = 75
        self.assertEqual(appraisal.performance_score, 78)
        self.assertEqual(appraisal.final_score, 75)
        self.assertEqual(appraisal.rating, 'Very Good (B)')

    def test_appraisal_calculations_unsatisfactory(self):
        """Test score calculation for Unsatisfactory (E) rating: below 50"""
        appraisal = Appraisal.objects.create(
            employee_code=self.employee.employee_code,
            employee_name=self.employee.name,
            department=self.employee.department,
            designation=self.employee.designation,
            date_of_joining=self.employee.date_of_joining,
            assignment_period=self.employee.assignment_period,
            job_competence=10,
            productivity_responsibility=10,
            communication_teamwork=10,
            professionalism_discipline=10,
            initiative_improvement=9,
            total_deduction=10
        )
        # Sum is 10+10+10+10+9 = 49
        # Final is 49 - 10 = 39
        self.assertEqual(appraisal.performance_score, 49)
        self.assertEqual(appraisal.final_score, 39)
        self.assertEqual(appraisal.rating, 'Unsatisfactory (E)')


class AppraisalAPIPermissionTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin_user = User.objects.create_superuser('admin', 'admin@test.com', 'adminpass')
        self.staff_user = User.objects.create_user('EMP100', 'staff@test.com', 'staffpass')
        
        # Create test employee corresponding to staff user
        self.employee = Employee.objects.create(
            employee_code="EMP100",
            name="Staff User",
            department="Engineering",
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual"
        )
        
        # Create another employee
        self.other_employee = Employee.objects.create(
            employee_code="EMP200",
            name="Other User",
            department="HR",
            designation="HR Rep",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual"
        )

        self.list_employees_url = reverse('employee-list')
        self.appraisal_url = reverse('appraisal-list')

    def test_admin_can_manage_employees(self):
        """Admin can list and create employees"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.list_employees_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = {
            "employee_code": "EMP300",
            "name": "New Employee",
            "department": "IT",
            "designation": "Systems Admin",
            "date_of_joining": "2024-06-01",
            "assignment_period": "Annual"
        }
        response = self.client.post(self.list_employees_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_manage_employees(self):
        """Staff users cannot create or edit employees"""
        self.client.force_authenticate(user=self.staff_user)
        data = {
            "employee_code": "EMP300",
            "name": "New Employee",
            "department": "IT",
            "designation": "Systems Admin",
            "date_of_joining": "2024-06-01",
            "assignment_period": "Annual"
        }
        response = self.client.post(self.list_employees_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_submits_appraisal(self):
        """Unauthenticated staff can submit appraisal via public link"""
        data = {
            "employee_code": "EMP100",
            "employee_name": "Staff User",
            "department": "Engineering",
            "designation": "Developer",
            "date_of_joining": "2024-01-01",
            "assignment_period": "Annual",
            "job_competence": 15,
            "productivity_responsibility": 15,
            "communication_teamwork": 15,
            "professionalism_discipline": 15,
            "initiative_improvement": 15,
            "total_deduction": 0
        }
        response = self.client.post(self.appraisal_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_public_cannot_list_all_appraisals(self):
        """Unauthenticated public cannot list all appraisals without passing employee_code filter"""
        response = self.client.get(self.appraisal_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Returns empty list because they didn't specify employee_code query param
        self.assertEqual(len(response.data), 0)

    def test_public_can_list_appraisals_by_code(self):
        """Unauthenticated public can list appraisals for a specific employee code query parameter"""
        # Create an appraisal first
        Appraisal.objects.create(
            employee_code="EMP100",
            employee_name="Staff User",
            department="Engineering",
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            job_competence=15,
            productivity_responsibility=15,
            communication_teamwork=15,
            professionalism_discipline=15,
            initiative_improvement=15,
            total_deduction=0
        )
        response = self.client.get(f"{self.appraisal_url}?employee_code=EMP100")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class AppraisalLocationValidationTests(APITestCase):
    def setUp(self):
        # Create an admin user
        self.admin_user = User.objects.create_superuser('admin', 'admin@test.com', 'adminpass')
        self.appraisal_url = reverse('appraisal-list')

        # Create active employees in "Kozhikode" location (2 staff)
        self.emp1 = Employee.objects.create(
            employee_code="EMP101",
            name="Alice",
            department="Engineering",
            location="Kozhikode",
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )
        self.emp2 = Employee.objects.create(
            employee_code="EMP102",
            name="Bob",
            department="Engineering",
            location="Kozhikode",
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )

        # Create active employee in "Malappuram" location (1 staff)
        self.emp3 = Employee.objects.create(
            employee_code="EMP103",
            name="Charlie",
            department="Marketing",
            location="Malappuram",
            designation="Designer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )

    def test_single_staff_allowed_ab(self):
        """If a location has 1 active staff, they are allowed to receive Grade A/B (limit is max(1, 1//2) = 1)"""
        data = {
            "employee_code": "EMP103",
            "employee_name": "Charlie",
            "department": "Marketing",
            "location": "Malappuram",
            "designation": "Designer",
            "date_of_joining": "2024-01-01",
            "assignment_period": "Annual",
            "job_competence": 20,
            "productivity_responsibility": 20,
            "communication_teamwork": 20,
            "professionalism_discipline": 20,
            "initiative_improvement": 20,
            "total_deduction": 0
        }
        response = self.client.post(self.appraisal_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_two_staff_only_one_allowed_ab(self):
        """If a location has 2 active staff, only 1 is allowed to receive Grade A/B (limit is max(1, 2//2) = 1)"""
        # Submit first one as A (Score 100)
        data1 = {
            "employee_code": "EMP101",
            "employee_name": "Alice",
            "department": "Engineering",
            "location": "Kozhikode",
            "designation": "Developer",
            "date_of_joining": "2024-01-01",
            "assignment_period": "Annual",
            "job_competence": 20,
            "productivity_responsibility": 20,
            "communication_teamwork": 20,
            "professionalism_discipline": 20,
            "initiative_improvement": 20,
            "total_deduction": 0
        }
        response1 = self.client.post(self.appraisal_url, data1)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Submit second one as A (Score 100) - Should fail
        data2 = {
            "employee_code": "EMP102",
            "employee_name": "Bob",
            "department": "Engineering",
            "location": "Kozhikode",
            "designation": "Developer",
            "date_of_joining": "2024-01-01",
            "assignment_period": "Annual",
            "job_competence": 20,
            "productivity_responsibility": 20,
            "communication_teamwork": 20,
            "professionalism_discipline": 20,
            "initiative_improvement": 20,
            "total_deduction": 0
        }
        response2 = self.client.post(self.appraisal_url, data2)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already assessed", response2.data['non_field_errors'][0])

        # Try submitting second one as C (Score 70) - Should succeed
        data2["job_competence"] = 14
        data2["productivity_responsibility"] = 14
        data2["communication_teamwork"] = 14
        data2["professionalism_discipline"] = 14
        data2["initiative_improvement"] = 14
        response3 = self.client.post(self.appraisal_url, data2)
        self.assertEqual(response3.status_code, status.HTTP_201_CREATED)
