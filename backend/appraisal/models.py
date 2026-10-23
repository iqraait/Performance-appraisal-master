from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User

class Branch(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Branches"

    def __str__(self):
        return self.name


class DutyLocation(models.Model):
    name = models.CharField(max_length=150, unique=True, help_text="Duty Location name (e.g. GENERAL WARD MALE, DIALYSIS UNIT)")
    code = models.CharField(max_length=50, blank=True, default='', help_text="Short code (e.g. GWM, DU, ICU)")
    department = models.CharField(max_length=100, blank=True, default='', help_text="Associated Department (e.g. NURSING)")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='duty_locations')
    description = models.TextField(blank=True, default='', help_text="Optional description or ward details")
    is_active = models.BooleanField(default=True, help_text="Active status")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Duty Location"
        verbose_name_plural = "Duty Locations"

    def __str__(self):
        dept_str = f" ({self.department})" if self.department else ""
        return f"{self.name}{dept_str}"



class Employee(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Trashed', 'Trashed'),
    ]

    employee_code = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    organization = models.CharField(max_length=150, blank=True, default='')
    division = models.CharField(max_length=150, blank=True, default='')
    category = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=255, help_text="Hospital Department(s)")
    location = models.CharField(max_length=255, blank=True, default='', help_text="Duty location(s)")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    designation = models.CharField(max_length=100)
    level = models.CharField(max_length=50, blank=True, default='', help_text="Employee Level for Incentive Level 1, e.g. MAN, SUP, LOW, MID")
    date_of_joining = models.DateField()
    assignment_period = models.CharField(max_length=100)
    incentive_period = models.ForeignKey('IncentivePeriod', on_delete=models.CASCADE, null=True, blank=True, related_name='employees', help_text="Associated Incentive Period for calculation and reporting")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Active')
    is_trashed = models.BooleanField(default=False, db_index=True, help_text="True if employee is moved to trash")
    trashed_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when employee was trashed")

    class Meta:
        unique_together = ('employee_code', 'department', 'location')

    def __str__(self):
        return f"{self.employee_code} - {self.name} ({self.department} / {self.location})"


class Appraisal(models.Model):
    RATING_CHOICES = [
        ('Outstanding (A)', 'Outstanding (A)'),
        ('Very Good (B)', 'Very Good (B)'),
        ('Good (C)', 'Good (C)'),
        ('Needs Improvement (D)', 'Needs Improvement (D)'),
        ('Unsatisfactory (E)', 'Unsatisfactory (E)'),
    ]

    # Historical employee metadata stored inside the appraisal for editability and record-keeping
    employee_code = models.CharField(max_length=50)
    employee_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True, default='')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='appraisals')
    designation = models.CharField(max_length=100)
    date_of_joining = models.DateField()
    assignment_period = models.CharField(max_length=100)

    # Performance Domains (0-20 each)
    job_competence = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    productivity_responsibility = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    communication_teamwork = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    professionalism_discipline = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])
    initiative_improvement = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)])

    # Calculations
    performance_score = models.IntegerField(default=0)
    total_deduction = models.IntegerField(default=0)
    marks_obtained = models.IntegerField(default=0)
    final_score = models.FloatField(default=0.0) # Score out of 3.0 (e.g. 2.97)
    rating = models.CharField(max_length=50, blank=True)

    # Submission metadata
    submitted_date = models.DateTimeField(auto_now_add=True)
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('Draft', 'Draft'), ('Approved', 'Approved')], default='Draft')

    def calculate_metrics(self):
        # Calculate performance total (max 100)
        self.performance_score = (
            int(self.job_competence or 0) +
            int(self.productivity_responsibility or 0) +
            int(self.communication_teamwork or 0) +
            int(self.professionalism_discipline or 0) +
            int(self.initiative_improvement or 0)
        )
        
        # Calculate marks obtained after deduction
        self.marks_obtained = max(0, self.performance_score - int(self.total_deduction or 0))
        
        # Score basis: (marks * 3) / 100 (e.g. 100 -> 3.00, 99 -> 2.97)
        self.final_score = round((self.marks_obtained * 3.0) / 100.0, 2)
        self.rating = f"{self.final_score:.2f} / 3.0"

    def save(self, *args, **kwargs):
        self.calculate_metrics()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Appraisal for {self.employee_code} - {self.employee_name} ({self.final_score}/3.0)"


