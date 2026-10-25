from django.contrib import admin
from django import forms
from django.utils.html import format_html, mark_safe
from .models import (
    Employee, Appraisal, DepartmentAdmin, Branch, TrainingEmployee, 
    WhatsAppConfig, EmailConfig, TraineeAssessment,
    IncentivePeriod, DivisionRate, EmployeeLevelConfig, ExperienceLevelConfig, IncentiveRecord,
    DutyLocation
)

admin.site.site_header = "IQRAA International Hospital & Research Centre"
admin.site.site_title = "IQRAA Performance Admin"
admin.site.index_title = "Hospital System & Performance Administration"


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)
    ordering = ('name',)
    list_per_page = 25


def get_department_choices(current_val=None):
    emp_depts = Employee.objects.exclude(department='').values_list('department', flat=True).distinct()
    trn_depts = TrainingEmployee.objects.exclude(department='').values_list('department', flat=True).distinct()
    loc_depts = DutyLocation.objects.exclude(department='').values_list('department', flat=True).distinct()
    all_depts = set()
    for d in emp_depts:
        if d:
            for sub in d.split(','):
                if sub.strip():
                    all_depts.add(sub.strip())
    for d in trn_depts:
        if d:
            for sub in d.split(','):
                if sub.strip():
                    all_depts.add(sub.strip())
    for d in loc_depts:
        if d:
            for sub in d.split(','):
                if sub.strip():
                    all_depts.add(sub.strip())
    if current_val:
        if isinstance(current_val, (list, tuple)):
            for v in current_val:
                if v and v.strip():
                    all_depts.add(v.strip())
        elif isinstance(current_val, str) and current_val.strip():
            for v in current_val.split(','):
                if v and v.strip():
                    all_depts.add(v.strip())
    return [('', '---------')] + [(d, d) for d in sorted(all_depts)]


def get_location_choices(current_val=None):
    master_locs = DutyLocation.objects.filter(is_active=True).values_list('name', flat=True).distinct()
    emp_locs = Employee.objects.exclude(location='').values_list('location', flat=True).distinct()
    trn_locs = TrainingEmployee.objects.exclude(location='').values_list('location', flat=True).distinct()
    all_locs = set(l.strip() for l in master_locs if l and l.strip())
    for l in emp_locs:
        if l:
            for sub in l.split(','):
                if sub.strip():
                    all_locs.add(sub.strip())
    for l in trn_locs:
        if l:
            for sub in l.split(','):
                if sub.strip():
                    all_locs.add(sub.strip())
    if current_val:
        if isinstance(current_val, (list, tuple)):
            for v in current_val:
                if v and v.strip():
                    all_locs.add(v.strip())
        elif isinstance(current_val, str) and current_val.strip():
            for v in current_val.split(','):
                if v and v.strip():
                    all_locs.add(v.strip())
    return [('', '---------')] + [(l, l) for l in sorted(all_locs)]


