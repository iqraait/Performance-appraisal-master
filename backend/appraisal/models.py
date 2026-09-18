from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User

class Branch(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Branches"

    def __str__(self):
        return self.name


class Employee(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]

    employee_code = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True, default='')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    designation = models.CharField(max_length=100)
    date_of_joining = models.DateField()
    assignment_period = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')

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
    final_score = models.IntegerField(default=0)
    rating = models.CharField(max_length=30, choices=RATING_CHOICES, blank=True)

    # Submission metadata
    submitted_date = models.DateTimeField(auto_now_add=True)
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('Draft', 'Draft'), ('Approved', 'Approved')], default='Draft')

    def calculate_metrics(self):
        # Calculate performance total
        self.performance_score = (
            int(self.job_competence or 0) +
            int(self.productivity_responsibility or 0) +
            int(self.communication_teamwork or 0) +
            int(self.professionalism_discipline or 0) +
            int(self.initiative_improvement or 0)
        )
        
        # Calculate final score
        self.final_score = self.performance_score - int(self.total_deduction or 0)
        
        # Calculate rating letters
        score = self.final_score
        if score >= 90:
            self.rating = 'Outstanding (A)'
        elif score >= 75:
            self.rating = 'Very Good (B)'
        elif score >= 60:
            self.rating = 'Good (C)'
        elif score >= 50:
            self.rating = 'Needs Improvement (D)'
        else:
            self.rating = 'Unsatisfactory (E)'

    def save(self, *args, **kwargs):
        self.calculate_metrics()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Appraisal for {self.employee_code} - {self.employee_name} ({self.rating})"


class DepartmentAdmin(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='department_admin')
    departments = models.JSONField(default=list, help_text="List of tagged departments")
    locations = models.JSONField(default=list, blank=True, help_text="List of tagged duty locations (optional)")
    branches = models.JSONField(default=list, blank=True, help_text="List of tagged branches (optional)")
    whatsapp_number = models.CharField(max_length=25, blank=True, default='', help_text="WhatsApp phone number with country code, e.g. 919876543210")

    def __str__(self):
        depts = ', '.join(self.departments) if self.departments else 'None'
        locs = ', '.join(self.locations) if self.locations else 'All'
        brs = ', '.join(self.branches) if self.branches else 'All'
        wa = f" | WA: {self.whatsapp_number}" if self.whatsapp_number else ""
        return f"{self.user.username} - Depts: {depts} | Locs: {locs} | Branches: {brs}{wa}"


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
    date_of_joining = models.DateField()
    training_period_months = models.IntegerField(default=1)
    training_end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Training')

    # WhatsApp Notification Tracking
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
            month = self.date_of_joining.month + self.training_period_months
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


class TraineeAssessment(models.Model):
    PERFORMANCE_CHOICES = [
        ('Highly performed', 'Highly performed (85% - 100%)'),
        ('Well performed', 'Well performed (70% - 84%)'),
        ('Needs Improvement', 'Needs Improvement (50% - 69%)'),
        ('Unsatisfactory', 'Unsatisfactory (below 50%)'),
    ]

    STATUS_CHOICES = [
        ('Draft', 'Draft'),
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

    # Signatures & Dates
    employee_signature = models.CharField(max_length=100, blank=True, default='')
    employee_signature_date = models.DateField(null=True, blank=True)

    immediate_manager_signature = models.CharField(max_length=100, blank=True, default='')
    immediate_manager_date = models.DateField(null=True, blank=True)

    department_head_signature = models.CharField(max_length=100, blank=True, default='')
    department_head_date = models.DateField(null=True, blank=True)

    # Office Use Only
    authorized_signature_1 = models.CharField(max_length=100, blank=True, default='')
    authorized_date_1 = models.DateField(null=True, blank=True)

    authorized_signature_2 = models.CharField(max_length=100, blank=True, default='')
    authorized_date_2 = models.DateField(null=True, blank=True)

    evaluator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='trainee_evaluations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Submitted')
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
        if self.status == 'Submitted' and self.trainee:
            self.trainee.status = 'Assessed'
            self.trainee.save(update_fields=['status'])

    def __str__(self):
        return f"Trainee Assessment: {self.trainee_code} - {self.name} ({self.total_score}/30)"