class DepartmentAdmin(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='department_admin')
    email = models.EmailField(blank=True, default='', help_text="Department / Admin Email ID for notifications")
    departments = models.JSONField(default=list, help_text="List of tagged departments")
    locations = models.JSONField(default=list, blank=True, help_text="List of tagged duty locations (optional)")
    branches = models.JSONField(default=list, blank=True, help_text="List of tagged branches (optional)")
    whatsapp_number = models.CharField(max_length=25, blank=True, default='', help_text="WhatsApp phone number with country code, e.g. 919876543210")

    @property
    def effective_email(self):
        return (self.email or (self.user.email if self.user else '')).strip()

    def __str__(self):
        depts = ', '.join(self.departments) if self.departments else 'None'
        locs = ', '.join(self.locations) if self.locations else 'All'
        brs = ', '.join(self.branches) if self.branches else 'All'
        em = f" | Email: {self.effective_email}" if self.effective_email else ""
        wa = f" | WA: {self.whatsapp_number}" if self.whatsapp_number else ""
        return f"{self.user.username} - Depts: {depts}{em} | Locs: {locs} | Branches: {brs}{wa}"


class TrainingEmployee(models.Model):
    STATUS_CHOICES = [
        ('Training', 'In Training'),
        ('Assessment Due', 'Assessment Due (7 Days)'),
        ('Completed', 'Training Completed'),
        ('Discontinued', 'Discontinued'),
    ]

    employee_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True, default='')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='training_employees')
    designation = models.CharField(max_length=100)
    email = models.EmailField(blank=True, default='', help_text="Candidate / Trainee Email ID")
    department_email = models.EmailField(blank=True, default='', help_text="Department Email ID")
    date_of_joining = models.DateField()
    training_period_months = models.IntegerField(default=1)
    training_end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Training')

    # Email Notification Tracking
    email_notification_sent = models.BooleanField(default=False)
    email_notification_date = models.DateTimeField(null=True, blank=True)
    email_notification_status = models.CharField(max_length=50, default='Pending') # Pending, Sent, Failed, Partially Sent
    email_error_message = models.TextField(blank=True, default='')
    candidate_email_sent = models.BooleanField(default=False)
    candidate_email_date = models.DateTimeField(null=True, blank=True)
    dept_email_sent = models.BooleanField(default=False)
    dept_email_date = models.DateTimeField(null=True, blank=True)
    dept_reminder_3day_sent = models.BooleanField(default=False)
    dept_reminder_3day_date = models.DateTimeField(null=True, blank=True)

    # WhatsApp Notification Tracking (Retained for backwards compatibility)
    whatsapp_notification_sent = models.BooleanField(default=False)
    whatsapp_notification_date = models.DateTimeField(null=True, blank=True)
    whatsapp_notification_status = models.CharField(max_length=50, default='Pending') # Pending, Sent, Failed
    whatsapp_error_message = models.TextField(blank=True, default='')

    # Link to appraisal if assessed
    appraisal = models.ForeignKey(Appraisal, on_delete=models.SET_NULL, null=True, blank=True, related_name='training_record')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_end_date(self):
        if self.date_of_joining:
            import calendar
            import datetime
            year = self.date_of_joining.year
            month = self.date_of_joining.month + (self.training_period_months or 1)
            day = self.date_of_joining.day
            while month > 12:
                month -= 12
                year += 1
            max_day = calendar.monthrange(year, month)[1]
            return datetime.date(year, month, min(day, max_day))
        return None

    def save(self, *args, **kwargs):
        if not self.training_end_date:
            self.training_end_date = self.calculate_end_date()
        if not self.department_email and self.department:
            from .models import DepartmentAdmin
            for da in DepartmentAdmin.objects.all():
                if da.departments and any(d.strip().lower() == self.department.strip().lower() for d in da.departments):
                    eff_email = da.effective_email
                    if eff_email:
                        self.department_email = eff_email
                        break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee_code} - {self.name} ({self.department})"


class WhatsAppConfig(models.Model):
    api_token = models.TextField(blank=True, default='', help_text="Meta System User Access Token")
    phone_number_id = models.CharField(max_length=100, blank=True, default='', help_text="Meta WhatsApp Phone Number ID")
    business_account_id = models.CharField(max_length=100, blank=True, default='', help_text="Meta WhatsApp Business Account ID")
    template_name = models.CharField(max_length=100, default='training_assessment_reminder', help_text="Approved WhatsApp Message Template Name")
    template_language = models.CharField(max_length=20, default='en_US', help_text="Template language code, e.g. en_US")
    base_url = models.CharField(max_length=255, default='http://172.16.21.161:5173', help_text="App Frontend URL for assessment links")
    is_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "WhatsApp Configuration"
        verbose_name_plural = "WhatsApp Configuration"

    def __str__(self):
        return f"WhatsApp Config (Phone ID: {self.phone_number_id or 'Not configured'})"