class EmployeeAdminForm(forms.ModelForm):
    additional_departments = forms.MultipleChoiceField(
        choices=[],
        required=False,
        label="Additional Departments",
        widget=forms.SelectMultiple(attrs={'id': 'id_departments', 'class': 'iqraa-select2', 'style': 'width: 100%;'}),
        help_text="Select one or more additional departments for this staff ID (multi-department assignment)."
    )
    additional_locations = forms.MultipleChoiceField(
        choices=[],
        required=False,
        label="Additional Duty Locations",
        widget=forms.SelectMultiple(attrs={'id': 'id_locations', 'class': 'iqraa-select2', 'style': 'width: 100%;'}),
        help_text="Select one or more additional duty locations for this staff ID (multi-location assignment)."
    )

    class Meta:
        model = Employee
        fields = '__all__'
          
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        raw_dept = self.instance.department if self.instance else None
        dept_parts = [p.strip() for p in (raw_dept or '').split(',') if p.strip()]
        primary_dept = dept_parts[0] if dept_parts else ''
        extra_depts = dept_parts[1:] if len(dept_parts) > 1 else []

        raw_loc = self.instance.location if self.instance else ''
        loc_parts = [p.strip() for p in (raw_loc or '').split(',') if p.strip()]
        primary_loc = loc_parts[0] if loc_parts else ''
        extra_locs = loc_parts[1:] if len(loc_parts) > 1 else []

        all_dept_choices = get_department_choices(dept_parts)
        self.fields['department'].widget = forms.Select(choices=all_dept_choices)
        self.fields['department'].label = "Primary Department"
        self.fields['additional_departments'].choices = [(d, d) for d, _ in all_dept_choices if d]

        all_loc_choices = get_location_choices(loc_parts)
        self.fields['location'].widget = forms.Select(choices=all_loc_choices)
        self.fields['location'].label = "Primary Duty Location"
        self.fields['additional_locations'].choices = [(l, l) for l, _ in all_loc_choices if l]

        if self.instance and self.instance.pk:
            self.initial['department'] = primary_dept
            self.initial['additional_departments'] = extra_depts
            self.initial['location'] = primary_loc
            self.initial['additional_locations'] = extra_locs

    def clean(self):
        cleaned_data = super().clean()
        primary_dept = cleaned_data.get('department') or ''
        extra_depts = cleaned_data.get('additional_departments') or []

        combined_depts = []
        if primary_dept.strip():
            combined_depts.append(primary_dept.strip())
        for ed in extra_depts:
            if ed and ed.strip() and ed.strip() not in combined_depts:
                combined_depts.append(ed.strip())

        cleaned_data['department'] = ', '.join(combined_depts)

        primary_loc = cleaned_data.get('location') or ''
        extra_locs = cleaned_data.get('additional_locations') or []

        combined = []
        if primary_loc.strip():
            combined.append(primary_loc.strip())
        for el in extra_locs:
            if el and el.strip() and el.strip() not in combined:
                combined.append(el.strip())

        cleaned_data['location'] = ', '.join(combined)
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.department = self.cleaned_data.get('department', '')
        instance.location = self.cleaned_data.get('location', '')
        if commit:
            instance.save()
            self.save_m2m()
        return instance


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    form = EmployeeAdminForm
    fieldsets = (
        ('Staff Identification', {
            'fields': (('employee_code', 'name'), ('organization', 'division'))
        }),
        ('Placement & Classification', {
            'fields': (
                ('department', 'designation'),
                'additional_departments',
                ('branch', 'location'),
                'additional_locations',
                ('category', 'level')
            )
        }),
        ('Tenure & Appraisal Period', {
            'fields': (('date_of_joining', 'status'), ('assignment_period', 'incentive_period'))
        }),
    )

    class Media:
        css = {
            'all': (
                'admin/css/vendor/select2/select2.css',
                'admin/css/autocomplete.css',
            )
        }
        js = (
            'admin/js/vendor/jquery/jquery.js',
            'admin/js/vendor/select2/select2.full.js',
            'admin/js/jquery.init.js',
            'admin/js/admin_select2.js',
        )
    list_display = (
        'employee_code', 
        'name', 
        'department', 
        'division', 
        'level_badge', 
        'location', 
        'branch', 
        'designation', 
        'date_of_joining', 
        'assignment_period', 
        'status_badge'
    )
    list_filter = ('department', 'division', 'level', 'branch', 'status', 'incentive_period')
    search_fields = ('employee_code', 'name', 'department', 'designation', 'division')
    ordering = ('employee_code',)
    list_per_page = 25
    list_select_related = ('branch', 'incentive_period')
    date_hierarchy = 'date_of_joining'

    def status_badge(self, obj):
        if obj.status == 'Active':
            return mark_safe('<span class="badge-active">● Active</span>')
        return mark_safe('<span class="badge-inactive">○ Inactive</span>')
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def level_badge(self, obj):
        if obj.level:
            return format_html('<span class="badge-pill">{}</span>', obj.level)
        return '-'
    level_badge.short_description = 'Level'
    level_badge.admin_order_field = 'level'


@admin.register(Appraisal)
class AppraisalAdmin(admin.ModelAdmin):
    list_display = (
        'employee_code', 
        'employee_name', 
        'department', 
        'location', 
        'designation', 
        'performance_score', 
        'marks_obtained', 
        'final_score', 
        'rating_badge', 
        'status_badge', 
        'submitted_date'
    )
    list_filter = ('status', 'rating', 'department', 'branch', 'assignment_period')
    search_fields = ('employee_code', 'employee_name', 'department')
    readonly_fields = ('performance_score', 'marks_obtained', 'final_score', 'rating', 'submitted_date')
    ordering = ('-submitted_date',)
    list_per_page = 25
    list_select_related = ('branch',)

    def status_badge(self, obj):
        if obj.status == 'Approved':
            return mark_safe('<span class="badge-active">Approved</span>')
        return format_html('<span class="badge-pill">{}</span>', obj.status)
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def rating_badge(self, obj):
        if obj.rating:
            return format_html('<span class="badge-pill">{}</span>', obj.rating)
        return '-'
    rating_badge.short_description = 'Rating'
    rating_badge.admin_order_field = 'rating'


