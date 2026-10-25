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
        self.assertEqual(appraisal.marks_obtained, 90)
        self.assertEqual(appraisal.final_score, 2.7)
        self.assertEqual(appraisal.rating, '2.70 / 3.0')

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
        self.assertEqual(appraisal.marks_obtained, 75)
        self.assertEqual(appraisal.final_score, 2.25)
        self.assertEqual(appraisal.rating, '2.25 / 3.0')

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
        self.assertEqual(appraisal.marks_obtained, 39)
        self.assertEqual(appraisal.final_score, 1.17)
        self.assertEqual(appraisal.rating, '1.17 / 3.0')


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

    def test_six_staff_quota_allows_three(self):
        """If a location has 6 active staff (<= 10), max 3 are allowed to receive scores 2.70 - 3.00"""
        # Create 4 more active staff in Kozhikode (total 6 staff)
        for i in range(3, 7):
            Employee.objects.create(
                employee_code=f"EMP10{i}",
                name=f"Dev{i}",
                department="Engineering",
                location="Kozhikode",
                designation="Developer",
                date_of_joining=datetime.date(2024, 1, 1),
                assignment_period="Annual",
                status="Active"
            )

        # Submit first 3 with score 3.00 (marks 100) -> All 3 should succeed
        for i in range(1, 4):
            data = {
                "employee_code": f"EMP10{i}",
                "employee_name": f"Dev{i}",
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
            res = self.client.post(self.appraisal_url, data)
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Submit 4th one with score 3.00 (marks 100) -> Should fail (max allowed for 6 staff is 3)
        data4 = {
            "employee_code": "EMP104",
            "employee_name": "Dev4",
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
        res4 = self.client.post(self.appraisal_url, data4)
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Score limit exceeded", res4.data['non_field_errors'][0])

        # Submit 4th one with score < 2.70 (e.g. score 2.55, marks 85) -> Should succeed
        data4["job_competence"] = 17
        data4["productivity_responsibility"] = 17
        data4["communication_teamwork"] = 17
        data4["professionalism_discipline"] = 17
        data4["initiative_improvement"] = 17
        res4_ok = self.client.post(self.appraisal_url, data4)
        self.assertEqual(res4_ok.status_code, status.HTTP_201_CREATED)

    def test_twenty_staff_only_ten_allowed_top_score(self):
        """If a department/location has 20 active staff, only 10 are allowed to receive scores 2.25 - 3.00"""
        # Create 20 active staff in 'AccountsDept' / 'Calicut'
        for i in range(1, 21):
            Employee.objects.create(
                employee_code=f"EMP20_{i}",
                name=f"Staff{i}",
                department="AccountsDept",
                location="Calicut",
                designation="Accountant",
                date_of_joining=datetime.date(2024, 1, 1),
                assignment_period="Annual",
                status="Active"
            )

        # Submit first 10 with score 2.40 (marks 80) -> All should succeed
        for i in range(1, 11):
            data = {
                "employee_code": f"EMP20_{i}",
                "employee_name": f"Staff{i}",
                "department": "AccountsDept",
                "location": "Calicut",
                "designation": "Accountant",
                "date_of_joining": "2024-01-01",
                "assignment_period": "Annual",
                "job_competence": 16,
                "productivity_responsibility": 16,
                "communication_teamwork": 16,
                "professionalism_discipline": 16,
                "initiative_improvement": 16,
                "total_deduction": 0
            }
            res = self.client.post(self.appraisal_url, data)
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Submit 11th one with score 2.40 (marks 80, >= 2.25) -> Should fail (max allowed: 10)
        data11 = {
            "employee_code": "EMP20_11",
            "employee_name": "Staff11",
            "department": "AccountsDept",
            "location": "Calicut",
            "designation": "Accountant",
            "date_of_joining": "2024-01-01",
            "assignment_period": "Annual",
            "job_competence": 16,
            "productivity_responsibility": 16,
            "communication_teamwork": 16,
            "professionalism_discipline": 16,
            "initiative_improvement": 16,
            "total_deduction": 0
        }
        res11 = self.client.post(self.appraisal_url, data11)
        self.assertEqual(res11.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Score limit exceeded", res11.data['non_field_errors'][0])

        # Submit 11th one with score < 2.25 (e.g. score 2.10, marks 70) -> Should succeed
        data11["job_competence"] = 14
        data11["productivity_responsibility"] = 14
        data11["communication_teamwork"] = 14
        data11["professionalism_discipline"] = 14
        data11["initiative_improvement"] = 14
        res11_ok = self.client.post(self.appraisal_url, data11)
        self.assertEqual(res11_ok.status_code, status.HTTP_201_CREATED)

    def test_manager_pool_exempt_from_grade_limit(self):
        """Staff in 'Manager pool' location are exempt from the 50% Grade A/B limit"""
        # Create active employee in "Manager pool"
        emp4 = Employee.objects.create(
            employee_code="EMP104",
            name="David",
            department="Engineering",
            location="Manager pool",
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )
        emp5 = Employee.objects.create(
            employee_code="EMP105",
            name="Emma",
            department="Engineering",
            location="Manager pool",
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )
        
        # Submit first one as A (Score 100)
        data1 = {
            "employee_code": "EMP104",
            "employee_name": "David",
            "department": "Engineering",
            "location": "Manager pool",
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

        # Submit second one as A (Score 100) - Should also succeed because it's in Manager pool
        data2 = {
            "employee_code": "EMP105",
            "employee_name": "Emma",
            "department": "Engineering",
            "location": "Manager pool",
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
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)


class EmployeeAutoFetchTests(APITestCase):
    def setUp(self):
        from appraisal.models import DepartmentAdmin, Branch
        self.branch = Branch.objects.create(name="Calicut")
        # Create department admin user
        self.dept_admin_user = User.objects.create_user('admin101', 'admin101@test.com', 'adminpass')
        self.dept_admin = DepartmentAdmin.objects.create(
            user=self.dept_admin_user,
            departments=["Engineering"],
            locations=["Manager pool"],
            branches=["Calicut"]
        )

        # Create multi-location employee (same code, different locations)
        self.emp_disallowed = Employee.objects.create(
            employee_code="EMP001",
            name="Multi Location Staff",
            department="Engineering",
            location="Disallowed Clinic",
            branch=self.branch,
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )
        self.emp_allowed = Employee.objects.create(
            employee_code="EMP001",
            name="Multi Location Staff",
            department="Engineering",
            location="Manager pool",
            branch=self.branch,
            designation="Developer",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )

        self.fetch_url = reverse('employee-fetch')

    def test_dept_admin_can_fetch_multi_location_employee_with_at_least_one_allowed_location(self):
        """
        If a department admin queries an employee with multiple locations,
        and at least one of those locations is allowed for the admin,
        the fetch endpoint should succeed and return the allowed employee record.
        """
        self.client.force_authenticate(user=self.dept_admin_user)
        response = self.client.get(f"{self.fetch_url}?code=EMP001")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['employee_code'], "EMP001")
        # Should return the allowed record's location
        self.assertEqual(response.data['location'], "Manager pool")


class TraineeAssessmentApprovalFlowTests(APITestCase):
    def setUp(self):
        from appraisal.models import DepartmentAdmin, TrainingEmployee, TraineeAssessment
        
        # Superuser
        self.superuser = User.objects.create_superuser('superadmin', 'super@test.com', 'pass123')
        
        # Dept Admin for Nursing
        self.nursing_admin_user = User.objects.create_user('nursing_admin', 'nursing@test.com', 'pass123')
        self.dept_admin = DepartmentAdmin.objects.create(
            user=self.nursing_admin_user,
            departments=["Nursing"]
        )

        # Dept Admin for Pharmacy
        self.pharmacy_admin_user = User.objects.create_user('pharma_admin', 'pharma@test.com', 'pass123')
        self.pharma_admin = DepartmentAdmin.objects.create(
            user=self.pharmacy_admin_user,
            departments=["Pharmacy"]
        )

        # Trainees
        self.trainee_nursing = TrainingEmployee.objects.create(
            employee_code="TRN001",
            name="Alice Nurse",
            department="Nursing",
            designation="Staff Nurse Trainee",
            date_of_joining=datetime.date(2026, 1, 1),
            training_period_months=1,
            status="Training"
        )

        self.trainee_pharma = TrainingEmployee.objects.create(
            employee_code="TRN002",
            name="Bob Pharmacist",
            department="Pharmacy",
            designation="Pharmacist Trainee",
            date_of_joining=datetime.date(2026, 1, 1),
            training_period_months=1,
            status="Training"
        )

        self.assessments_url = reverse('trainee-assessment-list')

    def test_submit_trainee_assessment_defaults_to_pending(self):
        self.client.force_authenticate(user=self.nursing_admin_user)
        payload = {
            "trainee": self.trainee_nursing.id,
            "trainee_code": self.trainee_nursing.employee_code,
            "name": self.trainee_nursing.name,
            "department": self.trainee_nursing.department,
            "designation": self.trainee_nursing.designation,
            "job_knowledge": 3,
            "quality_of_work": 2,
            "productivity": 3,
            "attendance": 2,
            "initiative": 2,
            "communication": 3,
            "teamwork": 3,
            "adaptability": 2,
            "professionalism": 3,
            "self_improvement": 2
        }
        response = self.client.post(self.assessments_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'Pending')
        self.assertEqual(response.data['total_score'], 25)

    def test_department_scoping_and_approval(self):
        from appraisal.models import TraineeAssessment
        # Create pending assessment for Nursing and Pharmacy
        assess_nursing = TraineeAssessment.objects.create(
            trainee=self.trainee_nursing,
            trainee_code=self.trainee_nursing.employee_code,
            name=self.trainee_nursing.name,
            department=self.trainee_nursing.department,
            designation=self.trainee_nursing.designation,
            job_knowledge=3,
            status='Pending'
        )
        assess_pharma = TraineeAssessment.objects.create(
            trainee=self.trainee_pharma,
            trainee_code=self.trainee_pharma.employee_code,
            name=self.trainee_pharma.name,
            department=self.trainee_pharma.department,
            designation=self.trainee_pharma.designation,
            job_knowledge=2,
            status='Pending'
        )

        # 1. Nursing Admin should ONLY see Nursing assessment
        self.client.force_authenticate(user=self.nursing_admin_user)
        res = self.client.get(self.assessments_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        returned_codes = [item['trainee_code'] for item in res.data]
        self.assertIn("TRN001", returned_codes)
        self.assertNotIn("TRN002", returned_codes)

        # 2. Nursing Admin CAN approve Nursing assessment
        approve_url = reverse('trainee-assessment-approve', kwargs={'pk': assess_nursing.pk})
        res_approve = self.client.post(approve_url, {'remarks': 'Approved by Nursing Head'})
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        assess_nursing.refresh_from_db()
        self.assertEqual(assess_nursing.status, 'Approved')
        self.assertEqual(assess_nursing.approved_by, self.nursing_admin_user)
        self.assertIsNotNone(assess_nursing.approved_at)
        self.trainee_nursing.refresh_from_db()
        self.assertEqual(self.trainee_nursing.status, 'Completed')

        # 3. Nursing Admin CANNOT approve Pharmacy assessment (Not Found in their scoped queryset / Forbidden)
        pharma_approve_url = reverse('trainee-assessment-approve', kwargs={'pk': assess_pharma.pk})
        res_forbidden = self.client.post(pharma_approve_url, {})
        self.assertIn(res_forbidden.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # 4. Superuser can see BOTH and approve Pharmacy
        self.client.force_authenticate(user=self.superuser)
        res_all = self.client.get(self.assessments_url)
        all_codes = [item['trainee_code'] for item in res_all.data]
        self.assertIn("TRN001", all_codes)
        self.assertIn("TRN002", all_codes)

        res_super_approve = self.client.post(pharma_approve_url, {'remarks': 'Approved by Super Admin'})
        self.assertEqual(res_super_approve.status_code, status.HTTP_200_OK)
        assess_pharma.refresh_from_db()
        self.assertEqual(assess_pharma.status, 'Approved')
        self.assertEqual(assess_pharma.approved_by, self.superuser)


class EmailConfigAndBulkEmailTests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser('admin_email', 'admin_email@iqraa.com', 'pass123')
        self.client.force_authenticate(user=self.superuser)
        from appraisal.models import DepartmentAdmin, TrainingEmployee, EmailConfig
        self.dept_user = User.objects.create_user('cardio_admin', 'cardio.head@iqraahospital.in', 'pass123')
        self.dept_admin = DepartmentAdmin.objects.create(
            user=self.dept_user,
            departments=["Cardiology"],
            email="cardio.head@iqraahospital.in"
        )
        self.t1 = TrainingEmployee.objects.create(
            employee_code="TRN101",
            name="Alice Cardiology",
            department="Cardiology",
            designation="Junior Trainee",
            email="alice@iqraahospital.in",
            date_of_joining=datetime.date(2026, 9, 1),
            training_end_date=datetime.date(2026, 10, 1),
            status="Training"
        )
        self.t2 = TrainingEmployee.objects.create(
            employee_code="TRN102",
            name="Bob Cardiology",
            department="Cardiology",
            designation="Junior Trainee",
            email="bob@iqraahospital.in",
            date_of_joining=datetime.date(2026, 9, 1),
            training_end_date=datetime.date(2026, 10, 1),
            status="Training"
        )

    def test_email_config_api_get_and_update(self):
        # 1. GET email config
        res = self.client.get('/api/email/config/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['from_email'], 'HR@IQRAAHOSPITAL.IN')

        # 2. Update email config
        res_update = self.client.post('/api/email/config/', {
            'smtp_host': 'smtp.office365.com',
            'smtp_port': 587,
            'smtp_user': 'HR@IQRAAHOSPITAL.IN',
            'smtp_password': 'SecretPassword123!',
            'use_tls': True,
            'is_enabled': True
        })
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertIn('masked_password', res_update.data)
        self.assertEqual(res_update.data['masked_password'], '••••••••')

    def test_email_config_test_action(self):
        # Test action to recipient
        res = self.client.post('/api/email/config/', {
            'action': 'test',
            'to_email': 'test.recipient@iqraahospital.in'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

    def test_bulk_email_sending(self):
        # Send bulk emails to t1 and t2
        url = '/api/training-employees/send-bulk-email/'
        res = self.client.post(url, {
            'employee_ids': [self.t1.id, self.t2.id]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total'], 2)
        self.assertEqual(res.data['sent'], 2)
        self.assertEqual(res.data['failed'], 0)

        self.t1.refresh_from_db()
        self.t2.refresh_from_db()
        self.assertTrue(self.t1.email_notification_sent)
        self.assertTrue(self.t2.email_notification_sent)
        self.assertEqual(self.t1.email_notification_status, 'Sent')
        self.assertEqual(self.t2.email_notification_status, 'Sent')

    def test_department_wise_email_consolidation(self):
        from django.core import mail
        mail.outbox = []

        url = '/api/training-employees/send-bulk-email/'
        res = self.client.post(url, {
            'employee_ids': [self.t1.id, self.t2.id]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Department head should have received ONLY 1 consolidated email!
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertIn('cardio.head@iqraahospital.in', sent_email.to)
        self.assertIn('Cardiology', sent_email.subject)
        self.assertIn('2 Staff Pending Assessment', sent_email.subject)
        # Check that both trainees appear in the email body
        self.assertIn(self.t1.employee_code, sent_email.body)
        self.assertIn(self.t1.name, sent_email.body)
        self.assertIn(self.t2.employee_code, sent_email.body)
        self.assertIn(self.t2.name, sent_email.body)

        # Check response metadata
        self.assertIn('department_results', res.data)
        dept_res = res.data['department_results'][0]
        self.assertEqual(dept_res['department'], 'Cardiology')
        self.assertEqual(dept_res['trainees_count'], 2)
        self.assertEqual(dept_res['status'], 'Sent')

    def test_department_wise_email_missing_admin(self):
        from appraisal.models import TrainingEmployee
        t_unassigned = TrainingEmployee.objects.create(
            employee_code="TRN999",
            name="Orphan Trainee",
            department="NonExistentDept",
            designation="Trainee",
            email="orphan@iqraahospital.in",
            date_of_joining=datetime.date(2026, 9, 1),
            training_end_date=datetime.date(2026, 10, 1),
            status="Training"
        )
        url = '/api/training-employees/send-bulk-email/'
        res = self.client.post(url, {
            'employee_ids': [t_unassigned.id]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_207_MULTI_STATUS)
        self.assertEqual(res.data['failed'], 1)
        self.assertEqual(res.data['sent'], 0)
        t_unassigned.refresh_from_db()
        self.assertEqual(t_unassigned.email_notification_status, 'Failed')
        self.assertIn('No Department Admin email found', t_unassigned.email_error_message)


class EmployeeTrashAndRestoreTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('test_admin_trash', 'admin@test.com', 'adminpass')
        self.client.force_authenticate(user=self.admin)

        self.emp1 = Employee.objects.create(
            employee_code="EMP_T1",
            name="Employee One",
            department="Pharmacy",
            location="Main Pharmacy",
            designation="Pharmacist",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )
        self.emp2 = Employee.objects.create(
            employee_code="EMP_T2",
            name="Employee Two",
            department="Pharmacy",
            location="Main Pharmacy",
            designation="Pharmacist",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period="Annual",
            status="Active"
        )

    def test_soft_delete_moves_to_trash(self):
        """Deleting an employee moves them to trash (preserved in DB, hidden from active list)"""
        url = f'/api/employees/{self.emp1.id}/'
        res = self.client.delete(url)
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

        self.emp1.refresh_from_db()
        self.assertTrue(self.emp1.is_trashed)
        self.assertEqual(self.emp1.status, 'Trashed')

        # Active list should NOT include emp1
        active_res = self.client.get('/api/employees/')
        self.assertEqual(active_res.status_code, status.HTTP_200_OK)
        active_codes = [e['employee_code'] for e in active_res.data]
        self.assertNotIn("EMP_T1", active_codes)
        self.assertIn("EMP_T2", active_codes)

        # Trashed list SHOULD include emp1
        trashed_res = self.client.get('/api/employees/?trashed=true')
        self.assertEqual(trashed_res.status_code, status.HTTP_200_OK)
        trashed_codes = [e['employee_code'] for e in trashed_res.data]
        self.assertIn("EMP_T1", trashed_codes)

    def test_restore_from_trash(self):
        """Restoring a trashed employee puts them back in the active directory"""
        self.emp1.is_trashed = True
        self.emp1.status = 'Trashed'
        self.emp1.save()

        res = self.client.post(f'/api/employees/{self.emp1.id}/restore/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.emp1.refresh_from_db()
        self.assertFalse(self.emp1.is_trashed)
        self.assertEqual(self.emp1.status, 'Active')

        # Active list should now include emp1
        active_res = self.client.get('/api/employees/')
        active_codes = [e['employee_code'] for e in active_res.data]
        self.assertIn("EMP_T1", active_codes)

    def test_bulk_trash(self):
        """Bulk trash moves all or selected employees to trash"""
        res = self.client.post('/api/employees/bulk-trash/', {
            'employee_ids': [self.emp1.id, self.emp2.id]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 2)

        self.emp1.refresh_from_db()
        self.emp2.refresh_from_db()
        self.assertTrue(self.emp1.is_trashed)
        self.assertTrue(self.emp2.is_trashed)


class IncentivePeriodCascadeEmployeeDeletionTests(APITestCase):
    def setUp(self):
        from appraisal.models import IncentivePeriod, DepartmentAdmin
        self.admin = User.objects.create_superuser('test_admin_cascade', 'admin2@test.com', 'adminpass')
        self.client.force_authenticate(user=self.admin)

        # Create DepartmentAdmin with tagged departments & locations (MUST NOT BE DELETED)
        self.dept_user = User.objects.create_user('pharm_hod_cascade', 'pharm.hod@iqraahospital.in', 'pass123', is_staff=True)
        self.dept_admin = DepartmentAdmin.objects.create(
            user=self.dept_user,
            email="pharm.hod@iqraahospital.in",
            departments=["Pharmacy", "Stores"],
            locations=["Main Pharmacy", "OPD Counter"],
            branches=["Calicut"]
        )

        # Create IncentivePeriod
        self.period = IncentivePeriod.objects.create(
            name="Period_Q1_2026",
            months="Jan, Feb, Mar",
            cutoff_date=datetime.date(2026, 3, 31),
            is_active=True
        )

        # Create Employees for this period
        self.p_emp1 = Employee.objects.create(
            employee_code="P_EMP1",
            name="Period Staff 1",
            department="Pharmacy",
            location="Main Pharmacy",
            designation="Pharmacist",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period=self.period.name,
            incentive_period=self.period,
            status="Active"
        )
        self.p_emp2 = Employee.objects.create(
            employee_code="P_EMP2",
            name="Period Staff 2",
            department="Pharmacy",
            location="Main Pharmacy",
            designation="Pharmacist",
            date_of_joining=datetime.date(2024, 1, 1),
            assignment_period=self.period.name,
            incentive_period=self.period,
            status="Active"
        )

    def test_deleting_incentive_period_deletes_its_employees_and_preserves_dept_admin(self):
        """Deleting an IncentivePeriod deletes all employees belonging to it, while preserving DepartmentAdmin"""
        from appraisal.models import DepartmentAdmin

        period_id = self.period.id
        del_res = self.client.delete(f'/api/incentives/periods/{period_id}/')
        self.assertIn(del_res.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

        # Employees tied to this period should be deleted from Employee Master
        self.assertFalse(Employee.objects.filter(employee_code="P_EMP1").exists())
        self.assertFalse(Employee.objects.filter(employee_code="P_EMP2").exists())

        # DepartmentAdmin MUST REMAIN 100% INTACT AND PRESERVED!
        self.assertTrue(DepartmentAdmin.objects.filter(id=self.dept_admin.id).exists())
        da = DepartmentAdmin.objects.get(id=self.dept_admin.id)
        self.assertEqual(da.departments, ["Pharmacy", "Stores"])
        self.assertEqual(da.locations, ["Main Pharmacy", "OPD Counter"])
        self.assertEqual(da.branches, ["Calicut"])
        self.assertEqual(da.user.username, "pharm_hod_cascade")


class SpreadsheetMultiFormatImportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_xls_test', 'adminxls@test.com', 'adminpass')
        self.client.force_authenticate(user=self.admin)

    def test_import_xlsx_file(self):
        """Standard .xlsx file imports successfully"""
        import openpyxl
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['Employee Code', 'Employee Name', 'Department', 'Location', 'Designation'])
        ws.append(['XLSX_01', 'John Doe', 'Cardiology', 'OPD', 'Nurse'])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        uploaded = SimpleUploadedFile('staff_roster.xlsx', buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res = self.client.post('/api/employees/import-excel/', {'file': uploaded}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(Employee.objects.filter(employee_code='XLSX_01').exists())
        emp = Employee.objects.get(employee_code='XLSX_01')
        self.assertEqual(emp.name, 'John Doe')
        self.assertEqual(emp.department, 'Cardiology')

    def test_import_xls_html_table_format(self):
        """File with .xls extension containing HTML table (common hospital export) imports successfully"""
        from django.core.files.uploadedfile import SimpleUploadedFile

        html_content = (
            "<html><body><table>"
            "<tr><th>Employee Code</th><th>Employee Name</th><th>Department</th><th>Duty Location</th><th>Designation</th></tr>"
            "<tr><td>XLS_02</td><td>Jane Smith</td><td>Neurology</td><td>ICU</td><td>Technician</td></tr>"
            "</table></body></html>"
        ).encode('utf-8')

        uploaded = SimpleUploadedFile('IQRAA Staff details (1).xls', html_content, content_type='application/vnd.ms-excel')
        res = self.client.post('/api/employees/import-excel/', {'file': uploaded}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(Employee.objects.filter(employee_code='XLS_02').exists())
        emp = Employee.objects.get(employee_code='XLS_02')
        self.assertEqual(emp.name, 'Jane Smith')
        self.assertEqual(emp.department, 'Neurology')


class TeamQuotaRulesTests(APITestCase):
    def setUp(self):
        from appraisal.models import IncentivePeriod, Employee, Appraisal
        self.admin = User.objects.create_superuser('admin_quota_test', 'quota@test.com', 'adminpass')
        self.client.force_authenticate(user=self.admin)

        self.period = IncentivePeriod.objects.create(
            name="Q3_2026",
            months="July, August, September",
            cutoff_date=datetime.date(2026, 9, 30),
            is_active=True
        )

        # Create 5 staff in location "ENDOSCOPY SUITE"
        self.staff = []
        for i in range(1, 6):
            emp = Employee.objects.create(
                employee_code=f"ENDO_00{i}",
                name=f"Endo Staff {i}",
                department="Gastroenterology",
                location="ENDOSCOPY SUITE",
                designation="Nurse",
                date_of_joining=datetime.date(2024, 1, 1),
                assignment_period=self.period.name,
                incentive_period=self.period,
                status="Active"
            )
            self.staff.append(emp)

    def test_five_staff_allows_exactly_three_scores_gte_2_70(self):
        """When location staff count is 5, exactly 3 can receive 90%-100% (>= 2.70); 4th attempt is rejected, < 2.70 accepted"""
        def make_payload(emp, score_domain, deduction=0):
            return {
                'employee_code': emp.employee_code,
                'employee_name': emp.name,
                'department': emp.department,
                'location': emp.location,
                'designation': emp.designation,
                'date_of_joining': "2024-01-01",
                'assignment_period': self.period.name,
                'job_competence': score_domain,
                'productivity_responsibility': score_domain,
                'communication_teamwork': score_domain,
                'professionalism_discipline': score_domain,
                'initiative_improvement': score_domain,
                'total_deduction': deduction
            }

        # Staff 1: score domain 20 each -> 100 marks / 3.00 score (>= 2.70) -> Should succeed (1/3)
        res1 = self.client.post('/api/appraisals/', make_payload(self.staff[0], 20))
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Staff 2: score domain 19 each -> 95 marks / 2.85 score (>= 2.70) -> Should succeed (2/3)
        res2 = self.client.post('/api/appraisals/', make_payload(self.staff[1], 19))
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Staff 3: score domain 18 each -> 90 marks / 2.70 score (>= 2.70) -> Should succeed (3/3)
        res3 = self.client.post('/api/appraisals/', make_payload(self.staff[2], 18))
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)

        # Staff 4: attempting score domain 18 each (>= 2.70) -> MUST FAIL (limit of 3 reached!)
        res4_fail = self.client.post('/api/appraisals/', make_payload(self.staff[3], 18))
        self.assertEqual(res4_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Score limit exceeded", str(res4_fail.data))
        self.assertIn("only 3 staff can receive 2.7 - 3.0", str(res4_fail.data))

        # Staff 4: score domain 16 each -> 80 marks / 2.40 score (< 2.70) -> MUST SUCCEED!
        res4_ok = self.client.post('/api/appraisals/', make_payload(self.staff[3], 16))
        self.assertEqual(res4_ok.status_code, status.HTTP_201_CREATED)

        # Staff 5: score domain 15 each -> 75 marks / 2.25 score (< 2.70) -> MUST SUCCEED!
        res5_ok = self.client.post('/api/appraisals/', make_payload(self.staff[4], 15))
        self.assertEqual(res5_ok.status_code, status.HTTP_201_CREATED)

    def test_fetch_employee_by_code_returns_correct_max_allowed_for_small_team(self):
        """fetch_employee_by_code endpoint returns max_allowed=3 for location with 5 staff"""
        res = self.client.get(f'/api/employees/fetch/?code={self.staff[0].employee_code}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['scope_total_active'], 5)
        self.assertEqual(res.data['max_allowed'], 3)
        self.assertEqual(res.data['rule_type'], 'lte_10')
        self.assertEqual(res.data['threshold_score'], 2.70)





