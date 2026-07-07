from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, 
    AppraisalViewSet, 
    EmployeeAutoFetchView, 
    ExcelImportView, 
    ExcelExportView, 
    DashboardStatsView,
    CustomAuthToken
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'appraisals', AppraisalViewSet, basename='appraisal')

urlpatterns = [
    path('auth/login/', CustomAuthToken.as_view(), name='login'),
    path('employees/fetch/', EmployeeAutoFetchView.as_view(), name='employee-fetch'),
    path('employees/import-excel/', ExcelImportView.as_view(), name='employee-import-excel'),
    path('appraisals/export-excel/', ExcelExportView.as_view(), name='appraisal-export-excel'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
