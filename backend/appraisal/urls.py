from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, 
    AppraisalViewSet, 
    BranchViewSet,
    DepartmentAdminViewSet,
    EmployeeAutoFetchView, 
    ExcelImportView, 
    ExcelExportView, 
    DashboardStatsView,
    CustomAuthToken,
    CurrentUserView,
    PasswordResetView,
    TrainingEmployeeViewSet,
    TrainingExcelImportView,
    WhatsAppConfigView,
    EmailConfigView,
    TraineeAssessmentViewSet,
    DepartmentLocationMetaView,
    IncentivePeriodViewSet,
    DivisionRateViewSet,
    EmployeeLevelConfigViewSet,
    ExperienceLevelConfigViewSet,
    IncentiveCalculationView,
    IncentiveProcessActionView,
    IncentiveExcelExportView,
    DutyLocationViewSet
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'appraisals', AppraisalViewSet, basename='appraisal')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'department-admins', DepartmentAdminViewSet, basename='department-admin')
router.register(r'locations', DutyLocationViewSet, basename='location')
router.register(r'training-employees', TrainingEmployeeViewSet, basename='training-employee')
router.register(r'trainee-assessments', TraineeAssessmentViewSet, basename='trainee-assessment')
router.register(r'incentives/periods', IncentivePeriodViewSet, basename='incentive-period')
router.register(r'incentives/division-rates', DivisionRateViewSet, basename='division-rate')
router.register(r'incentives/level-configs', EmployeeLevelConfigViewSet, basename='employee-level-config')
router.register(r'incentives/experience-configs', ExperienceLevelConfigViewSet, basename='experience-level-config')

urlpatterns = [
    path('auth/login/', CustomAuthToken.as_view(), name='login'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('auth/reset-password/', PasswordResetView.as_view(), name='password-reset'),
    path('employees/fetch/', EmployeeAutoFetchView.as_view(), name='employee-fetch'),
    path('employees/import-excel/', ExcelImportView.as_view(), name='employee-import-excel'),
    path('training/import-excel/', TrainingExcelImportView.as_view(), name='training-import-excel'),
    path('whatsapp/config/', WhatsAppConfigView.as_view(), name='whatsapp-config'),
    path('email/config/', EmailConfigView.as_view(), name='email-config'),
    path('appraisals/export-excel/', ExcelExportView.as_view(), name='appraisal-export-excel'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('meta/departments-locations/', DepartmentLocationMetaView.as_view(), name='departments-locations-meta'),
    path('incentives/calculate/', IncentiveCalculationView.as_view(), name='incentive-calculate'),
    path('incentives/process/', IncentiveProcessActionView.as_view(), name='incentive-process'),
    path('incentives/export-excel/', IncentiveExcelExportView.as_view(), name='incentive-export-excel'),
    path('', include(router.urls)),
]



