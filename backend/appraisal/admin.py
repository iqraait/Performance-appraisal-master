from django.contrib import admin
from django import forms
from .models import Employee, Appraisal, DepartmentAdmin, Branch, TrainingEmployee, WhatsAppConfig, TraineeAssessment

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'name', 'department', 'location', 'branch', 'designation', 'date_of_joining', 'assignment_period', 'status')
    list_filter = ('department', 'location', 'branch', 'designation', 'status')
    search_fields = ('employee_code', 'name')
    ordering = ('employee_code',)


@admin.register(Appraisal)
class AppraisalAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'employee_name', 'department', 'location', 'branch', 'designation', 'performance_score', 'total_deduction', 'final_score', 'rating', 'status', 'submitted_date')
    list_filter = ('department', 'location', 'branch', 'designation', 'status', 'rating', 'assignment_period')
    search_fields = ('employee_code', 'employee_name')
    readonly_fields = ('performance_score', 'final_score', 'rating', 'submitted_date')
    ordering = ('-submitted_date',)


class DepartmentAdminForm(forms.ModelForm):
    departments = forms.MultipleChoiceField(
        choices=[],
        widget=forms.SelectMultiple(attrs={'style': 'width: 300px; height: 120px;'}),
        help_text="Hold Ctrl to select multiple departments."
    )
    locations = forms.MultipleChoiceField(
        choices=[],
        required=False,
        widget=forms.SelectMultiple(attrs={'style': 'width: 300px; height: 120px;'}),
        help_text="Hold Ctrl to select multiple locations (optional)."
    )
    branches = forms.MultipleChoiceField(
        choices=[],
        required=False,
        widget=forms.SelectMultiple(attrs={'style': 'width: 300px; height: 120px;'}),
        help_text="Hold Ctrl to select multiple branches (optional)."
    )

    class Meta:
        model = DepartmentAdmin
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Query unique departments from Employee model
        depts = Employee.objects.values_list('department', flat=True).distinct()
        current_depts = self.instance.departments if self.instance and self.instance.pk else []
        all_depts = sorted(list(set(list(depts) + current_depts)))
        self.fields['departments'].choices = [(d, d) for d in all_depts if d]

        # Query unique locations from Employee model
        locs = Employee.objects.values_list('location', flat=True).distinct()
        current_locs = self.instance.locations if self.instance and self.instance.pk else []
        all_locs = sorted(list(set(list(locs) + current_locs)))
        self.fields['locations'].choices = [(l, l) for l in all_locs if l]

        # Query unique branches from Branch model
        branch_objs = list(Branch.objects.values_list('name', flat=True))
        current_branches = self.instance.branches if self.instance and self.instance.pk else []
        all_branches = sorted(list(set(branch_objs + current_branches)))
        self.fields['branches'].choices = [(b, b) for b in all_branches if b]


@admin.register(DepartmentAdmin)
class DepartmentAdminAdmin(admin.ModelAdmin):
    form = DepartmentAdminForm
    list_display = ('user', 'whatsapp_number', 'get_departments_display', 'get_locations_display', 'get_branches_display')
    search_fields = ('user__username', 'whatsapp_number')
    autocomplete_fields = ['user']

    class Media:
        css = {
            'all': ('admin/css/vendor/select2/select2.css', 'admin/css/autocomplete.css',)
        }
        js = (
            'admin/js/vendor/jquery/jquery.js',
            'admin/js/vendor/select2/select2.full.js',
            'admin/js/vendor/select2/i18n/en.js',
            'admin/js/jquery.init.js',
            'appraisal/js/admin_select2.js',
        )

    def get_departments_display(self, obj):
        return ", ".join(obj.departments) if obj.departments else "None"
    get_departments_display.short_description = 'Departments'

    def get_locations_display(self, obj):
        return ", ".join(obj.locations) if obj.locations else "All"
    get_locations_display.short_description = 'Locations'

    def get_branches_display(self, obj):
        return ", ".join(obj.branches) if obj.branches else "All"
    get_branches_display.short_description = 'Branches'


@admin.register(TrainingEmployee)
class TrainingEmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'name', 'department', 'branch', 'date_of_joining', 'training_end_date', 'status', 'whatsapp_notification_sent', 'whatsapp_notification_status')
    list_filter = ('department', 'branch', 'status', 'whatsapp_notification_sent')
    search_fields = ('employee_code', 'name', 'department')
    readonly_fields = ('training_end_date', 'whatsapp_notification_date', 'created_at', 'updated_at')


@admin.register(WhatsAppConfig)
class WhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'phone_number_id', 'template_name', 'base_url', 'is_enabled', 'updated_at')


@admin.register(TraineeAssessment)
class TraineeAssessmentAdmin(admin.ModelAdmin):
    list_display = ('trainee_code', 'name', 'department', 'total_score', 'percentage', 'performance_rating', 'status', 'created_at')
    list_filter = ('department', 'performance_rating', 'status')
    search_fields = ('trainee_code', 'name', 'department')
    readonly_fields = ('total_score', 'percentage', 'performance_rating', 'created_at', 'updated_at')



