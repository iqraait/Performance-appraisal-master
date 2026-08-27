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

    def __str__(self):
        depts = ', '.join(self.departments) if self.departments else 'None'
        locs = ', '.join(self.locations) if self.locations else 'All'
        brs = ', '.join(self.branches) if self.branches else 'All'
        return f"{self.user.username} - Depts: {depts} | Locs: {locs} | Branches: {brs}"
