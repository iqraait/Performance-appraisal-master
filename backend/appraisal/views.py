import openpyxl
import datetime
from django.shortcuts import render
from django.http import HttpResponse
from django.db.models import Count, Avg, Q
from django.contrib.auth.models import User
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken

from .models import Employee, Appraisal
from .serializers import EmployeeSerializer, AppraisalSerializer, UserSerializer

# Custom permissions
class IsAdminUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return request.user.is_staff or request.user.is_superuser
        return False

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_staff': user.is_staff or user.is_superuser
        })


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('employee_code')
    serializer_class = EmployeeSerializer

    def get_permissions(self):
        # Allow authenticated users to retrieve (needed for auto-fill in staff view), but modify is admin only
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserOrReadOnly()]

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employee Master"

        headers = ["Employee Code", "Employee Name", "Department", "Location", "Designation", "Date of Joining", "Assignment Period", "Status"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
            cell.alignment = openpyxl.styles.Alignment(horizontal="center")

        for row_num, obj in enumerate(queryset, 2):
            ws.cell(row=row_num, column=1, value=obj.employee_code)
            ws.cell(row=row_num, column=2, value=obj.name)
            ws.cell(row=row_num, column=3, value=obj.department)
            ws.cell(row=row_num, column=4, value=obj.location)
            ws.cell(row=row_num, column=5, value=obj.designation)
            ws.cell(row=row_num, column=6, value=obj.date_of_joining.strftime('%Y-%m-%d') if obj.date_of_joining else '')
            ws.cell(row=row_num, column=7, value=obj.assignment_period)
            ws.cell(row=row_num, column=8, value=obj.status)

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = "attachment; filename=employees_master.xlsx"
        wb.save(response)
        return response

    def get_queryset(self):
        queryset = super().get_queryset()
        dept = self.request.query_params.get('department')
        location_param = self.request.query_params.get('location')
        desig = self.request.query_params.get('designation')
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if dept:
            queryset = queryset.filter(department__icontains=dept)
        if location_param:
            queryset = queryset.filter(location__icontains=location_param)
        if desig:
            queryset = queryset.filter(designation__icontains=desig)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if search:
            queryset = queryset.filter(
                Q(employee_code__icontains=search) | 
                Q(name__icontains=search)
            )
        return queryset


class EmployeeAutoFetchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({"error": "Employee code is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            employee = Employee.objects.get(employee_code=code)
            # Check if active
            if employee.status != 'Active':
                return Response({"error": "Employee is inactive"}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = EmployeeSerializer(employee)
            location = employee.location
            total_active = Employee.objects.filter(location=location, status='Active').count() if location else 0
            existing_ab = Appraisal.objects.filter(
                location=location,
                rating__in=['Outstanding (A)', 'Very Good (B)']
            ).count() if location else 0
            
            data = serializer.data
            data['location_total_active'] = total_active
            data['location_existing_ab'] = existing_ab
            return Response(data)
        except Employee.DoesNotExist:
            return Response({"error": f"Employee with code '{code}' not found in master database."}, status=status.HTTP_404_NOT_FOUND)


class ExcelImportView(APIView):
    permission_classes = [IsAdminUserOrReadOnly]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        excel_file = request.FILES['file']
        try:
            wb = openpyxl.load_workbook(excel_file, read_only=True, data_only=True)
            sheet = wb.active
        except Exception as e:
            return Response({"error": f"Invalid excel file format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Parse header row
        headers = []
        for cell in next(sheet.iter_rows(min_row=1, max_row=1, values_only=True)):
            if cell:
                headers.append(str(cell).strip().lower())
            else:
                headers.append("")

        # Map expected headers to indexes
        # Expected: Employee Code, Employee Name, Department / Location, Designation, Date of Joining
        col_mapping = {
            'employee_code': ['employee code', 'code', 'emp code'],
            'name': ['employee name', 'name', 'emp name'],
            'department': ['department', 'dept'],
            'location': ['location', 'loc'],
            'designation': ['designation', 'desig', 'role'],
            'date_of_joining': ['date of joining', 'joining date', 'doj']
        }

        indices = {}
        for key, aliases in col_mapping.items():
            found = False
            for alias in aliases:
                if alias in headers:
                    indices[key] = headers.index(alias)
                    found = True
                    break
            if not found:
                # Fallback: substring matching
                for i, h in enumerate(headers):
                    if any(a in h for a in aliases):
                        indices[key] = i
                        found = True
                        break
            if not found:
                return Response({
                    "error": f"Missing required column matching: {key.replace('_', ' ').title()}. Please check headers."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Process rows
        success_count = 0
        skipped_count = 0
        failed_rows = []
        
        row_num = 1
        # Skip header
        rows = list(sheet.iter_rows(min_row=2, values_only=True))
        
        # Keep track of codes seen in this Excel sheet to prevent self-duplicates
        seen_codes_in_sheet = set()

        for row_data in rows:
            row_num += 1
            # Skip completely empty rows
            if not any(row_data):
                continue
            
            try:
                emp_code = str(row_data[indices['employee_code']]).strip() if row_data[indices['employee_code']] else ""
                name = str(row_data[indices['name']]).strip() if row_data[indices['name']] else ""
                dept = str(row_data[indices['department']]).strip() if row_data[indices['department']] else ""
                location = str(row_data[indices['location']]).strip() if row_data[indices['location']] else ""
                desig = str(row_data[indices['designation']]).strip() if row_data[indices['designation']] else ""
                doj_raw = row_data[indices['date_of_joining']]
            except IndexError:
                failed_rows.append({
                    "row": row_num,
                    "code": "",
                    "reason": "Missing cell values matching header layout"
                })
                continue

            if not emp_code or not name:
                failed_rows.append({
                    "row": row_num,
                    "code": emp_code,
                    "reason": "Employee Code and Name cannot be empty"
                })
                continue

            # Validate Date of Joining
            doj = None
            if isinstance(doj_raw, (datetime.date, datetime.datetime)):
                doj = doj_raw.date() if isinstance(doj_raw, datetime.datetime) else doj_raw
            elif isinstance(doj_raw, str):
                date_str = doj_raw.strip()
                for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
                    try:
                        doj = datetime.datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
            
            if not doj:
                failed_rows.append({
                    "row": row_num,
                    "code": emp_code,
                    "reason": f"Invalid date of joining format: '{doj_raw}'"
                })
                continue

            # Skip duplicate Employee Codes (already in system)
            if Employee.objects.filter(employee_code=emp_code).exists():
                skipped_count += 1
                continue
            
            # Skip duplicates within the excel sheet itself
            if emp_code in seen_codes_in_sheet:
                failed_rows.append({
                    "row": row_num,
                    "code": emp_code,
                    "reason": "Duplicate employee code found inside this excel file"
                })
                continue
            
            seen_codes_in_sheet.add(emp_code)

            try:
                # Save employee
                Employee.objects.create(
                    employee_code=emp_code,
                    name=name,
                    department=dept,
                    location=location,
                    designation=desig,
                    date_of_joining=doj,
                    assignment_period='Annual',  # Default; select manually during appraisal
                    status='Active'
                )
                success_count += 1
                
                # Auto-create user login credentials for the employee:
                # Username = employee_code, Password = staffpass, group = Staff
                if not User.objects.filter(username=emp_code).exists():
                    User.objects.create_user(username=emp_code, password=emp_code, is_staff=False)
            except Exception as ex:
                failed_rows.append({
                    "row": row_num,
                    "code": emp_code,
                    "reason": f"Database write error: {str(ex)}"
                })

        summary = {
            "total_processed": len(rows),
            "successfully_imported": success_count,
            "skipped_duplicates": skipped_count,
            "failed": len(failed_rows)
        }

        return Response({
            "summary": summary,
            "failed_rows": failed_rows
        }, status=status.HTTP_200_OK if len(failed_rows) == 0 else status.HTTP_207_MULTI_STATUS)


class AppraisalViewSet(viewsets.ModelViewSet):
    queryset = Appraisal.objects.all().order_by('-submitted_date')
    serializer_class = AppraisalSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'list', 'retrieve', 'approve']:
            return [permissions.AllowAny()]
        return [IsAdminUserOrReadOnly()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        is_admin = user and user.is_authenticated and (user.is_staff or user.is_superuser)
        
        code_param = self.request.query_params.get('employee_code')

        if not is_admin:
            if code_param:
                queryset = queryset.filter(employee_code=code_param)
            else:
                queryset = queryset.none()
        else:
            # Query Filters
            dept = self.request.query_params.get('department')
            location_param = self.request.query_params.get('location')
            desig = self.request.query_params.get('designation')
            period = self.request.query_params.get('assignment_period')
            rating = self.request.query_params.get('rating')
            name = self.request.query_params.get('name')
            code = self.request.query_params.get('code')
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            search = self.request.query_params.get('search')

            if dept:
                queryset = queryset.filter(department__icontains=dept)
            if location_param:
                queryset = queryset.filter(location__icontains=location_param)
            if desig:
                queryset = queryset.filter(designation__icontains=desig)
            if period:
                queryset = queryset.filter(assignment_period=period)
            if rating:
                queryset = queryset.filter(rating__icontains=rating)
            if name:
                queryset = queryset.filter(employee_name__icontains=name)
            if code:
                queryset = queryset.filter(employee_code__icontains=code)
            if start_date:
                queryset = queryset.filter(submitted_date__date__gte=start_date)
            if end_date:
                queryset = queryset.filter(submitted_date__date__lte=end_date)
            if search:
                queryset = queryset.filter(
                    Q(employee_code__icontains=search) | 
                    Q(employee_name__icontains=search)
                )

        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(submitted_by=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status == 'Approved':
            raise permissions.exceptions.PermissionDenied("Approved appraisals cannot be modified.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        appraisal = self.get_object()
        if appraisal.status == 'Approved':
            return Response({"detail": "Appraisal is already approved."}, status=status.HTTP_400_BAD_REQUEST)
        appraisal.status = 'Approved'
        appraisal.save()
        return Response({"status": "Appraisal approved successfully."})


class ExcelExportView(APIView):
    permission_classes = [IsAdminUserOrReadOnly]

    def get(self, request):
        # Instantiate AppraisalViewSet to reuse filter logic
        view = AppraisalViewSet()
        view.request = request
        queryset = view.get_queryset()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Appraisal Reports"

        # Headers
        headers = [
            "Employee Code", "Employee Name", "Department", "Location", "Designation", 
            "Date of Joining", "Assignment Period", "Performance Score", 
            "Deduction Score", "Final Score", "Rating", "Submitted Date"
        ]
        
        # Style headers
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
            cell.alignment = openpyxl.styles.Alignment(horizontal="center")

        # Fill data
        for row_num, obj in enumerate(queryset, 2):
            ws.cell(row=row_num, column=1, value=obj.employee_code)
            ws.cell(row=row_num, column=2, value=obj.employee_name)
            ws.cell(row=row_num, column=3, value=obj.department)
            ws.cell(row=row_num, column=4, value=obj.location)
            ws.cell(row=row_num, column=5, value=obj.designation)
            ws.cell(row=row_num, column=6, value=obj.date_of_joining.strftime('%Y-%m-%d') if obj.date_of_joining else '')
            ws.cell(row=row_num, column=7, value=obj.assignment_period)
            ws.cell(row=row_num, column=8, value=obj.performance_score)
            ws.cell(row=row_num, column=9, value=obj.total_deduction)
            ws.cell(row=row_num, column=10, value=obj.final_score)
            ws.cell(row=row_num, column=11, value=obj.rating)
            ws.cell(row=row_num, column=12, value=obj.submitted_date.strftime('%Y-%m-%d %H:%M') if obj.submitted_date else '')

        # Adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = "attachment; filename=appraisal_reports.xlsx"
        wb.save(response)
        return response


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUserOrReadOnly]

    def get(self, request):
        total_employees = Employee.objects.count()
        total_appraisals = Appraisal.objects.count()
        
        # Pending appraisals = Active Employees who have not submitted any appraisal
        submitted_codes = Appraisal.objects.values_list('employee_code', flat=True).distinct()
        pending_appraisals = Employee.objects.filter(status='Active').exclude(employee_code__in=submitted_codes).count()

        # Rating counters
        ratings = Appraisal.objects.values('rating').annotate(count=Count('id'))
        rating_counts = {
            'A': 0,
            'B': 0,
            'C': 0,
            'D': 0,
            'E': 0
        }

        for r in ratings:
            r_str = r['rating']
            if 'Outstanding (A)' in r_str:
                rating_counts['A'] = r['count']
            elif 'Very Good (B)' in r_str:
                rating_counts['B'] = r['count']
            elif 'Good (C)' in r_str:
                rating_counts['C'] = r['count']
            elif 'Needs Improvement (D)' in r_str:
                rating_counts['D'] = r['count']
            elif 'Unsatisfactory (E)' in r_str:
                rating_counts['E'] = r['count']

        # Department wise appraisal count and average final score
        dept_stats_qs = Appraisal.objects.values('department').annotate(
            submitted=Count('id'),
            avg_score=Avg('final_score')
        )
        
        department_stats = []
        for ds in dept_stats_qs:
            department_stats.append({
                'department': ds['department'],
                'submitted': ds['submitted'],
                'avg_score': round(ds['avg_score'] or 0, 1)
            })

        # Rating distribution with exact count
        rating_stats_qs = Appraisal.objects.values('rating').annotate(
            count=Count('id')
        )
        rating_stats = []
        for rs in rating_stats_qs:
            rating_stats.append({
                'rating': rs['rating'],
                'count': rs['count']
            })

        return Response({
            'total_employees': total_employees,
            'total_appraisals': total_appraisals,
            'pending_appraisals': pending_appraisals,
            'ratings': rating_counts,
            'department_stats': department_stats,
            'rating_stats': rating_stats
        }, status=status.HTTP_200_OK)