class EmailConfig(models.Model):
    smtp_host = models.CharField(max_length=255, default='smtp.office365.com', help_text="SMTP Server Host (e.g. smtp.office365.com, smtp.gmail.com, or internal relay)")
    smtp_port = models.IntegerField(default=587, help_text="SMTP Server Port (e.g. 587 for TLS, 465 for SSL, 25 for internal relay)")
    use_tls = models.BooleanField(default=True, help_text="Use TLS (STARTTLS)")
    use_ssl = models.BooleanField(default=False, help_text="Use SSL")
    from_email = models.EmailField(default='HR@IQRAAHOSPITAL.IN', help_text="Sender Email Address")
    smtp_user = models.CharField(max_length=255, default='HR@IQRAAHOSPITAL.IN', blank=True, help_text="SMTP Username / Account")
    smtp_password = models.CharField(max_length=255, blank=True, default='', help_text="SMTP Password or App Password")
    is_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Email Configuration"
        verbose_name_plural = "Email Configuration"

    def __str__(self):
        return f"Email Config ({self.from_email} via {self.smtp_host}:{self.smtp_port})"


class TraineeAssessment(models.Model):
    PERFORMANCE_CHOICES = [
        ('Highly performed', 'Highly performed (85% - 100%)'),
        ('Well performed', 'Well performed (70% - 84%)'),
        ('Needs Improvement', 'Needs Improvement (50% - 69%)'),
        ('Unsatisfactory', 'Unsatisfactory (below 50%)'),
    ]

    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Submitted', 'Submitted'),
    ]

    trainee = models.OneToOneField(TrainingEmployee, on_delete=models.CASCADE, related_name='assessment')

    # Trainee Details Snapshot
    trainee_code = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True, default='')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.CharField(max_length=100)
    joining_date = models.DateField(null=True, blank=True)
    training_period = models.CharField(max_length=50, default='1 Month')
    training_completion_date = models.DateField(null=True, blank=True)

    # 10 Evaluation Attributes (0 to 3 Points each: 3=Excellent, 2=Good, 1=Average, 0=Poor)
    job_knowledge = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    quality_of_work = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    productivity = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    attendance = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    initiative = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    communication = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    teamwork = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    adaptability = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    professionalism = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])
    self_improvement = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(3)])

    # Automated Scoring & Performance Classification
    total_score = models.IntegerField(default=0)  # / 30
    percentage = models.FloatField(default=0.0)
    performance_rating = models.CharField(max_length=50, choices=PERFORMANCE_CHOICES, blank=True, default='')

    # Legacy Signature Fields (retained for database compatibility)
    employee_signature = models.CharField(max_length=100, blank=True, default='')
    employee_signature_date = models.DateField(null=True, blank=True)

    immediate_manager_signature = models.CharField(max_length=100, blank=True, default='')
    immediate_manager_date = models.DateField(null=True, blank=True)

    department_head_signature = models.CharField(max_length=100, blank=True, default='')
    department_head_date = models.DateField(null=True, blank=True)

    authorized_signature_1 = models.CharField(max_length=100, blank=True, default='')
    authorized_date_1 = models.DateField(null=True, blank=True)

    authorized_signature_2 = models.CharField(max_length=100, blank=True, default='')
    authorized_date_2 = models.DateField(null=True, blank=True)

    evaluator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='trainee_evaluations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')

    # Approval Flow Fields
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='trainee_approvals')
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_scores(self):
        scores = [
            self.job_knowledge or 0,
            self.quality_of_work or 0,
            self.productivity or 0,
            self.attendance or 0,
            self.initiative or 0,
            self.communication or 0,
            self.teamwork or 0,
            self.adaptability or 0,
            self.professionalism or 0,
            self.self_improvement or 0,
        ]
        self.total_score = sum(scores)
        self.percentage = round((self.total_score / 30.0) * 100.0, 1)

        if self.percentage >= 85:
            self.performance_rating = 'Highly performed'
        elif self.percentage >= 70:
            self.performance_rating = 'Well performed'
        elif self.percentage >= 50:
            self.performance_rating = 'Needs Improvement'
        else:
            self.performance_rating = 'Unsatisfactory'

    def save(self, *args, **kwargs):
        self.calculate_scores()
        super().save(*args, **kwargs)
        if self.trainee:
            if self.status == 'Approved':
                self.trainee.status = 'Completed'
                self.trainee.save(update_fields=['status'])
            elif self.status in ['Pending', 'Submitted'] and self.trainee.status not in ['Completed', 'Discontinued']:
                self.trainee.save()

    def __str__(self):
        return f"Trainee Assessment: {self.trainee_code} - {self.name} ({self.total_score}/30) [{self.status}]"


