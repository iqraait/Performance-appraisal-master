import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Share2,
  UserCheck,
  RotateCcw,
  Archive,
  Trash,
  Eye,
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  User
} from 'lucide-react';

const copyTextToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy using navigator.clipboard: ', err);
    }
  }

  // Fallback to document.execCommand('copy')
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed: ', err);
    document.body.removeChild(textArea);
    return false;
  }
};

export default function EmployeeMaster({ token, user, selectedBranch }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [desigFilter, setDesigFilter] = useState('');
  const [divFilter, setDivFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('active');
  const [incentivePeriods, setIncentivePeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  
  // Trash View states
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'trash'
  const [trashCount, setTrashCount] = useState(0);

  // Employee & Department Details View Modal states
  const navigate = useNavigate();
  const [detailsEmp, setDetailsEmp] = useState(null);
  const [empAppraisals, setEmpAppraisals] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getScoreTierInfo = (score) => {
    const s = Number(score) || 0;
    if (s >= 2.70) return { label: '2.70 – 3.00 (Tier 1)', pct: '90% – 100%', color: '#00b87c', bg: '#ecfdf5', border: '#a7f3d0' };
    if (s >= 2.25) return { label: '2.25 – 2.69 (Tier 2)', pct: '75% – 89%', color: '#0066ff', bg: '#eff6ff', border: '#bfdbfe' };
    if (s >= 1.80) return { label: '1.80 – 2.24 (Tier 3)', pct: '60% – 74%', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' };
    if (s >= 1.50) return { label: '1.50 – 1.79 (Tier 4)', pct: '50% – 59%', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' };
    return { label: '< 1.50 (Tier 5)', pct: 'Below 50%', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
  };

  const handleOpenDetails = async (emp) => {
    setDetailsEmp(emp);
    setLoadingDetails(true);
    setEmpAppraisals([]);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/appraisals/?employee_code=${encodeURIComponent(emp.employee_code)}&all_periods=true`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data) ? [...data].sort((a, b) => new Date(b.submitted_date || 0) - new Date(a.submitted_date || 0)) : [];
        setEmpAppraisals(sorted);
      }
    } catch (e) {
      console.error('Error fetching appraisal history for employee:', e);
    } finally {
      setLoadingDetails(false);
    }
  };
  
  // Default hospital departments fallback
  const DEFAULT_HOSPITAL_DEPTS = [
    'ACADEMY', 'BIOMEDICAL', 'BLOOD CENTRE', 'CARDIOLOGY', 'CENTRAL STERILE SUPPLY',
    'CLINICAL LABORATORY SERVICES', 'CLINICAL NUTRITION', 'DENTAL', 'EMERGENCY MEDICINE',
    'F&B SERVICES', 'F&B SERVICES A', 'FINANCE & ACCOUNTS', 'FOOD & BEVERAGE',
    'FRONT OFFICE', 'GASTROENTEROLOGY', 'GENERAL ADMIN', 'HOUSEKEEPING', 'HUMAN RESOURCE',
    'I.T', 'ICRD', 'INTERNAL MEDICINE', 'MAINTENANCE', 'MANAGEMENT', 'MARKETING',
    'MEDICAL ADMINISTRATION', 'MEDICAL RECORDS', 'NEONATOLOGY', 'NEPHROLOGY', 'NEUROLOGY',
    'NEUROSURGERY', 'NURSING', 'OBSTETRICS & GYNAECOLOGY', 'ONCOLOGY', 'OPHTHALMOLOGY',
    'ORTHOPAEDICS', 'PAEDIATRICS', 'PATHOLOGY', 'PHARMACY', 'PHYSIOTHERAPY',
    'PLASTIC SURGERY', 'PULMONOLOGY', 'QUALITY', 'RADIOLOGY', 'SECURITY',
    'SOCIAL WORK', 'STORE', 'SURGERY', 'TRANSPORT', 'UROLOGY'
  ];

  // Available departments/locations/designations/divisions/levels for filter dropdowns
  const [depts, setDepts] = useState(DEFAULT_HOSPITAL_DEPTS);
  const [locs, setLocs] = useState([]);
  const [desigs, setDesigs] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [deptLocationsMap, setDeptLocationsMap] = useState({});
  const [organizations, setOrganizations] = useState([
    'IQRAA INTERNATIONAL HOSPITAL & RESEARCH CENTRE',
    'IQRAA HOSPITAL',
    'IQRAA COMMUNITY HOSPITAL -VAZHAKKAD',
    'RAHMA IQRAA COMMUNITY HOSPITAL-THOTTILPALAM',
    'MSS IQRAA COMMUNITY CLINIC- CHAKKUMKADAVU',
    'IQRAA HOSPITAL-SULTHAN BATHERY',
    'MSS IQRAA MEDICAL CENTRE-ADIMALI',
    'MEERA IQRAA SPECIALITY CLINIC-SULTHAN BATHERY',
    'IQRAA COMMUNITY CLINIC-KINASSERY',
    'IQRAA COMMUNITY CLINIC-PALAZHI',
    'IQRAA SPECIALITY CLINICS - ADDRESS MALL',
    'IQRAA COMMUNITY CLINIC-KODUVALLY',
    'IQRAA MATERNITY HOSPITAL - VAZHAKKAD',
    'IQRAA CENTRE FOR RESEARCH AND DEVELOPMENT',
    'IIM K - DISPENSARY'
  ]);

  // Modals state

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Active editing employee
  const [activeEmployee, setActiveEmployee] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    organization: selectedBranch || 'IQRAA INTERNATIONAL HOSPITAL & RESEARCH CENTRE',
    division: '',
    category: '',
    department: '',
    location: '',
    branch: selectedBranch || '',
    designation: '',
    level: '',
    date_of_joining: '',
    incentive_period: '',
    assignment_period: '',
    status: 'Active'
  });
  const [extraLocations, setExtraLocations] = useState([]);
  const [extraDepartments, setExtraDepartments] = useState([]);

  // Excel Import states
  const [excelFile, setExcelFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [failedRows, setFailedRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  // Department Admin Management Modal State
  const [isDeptAdminModalOpen, setIsDeptAdminModalOpen] = useState(false);
  const [deptAdmins, setDeptAdmins] = useState([]);
  const [deptAdminForm, setDeptAdminForm] = useState({
    username: '',
    password: '',
    email: '',
    departments: '',
    locations: '',
    branches: '',
    whatsapp_number: '',
    editingId: null
  });

  const fetchDeptAdmins = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/department-admins/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeptAdmins(data);
      }
    } catch (err) {}
  };

  const handleSaveDeptAdmin = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: deptAdminForm.username,
        email: deptAdminForm.email.trim(),
        departments: deptAdminForm.departments ? deptAdminForm.departments.split(',').map(s => s.trim()).filter(Boolean) : [],
        locations: deptAdminForm.locations ? deptAdminForm.locations.split(',').map(s => s.trim()).filter(Boolean) : [],
        branches: deptAdminForm.branches ? deptAdminForm.branches.split(',').map(s => s.trim()).filter(Boolean) : [],
        whatsapp_number: deptAdminForm.whatsapp_number.trim()
      };
      if (deptAdminForm.password) {
        payload.password = deptAdminForm.password;
      }

      const isEdit = !!deptAdminForm.editingId;
      const url = isEdit 
        ? `http://${window.location.hostname}:8000/api/department-admins/${deptAdminForm.editingId}/`
        : `http://${window.location.hostname}:8000/api/department-admins/`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast(isEdit ? 'Department Admin updated successfully!' : 'Department Admin saved successfully!');
        setDeptAdminForm({ username: '', password: '', email: '', departments: '', locations: '', branches: '', whatsapp_number: '', editingId: null });
        fetchDeptAdmins();
      } else {
        const errData = await res.json();
        triggerToast(`Failed to save admin: ${JSON.stringify(errData)}`, 'error');
      }
    } catch (err) {
      triggerToast('Error saving department admin', 'error');
    }
  };

  const handleEditDeptAdmin = (da) => {
    setDeptAdminForm({
      username: da.user_detail?.username || da.username || '',
      password: '',
      email: da.email || da.user_detail?.email || '',
      departments: da.departments ? da.departments.join(', ') : '',
      locations: da.locations ? da.locations.join(', ') : '',
      branches: da.branches ? da.branches.join(', ') : '',
      whatsapp_number: da.whatsapp_number || '',
      editingId: da.id
    });
  };

  // Alerts toast state
  const [toast, setToast] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTrashCount = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/employees/?trashed=true&branch=${encodeURIComponent(selectedBranch || '')}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrashCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let url = `http://${window.location.hostname}:8000/api/employees/?search=${encodeURIComponent(search.trim())}&department=${encodeURIComponent(deptFilter)}&location=${encodeURIComponent(locFilter)}&designation=${encodeURIComponent(desigFilter)}&status=${encodeURIComponent(statusFilter)}&branch=${encodeURIComponent(selectedBranch || '')}`;
      if (viewMode === 'trash') {
        url += `&trashed=true`;
      } else {
        url += `&trashed=false`;
      }
      if (periodFilter && periodFilter !== 'all') {
        url += `&period=${periodFilter}`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        
        // Populate filter options from employees (never wipe out depts/locs with empty arrays)
        const uniqueDepts = [...new Set(data.flatMap(e => (e.department || '').split(',').map(s => s.trim())))].filter(Boolean).sort();
        const uniqueLocs = [...new Set(data.flatMap(e => (e.location || '').split(',').map(s => s.trim())))].filter(Boolean).sort();
        const uniqueDesigs = [...new Set(data.map(e => e.designation))].filter(Boolean).sort();
        const uniqueDivs = [...new Set(data.map(e => e.division))].filter(Boolean).sort();
        const uniqueLvls = [...new Set(data.map(e => e.level))].filter(Boolean).sort();
        const uniqueOrgs = [...new Set(data.map(e => e.organization))].filter(Boolean).sort();

        if (uniqueDepts.length > 0) {
          setDepts(prev => prev.length === 0 ? uniqueDepts : [...new Set([...prev, ...uniqueDepts])].sort());
        }
        if (uniqueLocs.length > 0) {
          setLocs(prev => prev.length === 0 ? uniqueLocs : [...new Set([...prev, ...uniqueLocs])].sort());
        }
        if (uniqueDesigs.length > 0) {
          setDesigs(prev => prev.length === 0 ? uniqueDesigs : [...new Set([...prev, ...uniqueDesigs])].sort());
        }
        if (uniqueDivs.length > 0) {
          setDivisions(prev => prev.length === 0 ? uniqueDivs : [...new Set([...prev, ...uniqueDivs])].sort());
        }
        if (uniqueLvls.length > 0) {
          setLevels(prev => prev.length === 0 ? uniqueLvls : [...new Set([...prev, ...uniqueLvls])].sort());
        }
        if (uniqueOrgs.length > 0) {
          setOrganizations(prev => [...new Set([...prev, ...uniqueOrgs])].sort());
        }
      }
    } catch (err) {
      triggerToast('Error fetching employees from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchTrashCount();
  }, [search, deptFilter, locFilter, desigFilter, statusFilter, selectedBranch, periodFilter, viewMode]);

  // Load incentive periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/periods/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIncentivePeriods(data);
          const act = data.find(p => p.is_active);
          if (act) {
            setActivePeriod(act);
            setFormData(prev => ({
              ...prev,
              assignment_period: (!prev.assignment_period || prev.assignment_period === 'April-2026 to June-2026') ? act.name : prev.assignment_period,
              incentive_period: prev.incentive_period || act.id
            }));
          } else if (data.length > 0) {
            setFormData(prev => ({
              ...prev,
              assignment_period: prev.assignment_period || data[0].name,
              incentive_period: prev.incentive_period || data[0].id
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load incentive periods", err);
      }
    };
    if (token) fetchPeriods();
  }, [token]);

  // Load departments, locations, and organizations from DB metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/meta/departments-locations/`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data.departments && data.departments.length > 0) {
            setDepts(data.departments);
          }
          if (data.locations && data.locations.length > 0) {
            setLocs(data.locations);
          }
          if (data.department_locations) {
            setDeptLocationsMap(data.department_locations);
          }
          if (data.organizations && data.organizations.length > 0) {
            setOrganizations(data.organizations);
          }
        }
      } catch (err) {
        console.error("Failed to load departments and locations", err);
      }
    };
    fetchMeta();
  }, [token]);


  const handleExportEmployees = () => {
    let exportUrl = `http://${window.location.hostname}:8000/api/employees/export-excel/?search=${search}&department=${deptFilter}&location=${locFilter}&designation=${desigFilter}&status=${statusFilter}&branch=${encodeURIComponent(selectedBranch || '')}`;
    if (periodFilter && periodFilter !== 'all') {
      exportUrl += `&period=${periodFilter}`;
    }
    triggerToast('Preparing Excel export...');
    fetch(exportUrl, {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_master_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerToast('Employee list exported successfully!');
    })
    .catch(err => triggerToast('Failed to export employee master', 'error'));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const combinedDept = [formData.department, ...extraDepartments]
        .map(d => (d || '').trim())
        .filter(Boolean);
      const finalDepartment = [...new Set(combinedDept)].join(', ');

      const combinedLoc = [formData.location, ...extraLocations]
        .map(l => (l || '').trim())
        .filter(Boolean);
      const finalLocation = [...new Set(combinedLoc)].join(', ');
      const payload = { ...formData, department: finalDepartment, location: finalLocation };

      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        triggerToast('Employee added successfully!');
        setIsAddModalOpen(false);
        resetForm();
        fetchEmployees();
      } else {
        const errors = await response.json();
        const errKey = Object.keys(errors)[0];
        const val = errors[errKey];
        const msg = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        triggerToast(`Save Failed: ${errKey ? `${errKey} - ${msg}` : 'Could not add employee'}`, 'error');
      }
    } catch (err) {
      triggerToast('Network error while adding employee', 'error');
    }
  };

  const handleEditClick = (emp) => {
    setActiveEmployee(emp);
    let matchedPeriodId = emp.incentive_period || (emp.incentive_period_id || '');
    if (!matchedPeriodId && emp.assignment_period) {
      const found = incentivePeriods.find(p => 
        p.name.toLowerCase() === emp.assignment_period.toLowerCase() ||
        (p.months && p.months.toLowerCase() === emp.assignment_period.toLowerCase())
      );
      if (found) matchedPeriodId = found.id;
    }
    const deptParts = (emp.department || '').split(',').map(s => s.trim()).filter(Boolean);
    const primaryDept = deptParts[0] || '';
    const additionalDepts = deptParts.slice(1);

    const locParts = (emp.location || '').split(',').map(s => s.trim()).filter(Boolean);
    const primaryLoc = locParts[0] || '';
    const additionalLocs = locParts.slice(1);

    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      organization: emp.organization || '',
      division: emp.division || '',
      category: emp.category || '',
      department: primaryDept,
      location: primaryLoc,
      branch: emp.branch || selectedBranch || '',
      designation: emp.designation,
      level: emp.level || '',
      date_of_joining: emp.date_of_joining,
      incentive_period: matchedPeriodId,
      assignment_period: emp.period_name || emp.assignment_period || '',
      status: emp.status
    });
    setExtraDepartments(additionalDepts);
    setExtraLocations(additionalLocs);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const combinedDept = [formData.department, ...extraDepartments]
        .map(d => (d || '').trim())
        .filter(Boolean);
      const finalDepartment = [...new Set(combinedDept)].join(', ');

      const combinedLoc = [formData.location, ...extraLocations]
        .map(l => (l || '').trim())
        .filter(Boolean);
      const finalLocation = [...new Set(combinedLoc)].join(', ');
      const payload = { ...formData, department: finalDepartment, location: finalLocation };

      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/${activeEmployee.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        triggerToast('Employee updated successfully!');
        setIsEditModalOpen(false);
        resetForm();
        fetchEmployees();
      } else {
        const errors = await response.json();
        const errKey = Object.keys(errors)[0];
        const val = errors[errKey];
        const msg = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        triggerToast(`Update failed: ${errKey ? `${errKey} - ${msg}` : 'Could not update employee'}`, 'error');
      }
    } catch (err) {
      triggerToast('Network error while updating employee', 'error');
    }
  };

  const handleDeleteClick = async (empId, empName) => {
    if (!window.confirm(`Are you sure you want to move employee "${empName || ''}" to trash? The employee will be preserved safely in the database and can be restored anytime.`)) return;
    
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/${empId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.status === 204 || response.ok) {
        triggerToast('Employee moved to trash (preserved in database).');
        fetchEmployees();
        fetchTrashCount();
      } else {
        triggerToast('Failed to move employee to trash.', 'error');
      }
    } catch (err) {
      triggerToast('Network error while moving employee to trash', 'error');
    }
  };

  const handleRestoreClick = async (empId, empName) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/${empId}/restore/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        triggerToast(`Employee "${empName || ''}" restored to active directory.`);
        fetchEmployees();
        fetchTrashCount();
      } else {
        triggerToast('Failed to restore employee.', 'error');
      }
    } catch (err) {
      triggerToast('Network error while restoring employee', 'error');
    }
  };

  const handlePermanentDelete = async (empId, empName) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete employee "${empName || ''}" from the database? This action cannot be undone.`)) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/${empId}/permanent-delete/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        triggerToast('Employee permanently deleted.');
        fetchEmployees();
        fetchTrashCount();
      } else {
        triggerToast('Failed to delete employee.', 'error');
      }
    } catch (err) {
      triggerToast('Network error while deleting employee.', 'error');
    }
  };

  const handleBulkTrash = async () => {
    const periodLabel = periodFilter === 'active' && activePeriod ? `active period (${activePeriod.name})` : (periodFilter !== 'all' ? `selected period` : `ALL current staff (${employees.length} employees)`);
    if (!window.confirm(`Are you sure you want to move staff in ${periodLabel} to Trash?\n\nThey will be safely saved in the database and removed from the active frontend, allowing you to import new staff details for the new incentive period.`)) return;

    try {
      const payload = {};
      if (periodFilter && periodFilter !== 'all') {
        payload.period_id = periodFilter === 'active' && activePeriod ? activePeriod.id : periodFilter;
      }
      if (selectedBranch) {
        payload.branch = selectedBranch;
      }

      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/bulk-trash/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast(data.message || 'Staff moved to trash successfully.');
        fetchEmployees();
        fetchTrashCount();
      } else {
        triggerToast(data.error || 'Failed to move staff to trash.', 'error');
      }
    } catch (err) {
      triggerToast('Network error moving staff to trash.', 'error');
    }
  };

  const handleRestoreAll = async () => {
    if (!window.confirm("Restore all trashed employees back to active staff directory?")) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/restore-all/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast(data.message || 'All employees restored.');
        fetchEmployees();
        fetchTrashCount();
      }
    } catch (err) {
      triggerToast('Network error restoring employees.', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all trashed employees? This action CANNOT be undone.")) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/empty-trash/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast(data.message || 'Trash emptied.');
        fetchEmployees();
        fetchTrashCount();
      }
    } catch (err) {
      triggerToast('Network error emptying trash.', 'error');
    }
  };

  const resetForm = () => {
    const defaultPeriod = activePeriod || (incentivePeriods.length > 0 ? incentivePeriods[0] : null);
    const defaultOrg = selectedBranch || (organizations.length > 0 ? organizations[0] : 'IQRAA INTERNATIONAL HOSPITAL & RESEARCH CENTRE');
    setFormData({
      employee_code: '',
      name: '',
      organization: defaultOrg,
      division: '',
      category: '',
      department: (user && user.role === 'department_admin' && user.departments?.length > 0) ? user.departments[0] : '',
      location: (user && user.role === 'department_admin' && user.locations?.length > 0) ? user.locations[0] : '',
      branch: selectedBranch || '',
      designation: '',
      level: '',
      date_of_joining: new Date().toISOString().split('T')[0],
      incentive_period: defaultPeriod ? defaultPeriod.id : '',
      assignment_period: defaultPeriod ? defaultPeriod.name : '',
      status: 'Active'
    });
    setExtraDepartments([]);
    setExtraLocations([]);
    setActiveEmployee(null);
  };

  const downloadSampleTemplate = () => {
    const headers = [
      "Employee Code",
      "Employee Name",
      "Joining Date",
      "Organization",
      "Division",
      "Category",
      "Department",
      "Designation",
      "Duty Location",
      "level"
    ];
    const sampleRows = [
      ["EMP001", "Mohammed Ali", "2022-01-15", "IQRAA HOSPITAL", "OFFICE AND ADMINISTRATION- PI", "Permanent", "HR", "Manager", "Calicut Main", "MAN"],
      ["EMP002", "Fatima Zahra", "2021-06-10", "IQRAA HOSPITAL", "REGISTERED NURSES- PII", "Staff", "Nursing", "Staff Nurse", "ICU Ward", "SUP"],
      ["EMP003", "Rahul Sharma", "2023-03-01", "IQRAA HOSPITAL", "MEDICAL AND PARAMEDICAL- PIII", "Technical", "Laboratory", "Lab Technician", "Central Lab", "MID"],
      ["EMP004", "Priya Nair", "2023-08-20", "IQRAA HOSPITAL", "OFFICE AND ADMINISTRATION- PI", "Support", "Finance", "Accountant", "Accounts Office", "LOW"]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + sampleRows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employee_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Sample employee template downloaded!");
  };


  const handleFileChange = (e) => {
    setExcelFile(e.target.files[0]);
  };

  const handleExcelImport = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      triggerToast('Please choose an Excel file', 'error');
      return;
    }

    setImportLoading(true);
    setImportSummary(null);
    setFailedRows([]);

    const uploadData = new FormData();
    uploadData.append('file', excelFile);
    if (selectedBranch) {
      uploadData.append('selected_branch', selectedBranch);
    }
    if (periodFilter && periodFilter !== 'all') {
      const pId = periodFilter === 'active' && activePeriod ? activePeriod.id : periodFilter;
      uploadData.append('period_id', pId);
    }

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/import-excel/?branch=${encodeURIComponent(selectedBranch || '')}`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
        body: uploadData
      });

      const result = await response.json();
      if (response.ok || response.status === 207) {
        setImportSummary(result.summary);
        setFailedRows(result.failed_rows || []);
        triggerToast('Import processed!');
        fetchEmployees();
      } else {
        triggerToast(result.error || 'Import failed', 'error');
      }
    } catch (err) {
      triggerToast('Network error during Excel upload', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const exportErrorReport = () => {
    if (failedRows.length === 0) return;
    
    // Create CSV content
    const headers = "Row Number,Employee Code,Error Reason\n";
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers 
      + failedRows.map(row => `${row.row},${row.code || 'N/A'},"${row.reason}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "excel_import_errors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`alert-toast alert-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 className="dashboard-title" style={{ marginBottom: 0 }}>Employee Master</h1>
          <span style={{ fontSize: '13px', fontWeight: '600', color: viewMode === 'active' ? 'var(--primary)' : '#b45309', backgroundColor: viewMode === 'active' ? 'rgba(30, 58, 138, 0.08)' : 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center' }}>
            {viewMode === 'active' ? `Active Staff: ${employees.length}` : `Trash Bin: ${employees.length}`}
          </span>
          {selectedBranch && (
            <span 
              title={selectedBranch}
              style={{ 
                backgroundColor: 'rgba(234, 88, 12, 0.08)', 
                color: 'var(--accent)', 
                padding: '4px 12px', 
                borderRadius: '16px', 
                fontSize: '12px', 
                fontWeight: '600',
                border: '1px solid rgba(234, 88, 12, 0.2)',
                maxWidth: '240px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block'
              }}
            >
              Branch: {selectedBranch}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {viewMode === 'active' ? (
            <>
              {user?.role === 'superuser' && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => { fetchDeptAdmins(); setIsDeptAdminModalOpen(true); }}
                  title="Manage Department Admins & Permissions"
                >
                  <UserCheck size={15} />
                  <span>Dept Admins</span>
                </button>
              )}
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={async () => {
                  const link = `${window.location.origin}/appraise`;
                  const success = await copyTextToClipboard(link);
                  if (success) {
                    triggerToast('Common Appraisal Link copied to clipboard!');
                  } else {
                    triggerToast('Failed to copy link. Please copy it manually.', 'error');
                  }
                }}
                title="Copy common link for all staff members"
              >
                <Share2 size={15} />
                <span>Copy Link</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportEmployees} title="Export active employees to Excel">
                <Download size={15} />
                <span>Export Master</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsImportModalOpen(true)} title="Import new staff details for incentive period">
                <Upload size={15} />
                <span>Excel Import</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleBulkTrash} 
                style={{ color: '#b45309', borderColor: '#fde68a', backgroundColor: '#fffbeb' }}
                title="Move current staff to trash to clear frontend for new incentive period import (preserves in DB)"
              >
                <Trash2 size={15} />
                <span>Move to Trash</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                <Plus size={15} />
                <span>Add Employee</span>
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleRestoreAll}
                disabled={employees.length === 0}
                style={{ color: '#059669', borderColor: '#a7f3d0' }}
                title="Restore all trashed employees back to active directory"
              >
                <RotateCcw size={15} />
                <span>Restore All Staff</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleEmptyTrash}
                disabled={employees.length === 0}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                title="Permanently remove all trashed employees from database"
              >
                <Trash2 size={15} />
                <span>Empty Trash</span>
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => setViewMode('active')}
              >
                <span>Back to Directory</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Directory vs Trash Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '18px' }}>
        <button
          type="button"
          onClick={() => setViewMode('active')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: viewMode === 'active' ? '3px solid var(--primary)' : '3px solid transparent',
            color: viewMode === 'active' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: viewMode === 'active' ? '700' : '500',
            fontSize: '14px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Active Staff Directory</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('trash')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: viewMode === 'trash' ? '3px solid #b45309' : '3px solid transparent',
            color: viewMode === 'trash' ? '#b45309' : 'var(--text-muted)',
            fontWeight: viewMode === 'trash' ? '700' : '500',
            fontSize: '14px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Trash2 size={15} />
          <span>Trash Bin</span>
          {trashCount > 0 && (
            <span style={{ 
              backgroundColor: '#fef3c7', 
              color: '#92400e', 
              fontSize: '11px', 
              fontWeight: '700', 
              padding: '2px 7px', 
              borderRadius: '10px' 
            }}>
              {trashCount}
            </span>
          )}
        </button>
      </div>

      {viewMode === 'trash' && (
        <div style={{ 
          padding: '12px 18px', 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fde68a', 
          borderRadius: '8px', 
          fontSize: '13px', 
          color: '#92400e', 
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>
            <strong>Trash Bin Mode:</strong> Employees here are preserved safely in the database and hidden from the active frontend. You can restore them anytime or import a fresh staff roster into the new incentive period.
          </span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="filter-bar">
        <div className="filter-item filter-search">
          <label className="form-label">Search</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search Code or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Incentive Period</span>
            {activePeriod && periodFilter === 'active' && (
              <span style={{ fontSize: '10px', color: '#059669', fontWeight: '700' }}>(Active)</span>
            )}
          </label>
          <select 
            className="form-control" 
            value={periodFilter} 
            onChange={(e) => setPeriodFilter(e.target.value)}
            style={{ fontWeight: '600', borderColor: periodFilter === 'active' ? '#059669' : undefined }}
          >
            <option value="active">Active Period {activePeriod ? `(${activePeriod.name})` : ''}</option>
            <option value="all">All Periods (Everything)</option>
            {incentivePeriods.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_active ? '★ Active' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label">Department</label>
          <select 
            className="form-control" 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {user && user.role === 'department_admin' ? (
              <>
                <option value="">All My Departments</option>
                {user.departments && user.departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </>
            ) : (
              <>
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </>
            )}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label">Location</label>
          <select className="form-control" value={locFilter} onChange={(e) => setLocFilter(e.target.value)}>
            {user && user.role === 'department_admin' && user.locations?.length > 0 ? (
              <>
                <option value="">All My Locations</option>
                {user.locations.map(l => <option key={l} value={l}>{l}</option>)}
              </>
            ) : (
              <>
                <option value="">All Locations</option>
                {locs.map(l => <option key={l} value={l}>{l}</option>)}
              </>
            )}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label">Division</label>
          <select className="form-control" value={divFilter} onChange={(e) => setDivFilter(e.target.value)}>
            <option value="">All Divisions</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label">Level</label>
          <select className="form-control" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label">Designation</label>
          <select className="form-control" value={desigFilter} onChange={(e) => setDesigFilter(e.target.value)}>
            <option value="">All Designations</option>
            {desigs.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label">Status</label>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <span className="spinner"></span>
        </div>
      ) : employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No employee records found.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Incentive Period</th>
                <th>Division</th>
                <th>Level</th>
                <th>Department</th>
                <th>Location</th>
                <th>Branch</th>
                <th>Designation</th>
                <th>Date of Joining</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees
                .filter(emp => !divFilter || (emp.division || '').toLowerCase() === divFilter.toLowerCase())
                .filter(emp => !levelFilter || (emp.level || '').toUpperCase() === levelFilter.toUpperCase())
                .map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{emp.employee_code}</td>
                  <td style={{ fontWeight: '500' }}>{emp.name}</td>
                  <td>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      backgroundColor: 'rgba(234, 88, 12, 0.08)', 
                      color: 'var(--accent)',
                      display: 'inline-block'
                    }}>
                      {emp.period_name || emp.assignment_period || '-'}
                    </span>
                  </td>
                  <td title={emp.division || '-'}><span className="cell-truncated">{emp.division || '-'}</span></td>
                  <td>
                    {emp.level ? (
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        backgroundColor: 'rgba(30, 58, 138, 0.08)', 
                        color: 'var(--primary)', 
                        border: '1px solid rgba(30, 58, 138, 0.2)' 
                      }}>
                        {emp.level}
                      </span>
                    ) : '-'}
                  </td>
                  <td>{emp.department}</td>
                  <td>{emp.location}</td>
                  <td title={emp.branch || '-'}><span className="cell-truncated">{emp.branch || '-'}</span></td>
                  <td>{emp.designation}</td>
                  <td>{emp.date_of_joining}</td>
                  <td>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        backgroundColor: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: emp.status === 'Active' ? 'var(--color-a)' : 'var(--color-e)',
                        border: emp.status === 'Active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {viewMode === 'active' ? (
                        <>
                          <button 
                            onClick={() => handleOpenDetails(emp)}
                            style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="Employee & Department Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              const link = `${window.location.origin}/appraise?code=${emp.employee_code}`;
                              const success = await copyTextToClipboard(link);
                              if (success) {
                                triggerToast(`Link copied for ${emp.name}!`);
                              } else {
                                triggerToast('Failed to copy link. Please copy it manually.', 'error');
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="Copy Public Appraisal Link"
                          >
                            <Share2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(emp)} 
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="Edit Employee"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(emp.id, emp.name)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="Move to Trash"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleRestoreClick(emp.id, emp.name)} 
                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="Restore to Active Directory"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button 
                            onClick={() => handlePermanentDelete(emp.id, emp.name)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="Delete Permanently from Database"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Add New Employee</h2>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Employee Code (Unique)</label>
                <input
                  type="text"
                  name="employee_code"
                  className="form-control"
                  value={formData.employee_code}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employee Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select
                    name="organization"
                    className="form-control"
                    value={formData.organization || ''}
                    onChange={handleInputChange}
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                    {formData.organization && !organizations.includes(formData.organization) && (
                      <option value={formData.organization}>{formData.organization}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Division</label>
                  <input
                    type="text"
                    name="division"
                    className="form-control"
                    placeholder="e.g. OFFICE AND ADMINISTRATION- PI"
                    value={formData.division || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="category"
                    className="form-control"
                    placeholder="e.g. Staff, Permanent, Technical"
                    value={formData.category || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Staff Level (Level 1)</label>
                  <input
                    type="text"
                    name="level"
                    className="form-control"
                    placeholder="e.g. MAN, SUP, LOW, MID"
                    value={formData.level || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Primary Department</label>
                  <select
                    name="department"
                    className="form-control"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, location: '' })}
                    required
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Department --</option>
                    {depts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    {formData.department && !depts.includes(formData.department) && (
                      <option value={formData.department}>{formData.department}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Duty Location</label>
                  <select
                    name="location"
                    className="form-control"
                    value={formData.location}
                    onChange={handleInputChange}
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Location --</option>
                    {formData.department && deptLocationsMap[formData.department]?.length > 0 && (
                      <optgroup label={`${formData.department} Locations`}>
                        {deptLocationsMap[formData.department].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={formData.department ? "All Other Hospital Locations" : "All Hospital Locations"}>
                      {locs
                        .filter(l => !formData.department || !deptLocationsMap[formData.department]?.includes(l))
                        .map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))
                      }
                    </optgroup>
                    {formData.location && !locs.includes(formData.location) && (
                      <option value={formData.location}>{formData.location}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    className="form-control"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Additional Departments (option to add multiple departments to each staff ID) */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: extraDepartments.length > 0 ? '10px' : '0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    Additional Departments ({extraDepartments.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraDepartments([...extraDepartments, ''])}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    + Add Department
                  </button>
                </div>
                {extraDepartments.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    No additional departments added. Click "+ Add Department" to assign this staff ID to multiple departments.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {extraDepartments.map((extraDept, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          className="form-control"
                          value={extraDept}
                          onChange={(e) => {
                            const updated = [...extraDepartments];
                            updated[index] = e.target.value;
                            setExtraDepartments(updated);
                          }}
                          style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)', flex: 1 }}
                        >
                          <option value="">-- Select Additional Department --</option>
                          {depts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          {extraDept && !depts.includes(extraDept) && (
                            <option value={extraDept}>{extraDept}</option>
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => setExtraDepartments(extraDepartments.filter((_, i) => i !== index))}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#b91c1c',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '6px 10px'
                          }}
                          title="Remove Department"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Duty Locations (option to add one more / multiple locations to each staff ID) */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: extraLocations.length > 0 ? '10px' : '0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    Additional Duty Locations ({extraLocations.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraLocations([...extraLocations, ''])}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    + Add Location
                  </button>
                </div>
                {extraLocations.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    No additional locations added. Click "+ Add Location" to add one more duty location for this staff ID.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {extraLocations.map((extraLoc, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          className="form-control"
                          value={extraLoc}
                          onChange={(e) => {
                            const updated = [...extraLocations];
                            updated[index] = e.target.value;
                            setExtraLocations(updated);
                          }}
                          style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)', flex: 1 }}
                        >
                          <option value="">-- Select Additional Location --</option>
                          {formData.department && deptLocationsMap[formData.department]?.length > 0 && (
                            <optgroup label={`${formData.department} Locations`}>
                              {deptLocationsMap[formData.department].map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label={formData.department ? "All Other Hospital Locations" : "All Hospital Locations"}>
                            {locs
                              .filter(l => !formData.department || !deptLocationsMap[formData.department]?.includes(l))
                              .map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))
                            }
                          </optgroup>
                          {extraLoc && !locs.includes(extraLoc) && (
                            <option value={extraLoc}>{extraLoc}</option>
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => setExtraLocations(extraLocations.filter((_, i) => i !== index))}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#b91c1c',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '6px 10px'
                          }}
                          title="Remove Location"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    className="form-control"
                    value={formData.date_of_joining}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Default Assignment Period</span>
                    {formData.incentive_period && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: incentivePeriods.find(p => String(p.id) === String(formData.incentive_period))?.is_active ? '#059669' : '#64748b' }}>
                        {incentivePeriods.find(p => String(p.id) === String(formData.incentive_period))?.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    )}
                  </label>
                  <select
                    name="incentive_period"
                    className="form-control"
                    value={formData.incentive_period || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedP = incentivePeriods.find(p => String(p.id) === String(selectedId));
                      setFormData({
                        ...formData,
                        incentive_period: selectedId,
                        assignment_period: selectedP ? selectedP.name : ''
                      });
                    }}
                    required
                  >
                    <option value="">-- Select Period --</option>
                    {incentivePeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.months ? `(${p.months})` : ''} {p.is_active ? '★ (Active Period)' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Edit Employee Details</h2>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Employee Code (Read-Only)</label>
                <input
                  type="text"
                  name="employee_code"
                  className="form-control"
                  value={formData.employee_code}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', color: '#000000', fontWeight: '600' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employee Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select
                    name="organization"
                    className="form-control"
                    value={formData.organization || ''}
                    onChange={handleInputChange}
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                    {formData.organization && !organizations.includes(formData.organization) && (
                      <option value={formData.organization}>{formData.organization}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Division</label>
                  <input
                    type="text"
                    name="division"
                    className="form-control"
                    placeholder="e.g. OFFICE AND ADMINISTRATION- PI"
                    value={formData.division || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="category"
                    className="form-control"
                    placeholder="e.g. Staff, Permanent, Technical"
                    value={formData.category || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Staff Level (Level 1)</label>
                  <input
                    type="text"
                    name="level"
                    className="form-control"
                    placeholder="e.g. MAN, SUP, LOW, MID"
                    value={formData.level || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Primary Department</label>
                  <select
                    name="department"
                    className="form-control"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Department --</option>
                    {depts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    {formData.department && !depts.includes(formData.department) && (
                      <option value={formData.department}>{formData.department}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Duty Location</label>
                  <select
                    name="location"
                    className="form-control"
                    value={formData.location}
                    onChange={handleInputChange}
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Location --</option>
                    {formData.department && deptLocationsMap[formData.department]?.length > 0 && (
                      <optgroup label={`${formData.department} Locations`}>
                        {deptLocationsMap[formData.department].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={formData.department ? "All Other Hospital Locations" : "All Hospital Locations"}>
                      {locs
                        .filter(l => !formData.department || !deptLocationsMap[formData.department]?.includes(l))
                        .map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))
                      }
                    </optgroup>
                    {formData.location && !locs.includes(formData.location) && (
                      <option value={formData.location}>{formData.location}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    className="form-control"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Additional Departments (option to add multiple departments to each staff ID) */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: extraDepartments.length > 0 ? '10px' : '0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    Additional Departments ({extraDepartments.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraDepartments([...extraDepartments, ''])}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    + Add Department
                  </button>
                </div>
                {extraDepartments.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    No additional departments added. Click "+ Add Department" to assign this staff ID to multiple departments.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {extraDepartments.map((extraDept, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          className="form-control"
                          value={extraDept}
                          onChange={(e) => {
                            const updated = [...extraDepartments];
                            updated[index] = e.target.value;
                            setExtraDepartments(updated);
                          }}
                          style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)', flex: 1 }}
                        >
                          <option value="">-- Select Additional Department --</option>
                          {depts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          {extraDept && !depts.includes(extraDept) && (
                            <option value={extraDept}>{extraDept}</option>
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => setExtraDepartments(extraDepartments.filter((_, i) => i !== index))}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#b91c1c',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '6px 10px'
                          }}
                          title="Remove Department"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Duty Locations (option to add one more / multiple locations to each staff ID) */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: extraLocations.length > 0 ? '10px' : '0' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    Additional Duty Locations ({extraLocations.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraLocations([...extraLocations, ''])}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    + Add Location
                  </button>
                </div>
                {extraLocations.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    No additional locations added. Click "+ Add Location" to add one more duty location for this staff ID.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {extraLocations.map((extraLoc, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          className="form-control"
                          value={extraLoc}
                          onChange={(e) => {
                            const updated = [...extraLocations];
                            updated[index] = e.target.value;
                            setExtraLocations(updated);
                          }}
                          style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)', flex: 1 }}
                        >
                          <option value="">-- Select Additional Location --</option>
                          {formData.department && deptLocationsMap[formData.department]?.length > 0 && (
                            <optgroup label={`${formData.department} Locations`}>
                              {deptLocationsMap[formData.department].map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label={formData.department ? "All Other Hospital Locations" : "All Hospital Locations"}>
                            {locs
                              .filter(l => !formData.department || !deptLocationsMap[formData.department]?.includes(l))
                              .map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))
                            }
                          </optgroup>
                          {extraLoc && !locs.includes(extraLoc) && (
                            <option value={extraLoc}>{extraLoc}</option>
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => setExtraLocations(extraLocations.filter((_, i) => i !== index))}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#b91c1c',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '6px 10px'
                          }}
                          title="Remove Location"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    className="form-control"
                    value={formData.date_of_joining}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Default Assignment Period</span>
                    {formData.incentive_period && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: incentivePeriods.find(p => String(p.id) === String(formData.incentive_period))?.is_active ? '#059669' : '#64748b' }}>
                        {incentivePeriods.find(p => String(p.id) === String(formData.incentive_period))?.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    )}
                  </label>
                  <select
                    name="incentive_period"
                    className="form-control"
                    value={formData.incentive_period || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedP = incentivePeriods.find(p => String(p.id) === String(selectedId));
                      setFormData({
                        ...formData,
                        incentive_period: selectedId,
                        assignment_period: selectedP ? selectedP.name : ''
                      });
                    }}
                    required
                  >
                    <option value="">-- Select Period --</option>
                    {incentivePeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.months ? `(${p.months})` : ''} {p.is_active ? '★ (Active Period)' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Bulk Excel Import</h2>
            </div>
            
            <form onSubmit={handleExcelImport}>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px', textAlign: 'center', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <Upload size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', marginBottom: '16px' }}>Select Employee Master Excel file (.xlsx or .xls)</p>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'block', margin: '0 auto', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', maxWidth: '380px' }}>
                  <strong>Columns:</strong> Employee Code, Employee Name, Joining Date, Organization, Division, Category, Department, Designation, Duty Location, level
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={downloadSampleTemplate}
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} />
                    <span>Download Template</span>
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={importLoading}>
                    {importLoading ? 'Importing...' : 'Upload File'}
                  </button>
                </div>
              </div>
            </form>

            {importSummary && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--primary)' }}>Import Results Summary</h3>
                <div className="grid-cols-2" style={{ gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
                  <div>Total Rows Found: <strong>{importSummary.total_processed}</strong></div>
                  <div>Successfully Imported: <strong style={{ color: 'var(--color-a)' }}>{importSummary.successfully_imported}</strong></div>
                  <div>Skipped (Duplicates): <strong style={{ color: 'var(--color-d)' }}>{importSummary.skipped_duplicates}</strong></div>
                  <div>Failed Rows: <strong style={{ color: 'var(--color-e)' }}>{importSummary.failed}</strong></div>
                </div>

                {failedRows.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '13px', color: '#ef4444' }}>Failed Rows Detail</h4>
                      <button className="btn btn-secondary btn-sm" onClick={exportErrorReport} style={{ padding: '4px 8px', fontSize: '11px' }}>
                        <Download size={12} />
                        <span>Export Error Report</span>
                      </button>
                    </div>
                    <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px' }}>Row</th>
                            <th style={{ padding: '8px' }}>Code</th>
                            <th style={{ padding: '8px' }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {failedRows.map((f, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '8px' }}>{f.row}</td>
                              <td style={{ padding: '8px', color: 'var(--color-e)' }}>{f.code || 'N/A'}</td>
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{f.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsImportModalOpen(false); setImportSummary(null); setExcelFile(null); setFailedRows([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Department Admin Management Modal */}
      {isDeptAdminModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Manage Department Admins</h2>
            </div>
            
            <form onSubmit={handleSaveDeptAdmin} style={{ marginBottom: '24px', backgroundColor: 'var(--bg-active)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', margin: 0, fontWeight: '600', color: 'var(--primary)' }}>
                  {deptAdminForm.editingId ? 'Edit Department Admin' : 'Add / Tag Department Admin'}
                </h3>
                {deptAdminForm.editingId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                    onClick={() => setDeptAdminForm({ username: '', password: '', departments: '', locations: '', branches: '', whatsapp_number: '', editingId: null })}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Username</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. dept_head1"
                    value={deptAdminForm.username}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, username: e.target.value })}
                    required
                    disabled={!!deptAdminForm.editingId}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>{deptAdminForm.editingId ? 'New Password (Optional)' : 'Password'}</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder={deptAdminForm.editingId ? "Leave blank to keep unchanged" : "Set password (default: Iqraa@123)"}
                    value={deptAdminForm.password}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Departments (Comma Separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Nursing, Pharmacy, OPD"
                  value={deptAdminForm.departments}
                  onChange={(e) => setDeptAdminForm({ ...deptAdminForm, departments: e.target.value })}
                  required
                />
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Department Email ID</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. it.admin@iqraahospital.in"
                    value={deptAdminForm.email}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>WhatsApp Number (e.g. 919876543210)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 919876543210"
                    value={deptAdminForm.whatsapp_number}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, whatsapp_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Locations (Comma Separated, Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Block A, Main OPD"
                    value={deptAdminForm.locations}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, locations: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Branches (Comma Separated, Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. City Branch, Central Hospital"
                    value={deptAdminForm.branches}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, branches: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  {deptAdminForm.editingId ? 'Update Department Admin' : 'Save Department Admin'}
                </button>
              </div>
            </form>

            <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>Existing Department Admins</h3>
            <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email ID</th>
                    <th>Departments</th>
                    <th>WhatsApp No.</th>
                    <th>Locations</th>
                    <th>Branches</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deptAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No Department Admins registered yet.</td>
                    </tr>
                  ) : (
                    deptAdmins.map((da) => (
                      <tr key={da.id}>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{da.user_detail?.username || da.username}</td>
                        <td style={{ color: (da.email || da.user_detail?.email) ? 'var(--primary)' : '#ef4444', fontWeight: '500' }}>
                          {da.email || da.user_detail?.email || 'Not configured'}
                        </td>
                        <td>{da.departments?.join(', ') || '-'}</td>
                        <td style={{ fontFamily: 'monospace', color: da.whatsapp_number ? '#10b981' : '#94a3b8', fontWeight: '600' }}>
                          {da.whatsapp_number || 'Not set'}
                        </td>
                        <td>{da.locations?.length > 0 ? da.locations.join(', ') : 'All'}</td>
                        <td>{da.branches?.length > 0 ? da.branches.join(', ') : 'All'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '11px' }}
                            onClick={() => handleEditDeptAdmin(da)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeptAdminModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee & Department Details Modal */}
      {detailsEmp && (
        <div className="modal-backdrop-blur" onClick={() => setDetailsEmp(null)}>
          <div className="dash-details-modal" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="dash-modal-header">
              <div className="dash-modal-title-wrap">
                <div className="dash-modal-avatar">
                  <User size={22} color="#ffffff" />
                </div>
                <div>
                  <h3 className="dash-modal-emp-name">
                    {detailsEmp.name || 'Employee Details'}
                  </h3>
                  <div className="dash-modal-emp-sub">
                    <span style={{ fontWeight: 700, color: '#0066ff' }}>{detailsEmp.employee_code}</span>
                    <span>•</span>
                    <span>{detailsEmp.designation || 'Staff'}</span>
                    <span>•</span>
                    {empAppraisals.length > 0 ? (
                      <span className="status-pill status-pill-submitted">
                        <CheckCircle2 size={11} />
                        <span>Submitted</span>
                      </span>
                    ) : (
                      <span className="status-pill status-pill-pending">
                        <Clock size={11} />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="dash-modal-close-btn"
                onClick={() => setDetailsEmp(null)}
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="dash-modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
              {/* Section 1: Employee & Department Details */}
              <div>
                <div className="dash-modal-section-title">
                  <Briefcase size={15} color="#0066ff" />
                  <span>Employee & Department Details</span>
                </div>
                <div className="dash-modal-grid-details">
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Employee Code</span>
                    <span className="dash-modal-detail-value" style={{ color: '#0066ff', fontWeight: 700 }}>
                      {detailsEmp.employee_code}
                    </span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Full Name</span>
                    <span className="dash-modal-detail-value">{detailsEmp.name || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Department</span>
                    <span className="dash-modal-detail-value">{detailsEmp.department || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Duty Location</span>
                    <span className="dash-modal-detail-value">{detailsEmp.location || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Branch / Hospital</span>
                    <span className="dash-modal-detail-value">
                      {detailsEmp.branch || selectedBranch || 'IQRAA INTERNATIONAL HOSPITAL & RESEARCH CENTRE'}
                    </span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Designation</span>
                    <span className="dash-modal-detail-value">{detailsEmp.designation || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Date of Joining</span>
                    <span className="dash-modal-detail-value">{detailsEmp.date_of_joining || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Assignment Period</span>
                    <span className="dash-modal-detail-value">
                      {detailsEmp.assignment_period || activePeriod?.name || 'July -- Sep'}
                    </span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Staff Category / Level</span>
                    <span className="dash-modal-detail-value">
                      {detailsEmp.level || detailsEmp.category || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Performance Scoring & Domain Details */}
              <div>
                <div className="dash-modal-section-title">
                  <Award size={15} color="#0066ff" />
                  <span>Performance Scoring & Domain Details</span>
                </div>

                {loadingDetails ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                    <span className="spinner"></span>
                  </div>
                ) : empAppraisals.length > 0 ? (
                  <div>
                    {/* Latest Evaluation Summary */}
                    {(() => {
                      const latest = empAppraisals[0];
                      const tier = getScoreTierInfo(latest.final_score);
                      return (
                        <>
                          <div className="dash-modal-scores-row">
                            <div className="dash-modal-score-badge-card">
                              <span className="dash-modal-detail-label">Final Score (3.0 Scale)</span>
                              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0066ff' }}>
                                {Number(latest.final_score || 0).toFixed(2)} / 3.0
                              </div>
                              {tier && (
                                <span 
                                  className="tier-score-pill" 
                                  style={{ 
                                    margin: '2px auto 0 auto',
                                    backgroundColor: tier.bg,
                                    color: tier.color,
                                    border: `1px solid ${tier.border}`
                                  }}
                                >
                                  {tier.label}
                                </span>
                              )}
                            </div>

                            <div className="dash-modal-score-badge-card">
                              <span className="dash-modal-detail-label">Marks Obtained</span>
                              <div style={{ fontSize: '20px', fontWeight: 800, color: '#00b87c' }}>
                                {latest.marks_obtained !== undefined ? latest.marks_obtained : '-'} / 100
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>After disciplinary deductions</span>
                            </div>

                            <div className="dash-modal-score-badge-card">
                              <span className="dash-modal-detail-label">Deductions Applied</span>
                              <div style={{ fontSize: '20px', fontWeight: 800, color: (latest.total_deduction > 0 ? '#ef4444' : '#64748b') }}>
                                {latest.total_deduction || 0} pts
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                Gross: {latest.performance_score || 0}/100
                              </span>
                            </div>
                          </div>

                          {/* 5 Domains */}
                          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #edf2f7', marginTop: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>
                              Core Competency Domains (Active Period: {latest.assignment_period || 'Current'})
                            </span>
                            <div className="dash-modal-domain-bars">
                              {[
                                { label: '1. Job Competence & Skills', score: latest.job_competence },
                                { label: '2. Productivity & Responsibility', score: latest.productivity_responsibility },
                                { label: '3. Communication & Teamwork', score: latest.communication_teamwork },
                                { label: '4. Professionalism & Discipline', score: latest.professionalism_discipline },
                                { label: '5. Initiative & Self Improvement', score: latest.initiative_improvement },
                              ].map((dom, i) => {
                                const s = Number(dom.score || 0);
                                const pct = Math.min(100, Math.round((s / 20) * 100));
                                return (
                                  <div key={i} className="dash-domain-bar-item">
                                    <div className="dash-domain-bar-label-row">
                                      <span>{dom.label}</span>
                                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{s} / 20</span>
                                    </div>
                                    <div className="dash-domain-bar-track">
                                      <div className="dash-domain-bar-fill" style={{ width: `${pct}%` }}></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {latest.submitted_date && (
                              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={13} />
                                <span>Evaluated On: {new Date(latest.submitted_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Previous Appraisal History & Staff Progress Section */}
                    <div style={{ marginTop: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TrendingUp size={14} color="#0066ff" />
                          <span>Previous Appraisals & Progress History ({empAppraisals.length})</span>
                        </span>
                      </div>
                      <div className="table-container" style={{ margin: 0, border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <table className="data-table" style={{ fontSize: '12.5px', margin: 0 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th>Period</th>
                              <th style={{ textAlign: 'center' }}>Score (3.0)</th>
                              <th style={{ textAlign: 'center' }}>Marks</th>
                              <th style={{ textAlign: 'center' }}>Deductions</th>
                              <th style={{ textAlign: 'center' }}>Rating Tier</th>
                              <th>Date</th>
                              <th style={{ textAlign: 'center' }}>Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empAppraisals.map((appr, idx) => {
                              const t = getScoreTierInfo(appr.final_score);
                              const olderAppr = empAppraisals[idx + 1];
                              const scoreDiff = olderAppr ? Number((appr.final_score - olderAppr.final_score).toFixed(2)) : null;
                              return (
                                <tr key={appr.id || idx}>
                                  <td style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {appr.assignment_period || 'Annual'}
                                    {idx === 0 && (
                                      <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                        Latest
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#0066ff' }}>
                                    {Number(appr.final_score || 0).toFixed(2)}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#00b87c' }}>
                                    {appr.marks_obtained !== undefined ? appr.marks_obtained : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center', color: appr.total_deduction > 0 ? '#ef4444' : '#64748b' }}>
                                    {appr.total_deduction ? `-${appr.total_deduction}` : '0'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {appr.rating && appr.rating.includes('(') ? (
                                      <span 
                                        className="tier-score-pill" 
                                        style={{ 
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          backgroundColor: appr.rating.includes('(A)') ? '#ecfdf5' : appr.rating.includes('(B)') ? '#eff6ff' : appr.rating.includes('(C)') ? '#f5f3ff' : appr.rating.includes('(D)') ? '#fff7ed' : '#fef2f2',
                                          color: appr.rating.includes('(A)') ? '#00b87c' : appr.rating.includes('(B)') ? '#0066ff' : appr.rating.includes('(C)') ? '#8b5cf6' : appr.rating.includes('(D)') ? '#f97316' : '#ef4444',
                                          border: `1px solid ${appr.rating.includes('(A)') ? '#a7f3d0' : appr.rating.includes('(B)') ? '#bfdbfe' : appr.rating.includes('(C)') ? '#ddd6fe' : appr.rating.includes('(D)') ? '#fed7aa' : '#fecaca'}`,
                                          fontWeight: 700
                                        }}
                                      >
                                        {appr.rating}
                                      </span>
                                    ) : t ? (
                                      <span 
                                        className="tier-score-pill" 
                                        style={{ 
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          backgroundColor: t.bg,
                                          color: t.color,
                                          border: `1px solid ${t.border}`
                                        }}
                                      >
                                        {t.label}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td style={{ color: '#64748b', fontSize: '11.5px' }}>
                                    {appr.submitted_date ? new Date(appr.submitted_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {scoreDiff !== null ? (
                                      scoreDiff > 0 ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontSize: '11px', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '6px' }}>
                                          <TrendingUp size={12} />
                                          +{scoreDiff}
                                        </span>
                                      ) : scoreDiff < 0 ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#dc2626', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '6px' }}>
                                          <TrendingDown size={12} />
                                          {scoreDiff}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>
                                          ±0.00
                                        </span>
                                      )
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>
                                        Baseline
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <AlertCircle size={28} color="#ea580c" style={{ flexShrink: 0 }} />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#9a3412' }}>
                          Appraisal Submission Pending
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#c2410c' }}>
                          This employee has not yet been evaluated for the active period ({detailsEmp.assignment_period || activePeriod?.name || 'Active Period'}). Click below to open the appraisal evaluation form.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="dash-modal-footer">
              <button
                className="dash-modal-btn-secondary"
                onClick={() => setDetailsEmp(null)}
              >
                Close
              </button>

              <button
                className="dash-modal-btn-primary"
                onClick={() => {
                  setDetailsEmp(null);
                  navigate(`/appraise?code=${detailsEmp.employee_code}`);
                }}
              >
                <span>{empAppraisals.length > 0 ? 'Edit / View in Form' : 'Start Appraisal Form'}</span>
                <span style={{ marginLeft: '4px' }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