@admin.register(IncentivePeriod)
class IncentivePeriodAdmin(admin.ModelAdmin):
    list_display = ('name', 'branch', 'months', 'cutoff_date', 'active_badge', 'created_at')
    list_filter = ('branch', 'is_active')
    search_fields = ('name', 'months', 'branch__name')
    list_per_page = 25

    def active_badge(self, obj):
        if obj.is_active:
            return mark_safe('<span class="badge-active">★ Active Period</span>')
        return mark_safe('<span class="badge-inactive">Inactive</span>')
    active_badge.short_description = 'Status'
    active_badge.admin_order_field = 'is_active'


@admin.register(DivisionRate)
class DivisionRateAdmin(admin.ModelAdmin):
    list_display = ('division_name', 'branch', 'rate', 'updated_at')
    list_filter = ('branch',)
    search_fields = ('division_name', 'branch__name')
    list_editable = ('rate',)
    list_per_page = 25


@admin.register(EmployeeLevelConfig)
class EmployeeLevelConfigAdmin(admin.ModelAdmin):
    list_display = ('level_code', 'branch', 'description', 'score', 'updated_at')
    list_filter = ('branch',)
    search_fields = ('level_code', 'description', 'branch__name')
    list_editable = ('score',)
    list_per_page = 25


@admin.register(ExperienceLevelConfig)
class ExperienceLevelConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'branch', 'min_months', 'max_months', 'score', 'updated_at')
    list_filter = ('branch',)
    search_fields = ('name', 'branch__name')
    list_editable = ('score',)
    list_per_page = 25


@admin.register(IncentiveRecord)
class IncentiveRecordAdmin(admin.ModelAdmin):
    list_display = (
        'employee_code', 
        'employee_name', 
        'period', 
        'division', 
        'employee_level', 
        'total_unit_score', 
        'division_rate', 
        'incentive_amount_display', 
        'status_badge'
    )
    list_filter = ('period', 'status', 'division')
    search_fields = ('employee_code', 'employee_name', 'division')
    ordering = ('-created_at',)
    list_per_page = 25
    list_select_related = ('period',)

    def incentive_amount_display(self, obj):
        return format_html('<strong style="color: #059669;">₹{:,.2f}</strong>', obj.final_incentive_amount)
    incentive_amount_display.short_description = 'Incentive (₹)'
    incentive_amount_display.admin_order_field = 'final_incentive_amount'

    def status_badge(self, obj):
        if obj.status == 'Approved':
            return mark_safe('<span class="badge-active">Approved</span>')
        return format_html('<span class="badge-pill">{}</span>', obj.status)
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'