class IncentivePeriod(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Incentive period name e.g. Jun, July, Aug")
    months = models.CharField(max_length=200, blank=True, default='', help_text="Included months e.g. June, July, August")
    cutoff_date = models.DateField(help_text="Cut-off date to calculate staff experience from joining date")
    is_active = models.BooleanField(default=True, help_text="Active period status")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-cutoff_date', '-created_at']

    def save(self, *args, **kwargs):
        if self.is_active:
            IncentivePeriod.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # When an incentive period is deleted, delete all employees in Employee Master for this period
        from .models import Employee, Appraisal, IncentiveRecord
        Employee.objects.filter(
            models.Q(incentive_period=self) | 
            models.Q(assignment_period__iexact=self.name) | 
            models.Q(assignment_period__iexact=self.months)
        ).delete()
        Appraisal.objects.filter(
            models.Q(assignment_period__iexact=self.name) | 
            models.Q(assignment_period__iexact=self.months)
        ).delete()
        IncentiveRecord.objects.filter(period=self).delete()
        # Department admins, locations, and users remain 100% untouched
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (Cut-off: {self.cutoff_date})"


class DivisionRate(models.Model):
    division_name = models.CharField(max_length=150, unique=True, help_text="Unique Division Name from staff excel")
    rate = models.FloatField(default=0.0, help_text="Incentive Rate Fixed For that Division (e.g. 1000, 2000, 3000)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['division_name']

    def __str__(self):
        return f"{self.division_name} - Rate: {self.rate}"


class EmployeeLevelConfig(models.Model):
    level_code = models.CharField(max_length=50, unique=True, help_text="Level code e.g. MAN, SUP, LOW, MID")
    description = models.CharField(max_length=100, blank=True, default='', help_text="Description e.g. Managerial, Supervisory")
    score = models.FloatField(default=1.0, help_text="Level 1 Score / Units for this level")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['level_code']

    def __str__(self):
        return f"{self.level_code} - Score: {self.score}"


class ExperienceLevelConfig(models.Model):
    name = models.CharField(max_length=100, help_text="Bracket name e.g. 1 - 3 Years")
    min_months = models.IntegerField(default=0, help_text="Minimum experience in months (inclusive)")
    max_months = models.IntegerField(default=999, help_text="Maximum experience in months (inclusive)")
    score = models.FloatField(default=1.0, help_text="Level 2 Experience Score / Units")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['min_months']

    def __str__(self):
        return f"{self.name} ({self.min_months}-{self.max_months} mos) - Score: {self.score}"


class IncentiveRecord(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Processed', 'Processed'),
        ('Approved', 'Approved'),
    ]

    period = models.ForeignKey(IncentivePeriod, on_delete=models.CASCADE, related_name='records')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='incentive_records')
    
    # Snapshot metadata
    employee_code = models.CharField(max_length=50)
    employee_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True, default='')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.CharField(max_length=100, blank=True, default='')
    division = models.CharField(max_length=150, blank=True, default='')
    category = models.CharField(max_length=100, blank=True, default='')

    # Level 1 (Employee Level & Score)
    employee_level = models.CharField(max_length=50, blank=True, default='')
    level_1_score = models.FloatField(default=0.0)

    # Level 2 (Experience & Score)
    joining_date = models.DateField(null=True, blank=True)
    cutoff_date = models.DateField(null=True, blank=True)
    experience_months = models.IntegerField(default=0)
    experience_display = models.CharField(max_length=50, blank=True, default='')
    level_2_score = models.FloatField(default=0.0)

    # Level 3 (Assessment Score)
    appraisal = models.ForeignKey(Appraisal, on_delete=models.SET_NULL, null=True, blank=True, related_name='incentive_records')
    appraisal_marks = models.FloatField(default=0.0) # marks out of 100
    level_3_score = models.FloatField(default=0.0) # final score out of 3.0

    # Incentive Calculation: (Level 1 + Level 2 + Level 3) * Division Rate
    total_unit_score = models.FloatField(default=0.0)
    division_rate = models.FloatField(default=0.0)
    final_incentive_amount = models.FloatField(default=0.0)

    # Processing metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('period', 'employee')
        ordering = ['employee_code']

    def calculate(self):
        self.total_unit_score = round(float(self.level_1_score or 0) + float(self.level_2_score or 0) + float(self.level_3_score or 0), 2)
        self.final_incentive_amount = round(self.total_unit_score * float(self.division_rate or 0), 2)

    def save(self, *args, **kwargs):
        self.calculate()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee_code} - {self.period.name}: ₹{self.final_incentive_amount} [{self.status}]"


