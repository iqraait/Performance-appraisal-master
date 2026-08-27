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

from .models import Employee, Appraisal, Branch, DepartmentAdmin
from .serializers import EmployeeSerializer, AppraisalSerializer, UserSerializer, BranchSerializer, DepartmentAdminSerializer

# Custom permissions
class IsAdminUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return request.user.is_staff or request.user.is_superuser or hasattr(request.user, 'department_admin')
        return False


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all().order_by('name')
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated and not user.is_superuser and hasattr(user, 'department_admin'):
            dept_admin = user.department_admin
            if dept_admin.branches:
                queryset = queryset.filter(name__in=dept_admin.branches)
            elif dept_admin.departments:
                emp_branches = Employee.objects.filter(
                    department__in=dept_admin.departments,
                    branch__isnull=False
                ).values_list('branch__name', flat=True).distinct()
                queryset = queryset.filter(name__in=list(emp_branches))
        return queryset


class DepartmentAdminViewSet(viewsets.ModelViewSet):
    queryset = DepartmentAdmin.objects.all().order_by('user__username')
    serializer_class = DepartmentAdminSerializer
    permission_classes = [permissions.IsAdminUser]


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        role = 'employee'
        departments = []
        locations = []
        branches = []
        if user.is_superuser:
            role = 'superuser'
            branches = list(Branch.objects.values_list('name', flat=True))
        elif hasattr(user, 'department_admin'):
            role = 'department_admin'
            departments = user.department_admin.departments
            locations = user.department_admin.locations
            branches = user.department_admin.branches
            if not branches and departments:
                emp_branches = list(Employee.objects.filter(
                    department__in=departments,
                    branch__isnull=False
                ).values_list('branch__name', flat=True).distinct())
                branches = emp_branches

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_staff': user.is_staff or user.is_superuser or hasattr(user, 'department_admin'),
            'role': role,
            'departments': departments,
            'locations': locations,
            'branches': branches,
            # Backwards compatibility fallback (first department or None)
            'department': departments[0] if departments else None
        })



class PasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not username or not current_password or not new_password:
            return Response(
                {'error': 'Username, current password, and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify current password
        if not user.check_password(current_password):
            return Response(
                {'error': 'Incorrect current password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If verification passed, reset password
        user.set_password(new_password)
        user.save()
        
        # Delete existing auth token if exists to force relogin
        Token.objects.filter(user=user).delete()

        return Response(
            {'message': 'Password has been reset successfully.'},
            status=status.HTTP_200_OK
        )


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('employee_code')
    serializer_class = EmployeeSerializer

    def get_permissions(self):
        # Allow any user to retrieve or list (needed for public appraisal form dropdowns)
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUserOrReadOnly()]

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employee Master"

        headers = ["Employee Code", "Employee Name", "Department", "Location", "Branch", "Designation", "Date of Joining", "Assignment Period", "Status"]
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
            ws.cell(row=row_num, column=5, value=obj.branch.name if obj.branch else '')
            ws.cell(row=row_num, column=6, value=obj.designation)
            ws.cell(row=row_num, column=7, value=obj.date_of_joining.strftime('%Y-%m-%d') if obj.date_of_joining else '')
            ws.cell(row=row_num, column=8, value=obj.assignment_period)
            ws.cell(row=row_num, column=9, value=obj.status)

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = "attachment; filename=employees_master.xlsx"
        wb.save(response)
        return response

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'department_admin'):
            queryset = queryset.filter(department__in=user.department_admin.departments)
            if user.department_admin.locations:
                loc_filter = Q()
                for loc in user.department_admin.locations:
                    loc_filter |= Q(location__iexact=loc)
                queryset = queryset.filter(loc_filter)
            if user.department_admin.branches:
                br_filter = Q()
                for br in user.department_admin.branches:
                    br_filter |= Q(branch__name__iexact=br)
                queryset = queryset.filter(br_filter)

        dept = self.request.query_params.get('department')
        location_param = self.request.query_params.get('location')
        branch_param = self.request.query_params.get('branch')
        desig = self.request.query_params.get('designation')
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if dept:
            queryset = queryset.filter(department__iexact=dept)
        if location_param:
            queryset = queryset.filter(location__iexact=location_param)
        if branch_param:
            queryset = queryset.filter(branch__name__iexact=branch_param)
        if desig:
            queryset = queryset.filter(designation__iexact=desig)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if search:
            queryset = queryset.filter(
                Q(employee_code__icontains=search) | 
                Q(name__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'department_admin'):
            dept = serializer.validated_data.get('department')
            loc = serializer.validated_data.get('location') or ""
            branch_obj = serializer.validated_data.get('branch')
            dept_admin = user.department_admin
            save_kwargs = {}
            
            allowed_depts = dept_admin.departments
            if allowed_depts and dept not in allowed_depts:
                save_kwargs['department'] = allowed_depts[0]
                
            allowed_locs = dept_admin.locations
            if allowed_locs:
                loc_is_allowed = any(al.lower() in loc.lower() for al in allowed_locs)
                if not loc_is_allowed:
                    save_kwargs['location'] = allowed_locs[0]

            allowed_branches = dept_admin.branches
            if allowed_branches:
                br_name = branch_obj.name if branch_obj else ""
                br_is_allowed = any(ab.lower() in br_name.lower() for ab in allowed_branches)
                if not br_is_allowed:
                    fallback_br, _ = Branch.objects.get_or_create(name=allowed_branches[0])
                    save_kwargs['branch'] = fallback_br
                
            serializer.save(**save_kwargs)
        else:
            serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'department_admin'):
            dept = serializer.validated_data.get('department')
            loc = serializer.validated_data.get('location') or ""
            branch_obj = serializer.validated_data.get('branch')
            dept_admin = user.department_admin
            save_kwargs = {}
            
            allowed_depts = dept_admin.departments
            if allowed_depts and dept not in allowed_depts:
                save_kwargs['department'] = allowed_depts[0]
                
            allowed_locs = dept_admin.locations
            if allowed_locs:
                loc_is_allowed = any(al.lower() in loc.lower() for al in allowed_locs)
                if not loc_is_allowed:
                    save_kwargs['location'] = allowed_locs[0]

            allowed_branches = dept_admin.branches
            if allowed_branches:
                br_name = branch_obj.name if branch_obj else ""
                br_is_allowed = any(ab.lower() in br_name.lower() for ab in allowed_branches)
                if not br_is_allowed:
                    fallback_br, _ = Branch.objects.get_or_create(name=allowed_branches[0])
                    save_kwargs['branch'] = fallback_br
                
            serializer.save(**save_kwargs)
        else:
            serializer.save()


class EmployeeAutoFetchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        dept_param = request.query_params.get('department')
        loc_param = request.query_params.get('location')
        branch_param = request.query_params.get('branch')
        if not code:
            return Response({"error": "Employee code is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            qs = Employee.objects.filter(employee_code=code)
            if dept_param:
                qs = qs.filter(department=dept_param)
            if loc_param:
                qs = qs.filter(location=loc_param)
            if branch_param:
                qs = qs.filter(branch__name__iexact=branch_param)
            
            if not qs.exists():
                raise Employee.DoesNotExist

            # Enforce department, location, and branch restriction for department admins
            user = request.user
            if user and user.is_authenticated and hasattr(user, 'department_admin'):
                dept_admin = user.department_admin
                
                # Check if there is any record within the admin's departments
                allowed_qs = qs.filter(department__in=dept_admin.departments)
                if not allowed_qs.exists():
                    return Response({"error": "You do not have permission to access employees outside your department."}, status=status.HTTP_403_FORBIDDEN)
                
                if dept_admin.locations:
                    loc_filtered = []
                    for emp in allowed_qs:
                        emp_loc = (emp.location or "").lower()
                        if any(al.lower() in emp_loc for al in dept_admin.locations):
                            loc_filtered.append(emp)
                    
                    if not loc_filtered:
                        return Response({"error": "You do not have permission to access employees outside your assigned duty locations."}, status=status.HTTP_403_FORBIDDEN)
                    allowed_qs = Employee.objects.filter(id__in=[e.id for e in loc_filtered])

                if dept_admin.branches:
                    br_filtered = []
                    for emp in allowed_qs:
                        emp_br = (emp.branch.name if emp.branch else "").lower()
                        if any(ab.lower() in emp_br for ab in dept_admin.branches):
                            br_filtered.append(emp)

                    if not br_filtered:
                        return Response({"error": "You do not have permission to access employees outside your assigned branches."}, status=status.HTTP_403_FORBIDDEN)
                    allowed_qs = Employee.objects.filter(id__in=[e.id for e in br_filtered])

                active_allowed = allowed_qs.filter(status='Active')
                employee = active_allowed.first() or allowed_qs.first()
            else:
                # Not a department admin (e.g. superuser), just find an active one if possible
                active_qs = qs.filter(status='Active')
                employee = active_qs.first() or qs.first()

            # Check if active
            if employee.status != 'Active':
                return Response({"error": "Employee is inactive"}, status=status.HTTP_400_BAD_REQUEST)

            serializer = EmployeeSerializer(employee)
            department = employee.department
            location = employee.location
            branch_obj = employee.branch
            
            dept_total_active = Employee.objects.filter(department=department, status='Active').count() if department else 0
            dept_existing_ab = Appraisal.objects.filter(
                department=department,
                rating__in=['Outstanding (A)', 'Very Good (B)']
            ).count() if department else 0
            
            loc_total_active = Employee.objects.filter(location=location, status='Active').count() if location else 0
            loc_existing_ab = Appraisal.objects.filter(
                location=location,
                rating__in=['Outstanding (A)', 'Very Good (B)']
            ).count() if location else 0

            branch_total_active = Employee.objects.filter(branch=branch_obj, status='Active').count() if branch_obj else 0
            branch_existing_ab = Appraisal.objects.filter(
                branch=branch_obj,
                rating__in=['Outstanding (A)', 'Very Good (B)']
            ).count() if branch_obj else 0
            
            data = serializer.data
            data['department_total_active'] = dept_total_active
            data['department_existing_ab'] = dept_existing_ab
            data['location_total_active'] = loc_total_active
            data['location_existing_ab'] = loc_existing_ab
            data['branch_total_active'] = branch_total_active
            data['branch_existing_ab'] = branch_existing_ab
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
        col_mapping = {
            'employee_code': ['employee code', 'code', 'emp code'],
            'name': ['employee name', 'name', 'emp name'],
            'department': ['department', 'dept'],
            'location': ['location', 'loc'],
            'branch': ['branch', 'brach', 'hospital branch', 'unit'],
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
            if not found and key != 'branch': # Branch column is optional, fallback if missing
                return Response({
                    "error": f"Missing required column matching: {key.replace('_', ' ').title()}. Please check headers."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Selected active branch fallback passed from frontend
        selected_branch = request.data.get('selected_branch') or request.query_params.get('branch') or 'IQRAA INTERNATIONAL HOSPITAL & RESEARCH CENTRE'

        # Process rows
        success_count = 0
        skipped_count = 0
        failed_rows = []
        imported_meta = {} # dept -> {'locations': set(), 'branches': set()}
        
        row_num = 1
        # Skip header
        rows = list(sheet.iter_rows(min_row=2, values_only=True))
        
        # Keep track of (emp_code, department, location, branch) seen in this Excel sheet
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
                branch_str = str(row_data[indices['branch']]).strip() if 'branch' in indices and row_data[indices['branch']] else ""
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

            # Fallback to selected_branch if branch_str is empty
            if not branch_str:
                branch_str = selected_branch

            # Look up or create branch object
            branch_obj = None
            if branch_str:
                branch_obj, _ = Branch.objects.get_or_create(name=branch_str)

            # Track for auto-tagging DepartmentAdmins
            if dept:
                if dept not in imported_meta:
                    imported_meta[dept] = {'locations': set(), 'branches': set()}
                if location:
                    imported_meta[dept]['locations'].add(location)
                if branch_str:
                    imported_meta[dept]['branches'].add(branch_str)

            # Skip duplicate Employee records (same employee code, department, location, branch)
            if Employee.objects.filter(employee_code=emp_code, department=dept, location=location, branch=branch_obj).exists():
                skipped_count += 1
                continue
            
            # Skip duplicates within the excel sheet itself
            sheet_key = (emp_code, dept, location, branch_str)
            if sheet_key in seen_codes_in_sheet:
                failed_rows.append({
                    "row": row_num,
                    "code": emp_code,
                    "reason": "Duplicate employee entry found inside this excel file"
                })
                continue
            
            seen_codes_in_sheet.add(sheet_key)

            try:
                # Save employee
                Employee.objects.create(
                    employee_code=emp_code,
                    name=name,
                    department=dept,
                    location=location,
                    branch=branch_obj,
                    designation=desig,
                    date_of_joining=doj,
                    assignment_period='April-2026 to June-2026',  # Default; select manually during appraisal
                    status='Active'
                )
                success_count += 1
                
                # Auto-create user login credentials for the employee
                if not User.objects.filter(username=emp_code).exists():
                    User.objects.create_user(username=emp_code, password=emp_code, is_staff=False)
            except Exception as ex:
                failed_rows.append({
                    "row": row_num,
                    "code": emp_code,
                    "reason": f"Database write error: {str(ex)}"
                })

        # Auto-tag newly imported locations & branches onto DepartmentAdmin accounts
        for dept_name, meta in imported_meta.items():
            dept_admins = DepartmentAdmin.objects.all()
            for da in dept_admins:
                if dept_name in da.departments:
                    updated = False
                    for loc in meta['locations']:
                        if loc and loc not in da.locations:
                            da.locations.append(loc)
                            updated = True
                    for br in meta['branches']:
                        if br and br not in da.branches:
                            da.branches.append(br)
                            updated = True
                    if updated:
                        da.save()

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



def get_pending_appraisal_records(user, params):
    if hasattr(user, 'department_admin'):
        dept_admin = user.department_admin
        emp_qs = Employee.objects.filter(department__in=dept_admin.departments, status='Active')
        if dept_admin.locations:
            loc_filter = Q()
            for loc in dept_admin.locations:
                loc_filter |= Q(location__iexact=loc)
            emp_qs = emp_qs.filter(loc_filter)
        if dept_admin.branches:
            br_filter = Q()
            for br in dept_admin.branches:
                br_filter |= Q(branch__name__iexact=br)
            emp_qs = emp_qs.filter(br_filter)
    else:
        emp_qs = Employee.objects.filter(status='Active')

    submitted_tuples = set(Appraisal.objects.values_list('employee_code', 'department', 'location', 'branch__name'))
    
    # Exclude employee records that already have a submitted appraisal in that specific department, location & branch
    pending_emp_ids = []
    for emp in emp_qs:
        emp_br_name = emp.branch.name if emp.branch else ''
        tup = (emp.employee_code, emp.department, emp.location, emp_br_name)
        if tup not in submitted_tuples:
            pending_emp_ids.append(emp.id)

    emp_qs = emp_qs.filter(id__in=pending_emp_ids)

    dept = params.get('department')
    location_param = params.get('location')
    branch_param = params.get('branch')
    desig = params.get('designation')
    period = params.get('assignment_period')
    name = params.get('name')
    code = params.get('code')
    employee_code = params.get('employee_code')
    search = params.get('search')

    if dept:
        emp_qs = emp_qs.filter(department__iexact=dept)
    if location_param:
        emp_qs = emp_qs.filter(location__iexact=location_param)
    if branch_param:
        emp_qs = emp_qs.filter(branch__name__iexact=branch_param)
    if desig:
        emp_qs = emp_qs.filter(designation__iexact=desig)
    if period:
        emp_qs = emp_qs.filter(assignment_period=period)
    if name:
        emp_qs = emp_qs.filter(name__icontains=name)
    if employee_code:
        emp_qs = emp_qs.filter(employee_code=employee_code)
    elif code:
        emp_qs = emp_qs.filter(employee_code__icontains=code)
    if search:
        emp_qs = emp_qs.filter(
            Q(employee_code__icontains=search) | 
            Q(name__icontains=search)
        )

    pending_list = []
    for emp in emp_qs.order_by('employee_code'):
        pending_list.append({
            'id': f"pending_{emp.employee_code}_{emp.id}",
            'employee_code': emp.employee_code,
            'employee_name': emp.name,
            'department': emp.department,
            'location': emp.location or '',
            'branch': emp.branch.name if emp.branch else '',
            'designation': emp.designation,
            'date_of_joining': emp.date_of_joining.strftime('%Y-%m-%d') if emp.date_of_joining else '',
            'assignment_period': emp.assignment_period or '',
            'job_competence': 0,
            'productivity_responsibility': 0,
            'communication_teamwork': 0,
            'professionalism_discipline': 0,
            'initiative_improvement': 0,
            'performance_score': 0,
            'total_deduction': 0,
            'final_score': 0,
            'rating': 'Pending',
            'submitted_date': None,
            'submitted_by': None,
            'submitted_by_detail': None,
            'status': 'Pending',
            'is_pending': True
        })
    return pending_list


class AppraisalViewSet(viewsets.ModelViewSet):
    queryset = Appraisal.objects.all().order_by('-submitted_date')
    serializer_class = AppraisalSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'list', 'retrieve', 'approve']:
            return [permissions.AllowAny()]
        return [IsAdminUserOrReadOnly()]

    def list(self, request, *args, **kwargs):
        status_param = request.query_params.get('status', '').lower()
        if status_param == 'pending':
            records = get_pending_appraisal_records(request.user, request.query_params)
            return Response(records)
        elif status_param == 'all':
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            submitted_data = serializer.data
            pending_records = get_pending_appraisal_records(request.user, request.query_params)
            return Response(submitted_data + pending_records)
        else:
            return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        is_admin = user and user.is_authenticated and (user.is_staff or user.is_superuser or hasattr(user, 'department_admin'))
        
        code_param = self.request.query_params.get('employee_code')

        if not is_admin:
            if code_param:
                queryset = queryset.filter(employee_code=code_param)
            elif self.kwargs.get('pk'):
                if user and user.is_authenticated:
                    queryset = queryset.filter(employee_code=user.username)
            else:
                queryset = queryset.none()
        else:
            # Check if user is a department_admin
            if hasattr(user, 'department_admin'):
                queryset = queryset.filter(department__in=user.department_admin.departments)
                if user.department_admin.locations:
                    loc_filter = Q()
                    for loc in user.department_admin.locations:
                        loc_filter |= Q(location__iexact=loc)
                    queryset = queryset.filter(loc_filter)
                if user.department_admin.branches:
                    br_filter = Q()
                    for br in user.department_admin.branches:
                        br_filter |= Q(branch__name__iexact=br)
                    queryset = queryset.filter(br_filter)

            # Query Filters
            dept = self.request.query_params.get('department')
            location_param = self.request.query_params.get('location')
            branch_param = self.request.query_params.get('branch')
            desig = self.request.query_params.get('designation')
            period = self.request.query_params.get('assignment_period')
            rating = self.request.query_params.get('rating')
            name = self.request.query_params.get('name')
            code = self.request.query_params.get('code')
            employee_code = self.request.query_params.get('employee_code')
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            search = self.request.query_params.get('search')

            if dept:
                queryset = queryset.filter(department__iexact=dept)
            if location_param:
                queryset = queryset.filter(location__iexact=location_param)
            if branch_param:
                queryset = queryset.filter(branch__name__iexact=branch_param)
            if desig:
                queryset = queryset.filter(designation__iexact=desig)
            if period:
                queryset = queryset.filter(assignment_period=period)
            if rating:
                queryset = queryset.filter(rating__icontains=rating)
            if name:
                queryset = queryset.filter(employee_name__icontains=name)
            if employee_code:
                queryset = queryset.filter(employee_code=employee_code)
            elif code:
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
        status_param = request.query_params.get('status', '').lower()

        rows_to_export = []

        if status_param != 'pending':
            view = AppraisalViewSet()
            view.request = request
            queryset = view.get_queryset()
            for obj in queryset:
                rows_to_export.append({
                    'code': obj.employee_code,
                    'name': obj.employee_name,
                    'dept': obj.department,
                    'loc': obj.location,
                    'branch': obj.branch.name if obj.branch else '',
                    'desig': obj.designation,
                    'doj': obj.date_of_joining.strftime('%Y-%m-%d') if obj.date_of_joining else '',
                    'period': obj.assignment_period,
                    'perf_score': obj.performance_score,
                    'deduction': obj.total_deduction,
                    'final_score': obj.final_score,
                    'rating': obj.rating,
                    'date': obj.submitted_date.strftime('%Y-%m-%d %H:%M') if obj.submitted_date else '',
                    'by': obj.submitted_by.username if obj.submitted_by else '-'
                })

        if status_param in ['pending', 'all']:
            pending_records = get_pending_appraisal_records(request.user, request.query_params)
            for rec in pending_records:
                rows_to_export.append({
                    'code': rec['employee_code'],
                    'name': rec['employee_name'],
                    'dept': rec['department'],
                    'loc': rec['location'],
                    'branch': rec.get('branch', ''),
                    'desig': rec['designation'],
                    'doj': rec['date_of_joining'],
                    'period': rec['assignment_period'],
                    'perf_score': '-',
                    'deduction': '-',
                    'final_score': '-',
                    'rating': 'Pending',
                    'date': '-',
                    'by': '-'
                })

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Appraisal Reports"

        headers = [
            "Employee Code", "Employee Name", "Department", "Location", "Branch", "Designation", 
            "Date of Joining", "Assignment Period", "Performance Score", 
            "Deduction Score", "Final Score", "Rating", "Submitted Date", "Done By (Admin)"
        ]
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
            cell.fill = openpyxl.styles.PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
            cell.alignment = openpyxl.styles.Alignment(horizontal="center")

        for row_num, item in enumerate(rows_to_export, 2):
            ws.cell(row=row_num, column=1, value=item['code'])
            ws.cell(row=row_num, column=2, value=item['name'])
            ws.cell(row=row_num, column=3, value=item['dept'])
            ws.cell(row=row_num, column=4, value=item['loc'])
            ws.cell(row=row_num, column=5, value=item['branch'])
            ws.cell(row=row_num, column=6, value=item['desig'])
            ws.cell(row=row_num, column=7, value=item['doj'])
            ws.cell(row=row_num, column=8, value=item['period'])
            ws.cell(row=row_num, column=9, value=item['perf_score'])
            ws.cell(row=row_num, column=10, value=item['deduction'])
            ws.cell(row=row_num, column=11, value=item['final_score'])
            ws.cell(row=row_num, column=12, value=item['rating'])
            ws.cell(row=row_num, column=13, value=item['date'])
            ws.cell(row=row_num, column=14, value=item['by'])

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
        user = request.user
        branch_param = request.query_params.get('branch')
        
        # Determine filtering
        if hasattr(user, 'department_admin'):
            dept_admin = user.department_admin
            employees = Employee.objects.filter(department__in=dept_admin.departments)
            appraisals = Appraisal.objects.filter(department__in=dept_admin.departments)
            if dept_admin.locations:
                loc_filter = Q()
                for loc in dept_admin.locations:
                    loc_filter |= Q(location__iexact=loc)
                employees = employees.filter(loc_filter)
                appraisals = appraisals.filter(loc_filter)
            if dept_admin.branches:
                br_filter = Q()
                for br in dept_admin.branches:
                    br_filter |= Q(branch__name__iexact=br)
                employees = employees.filter(br_filter)
                appraisals = appraisals.filter(br_filter)
        else:
            employees = Employee.objects.all()
            appraisals = Appraisal.objects.all()

        if branch_param:
            employees = employees.filter(branch__name__iexact=branch_param)
            appraisals = appraisals.filter(branch__name__iexact=branch_param)

        total_employees = employees.count()
        total_appraisals = appraisals.count()
        
        # Pending appraisals = Active Employees in this subset who have not submitted any appraisal
        submitted_codes = appraisals.values_list('employee_code', flat=True).distinct()
        pending_employees_qs = employees.filter(status='Active').exclude(employee_code__in=submitted_codes).order_by('employee_code')
        pending_appraisals = pending_employees_qs.count()
        pending_list = [
            {
                'employee_code': emp.employee_code,
                'name': emp.name,
                'department': emp.department,
                'designation': emp.designation,
                'location': emp.location,
                'branch': emp.branch.name if emp.branch else ''
            }
            for emp in pending_employees_qs
        ]

        # Rating counters
        ratings = appraisals.values('rating').annotate(count=Count('id'))
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
        dept_stats_qs = appraisals.values('department').annotate(
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
        rating_stats_qs = appraisals.values('rating').annotate(
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
            'rating_stats': rating_stats,
            'pending_list': pending_list
        }, status=status.HTTP_200_OK)