class DepartmentAdminForm(forms.ModelForm):
    departments = forms.MultipleChoiceField(
        choices=[],
        widget=forms.SelectMultiple(attrs={'id': 'id_departments', 'class': 'iqraa-select2', 'style': 'width: 100%;'}),
        help_text="Select one or more authorized departments. If left untagged, the administrator will have no access."
    )
    locations = forms.MultipleChoiceField(
        choices=[],
        required=False,
        widget=forms.SelectMultiple(attrs={'id': 'id_locations', 'class': 'iqraa-select2', 'style': 'width: 100%;'}),
        help_text="Select one or more authorized duty locations. If left unselected/untagged, the administrator will NOT see or access any locations."
    )
    branches = forms.MultipleChoiceField(
        choices=[],
        required=False,
        widget=forms.SelectMultiple(attrs={'id': 'id_branches', 'class': 'iqraa-select2', 'style': 'width: 100%;'}),
        help_text="Select one or more authorized hospital branches. If left unselected/untagged, the administrator will NOT see or access any branches."
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

        # Query unique locations from Employee and DutyLocation models
        emp_locs = Employee.objects.values_list('location', flat=True).distinct()
        master_locs = DutyLocation.objects.values_list('name', flat=True).distinct()
        current_locs = self.instance.locations if self.instance and self.instance.pk else []
        all_locs = sorted(list(set(list(emp_locs) + list(master_locs) + current_locs)))
        self.fields['locations'].choices = [(l, l) for l in all_locs if l]

        # Query unique branches from Branch model
        branch_objs = list(Branch.objects.values_list('name', flat=True))
        current_branches = self.instance.branches if self.instance and self.instance.pk else []
        all_branches = sorted(list(set(branch_objs + current_branches)))
        self.fields['branches'].choices = [(b, b) for b in all_branches if b]


@admin.register(DepartmentAdmin)
class DepartmentAdminAdmin(admin.ModelAdmin):
    form = DepartmentAdminForm
    fieldsets = (
        ('Administrator Account & Contact', {
            'description': 'Assign the system user and contact email / WhatsApp for notification alerts.',
            'fields': (('user', 'email'), 'whatsapp_number'),
        }),
        ('Authorized Hospital Departments', {
            'description': 'Select which hospital departments this administrator is authorized to supervise.',
            'fields': ('departments',),
        }),
        ('Branch & Location Scoping (Required Mapping)', {
            'description': 'Select authorized branches and duty locations. If unselected/untagged, the administrator will NOT be permitted to see or access any data.',
            'fields': ('branches', 'locations'),
        }),
    )
    list_display = ('user', 'email', 'whatsapp_number', 'get_departments_display', 'get_locations_display', 'get_branches_display')
    search_fields = ('user__username', 'email', 'whatsapp_number')
    autocomplete_fields = ['user']
    list_per_page = 25

    class Media:
        css = {
            'all': (
                'admin/css/vendor/select2/select2.css',
                'admin/css/autocomplete.css',
            )
        }
        js = (
            'admin/js/vendor/jquery/jquery.js',
            'admin/js/vendor/select2/select2.full.js',
            'admin/js/jquery.init.js',
            'admin/js/admin_select2.js',
        )

    def get_departments_display(self, obj):
        return ", ".join(obj.departments) if obj.departments else "None (Untagged)"
    get_departments_display.short_description = 'Departments'

    def get_locations_display(self, obj):
        return ", ".join(obj.locations) if obj.locations else "None (Untagged)"
    get_locations_display.short_description = 'Locations'

    def get_branches_display(self, obj):
        return ", ".join(obj.branches) if obj.branches else "None (Untagged)"
    get_branches_display.short_description = 'Branches'


class TrainingEmployeeAdminForm(forms.ModelForm):
    class Meta:
        model = TrainingEmployee
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        dept_val = self.instance.department if self.instance else None
        loc_val = self.instance.location if self.instance else None
        self.fields['department'].widget = forms.Select(choices=get_department_choices(dept_val))
        self.fields['location'].widget = forms.Select(choices=get_location_choices(loc_val))


@admin.register(TrainingEmployee)
class TrainingEmployeeAdmin(admin.ModelAdmin):
    form = TrainingEmployeeAdminForm
    list_display = ('employee_code', 'name', 'department', 'training_period_months', 'email', 'department_email', 'date_of_joining', 'training_end_date', 'status', 'email_notification_sent', 'email_notification_status')
    list_filter = ('department', 'training_period_months', 'status', 'email_notification_sent')
    search_fields = ('employee_code', 'name', 'department', 'email', 'department_email')
    readonly_fields = ('training_end_date', 'email_notification_date', 'candidate_email_date', 'dept_email_date', 'dept_reminder_3day_date', 'whatsapp_notification_date', 'created_at', 'updated_at')
    list_per_page = 25


@admin.register(WhatsAppConfig)
class WhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'phone_number_id', 'template_name', 'base_url', 'is_enabled', 'updated_at')


@admin.register(EmailConfig)
class EmailConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'smtp_host', 'smtp_port', 'use_tls', 'from_email', 'smtp_user', 'is_enabled', 'updated_at')


@admin.register(TraineeAssessment)
class TraineeAssessmentAdmin(admin.ModelAdmin):
    list_display = ('trainee_code', 'name', 'department', 'total_score', 'percentage', 'performance_rating', 'status', 'approved_by', 'approved_at', 'created_at')
    list_filter = ('status', 'department', 'performance_rating', 'approved_at')
    search_fields = ('trainee_code', 'name', 'department')


class DutyLocationAdminForm(forms.ModelForm):
    class Meta:
        model = DutyLocation
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        dept_val = self.instance.department if self.instance else None
        self.fields['department'].widget = forms.Select(choices=get_department_choices(dept_val))


@admin.register(DutyLocation)
class DutyLocationAdmin(admin.ModelAdmin):
    form = DutyLocationAdminForm
    list_display = ('name', 'code', 'department', 'branch', 'is_active', 'created_at')
    list_filter = ('is_active', 'branch', 'department')
    search_fields = ('name', 'code', 'department', 'description')
    ordering = ('name',)
    list_per_page = 30




