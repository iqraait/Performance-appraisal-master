from django.contrib import admin
from .models import Employee, Appraisal

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'name', 'department', 'designation', 'date_of_joining', 'assignment_period', 'status')
    list_filter = ('department', 'designation', 'status')
    search_fields = ('employee_code', 'name')
    ordering = ('employee_code',)


@admin.register(Appraisal)
class AppraisalAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'employee_name', 'department', 'designation', 'performance_score', 'total_deduction', 'final_score', 'rating', 'status', 'submitted_date')
    list_filter = ('department', 'designation', 'status', 'rating', 'assignment_period')
    search_fields = ('employee_code', 'employee_name')
    readonly_fields = ('performance_score', 'final_score', 'rating', 'submitted_date')
    ordering = ('-submitted_date',)
