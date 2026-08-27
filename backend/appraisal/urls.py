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
    PasswordResetView
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'appraisals', AppraisalViewSet, basename='appraisal')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'department-admins', DepartmentAdminViewSet, basename='department-admin')

urlpatterns = [
    path('auth/login/', CustomAuthToken.as_view(), name='login'),
    path('auth/reset-password/', PasswordResetView.as_view(), name='password-reset'),
    path('employees/fetch/', EmployeeAutoFetchView.as_view(), name='employee-fetch'),
    path('employees/import-excel/', ExcelImportView.as_view(), name='employee-import-excel'),
    path('appraisals/export-excel/', ExcelExportView.as_view(), name='appraisal-export-excel'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]


