import React, { useState, useEffect } from 'react';
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
  UserCheck
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
  const [statusFilter, setStatusFilter] = useState('');
  
  // Available departments/locations/designations for filter dropdowns
  const [depts, setDepts] = useState([]);
  const [locs, setLocs] = useState([]);
  const [desigs, setDesigs] = useState([]);
  const [deptLocationsMap, setDeptLocationsMap] = useState({});

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
    department: '',
    location: '',
    branch: selectedBranch || '',
    designation: '',
    date_of_joining: '',
    assignment_period: 'April-2026 to June-2026',
    status: 'Active'
  });

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
        setDeptAdminForm({ username: '', password: '', departments: '', locations: '', branches: '', whatsapp_number: '', editingId: null });
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

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let url = `http://${window.location.hostname}:8000/api/employees/?search=${search}&department=${deptFilter}&location=${locFilter}&designation=${desigFilter}&status=${statusFilter}&branch=${encodeURIComponent(selectedBranch || '')}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        
        // Populate filter options if empty
        if (depts.length === 0) {
          const uniqueDepts = [...new Set(data.map(e => e.department))].filter(Boolean).sort();
          const uniqueLocs = [...new Set(data.map(e => e.location))].filter(Boolean).sort();
          const uniqueDesigs = [...new Set(data.map(e => e.designation))].filter(Boolean).sort();
          setDepts(uniqueDepts);
          setLocs(uniqueLocs);
          setDesigs(uniqueDesigs);
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
  }, [search, deptFilter, locFilter, desigFilter, statusFilter, selectedBranch]);

  // Load departments and locations from DB metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/meta/departments-locations/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDepts(data.departments || []);
          setLocs(data.locations || []);
          setDeptLocationsMap(data.department_locations || {});
        }
      } catch (err) {
        console.error("Failed to load departments and locations", err);
      }
    };
    if (token) fetchMeta();
  }, [token]);


  const handleExportEmployees = () => {
    const exportUrl = `http://${window.location.hostname}:8000/api/employees/export-excel/?search=${search}&department=${deptFilter}&location=${locFilter}&designation=${desigFilter}&status=${statusFilter}&branch=${encodeURIComponent(selectedBranch || '')}`;
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
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(formData)
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
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      department: emp.department,
      location: emp.location || '',
      branch: emp.branch || selectedBranch || '',
      designation: emp.designation,
      date_of_joining: emp.date_of_joining,
      assignment_period: emp.assignment_period,
      status: emp.status
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/${activeEmployee.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(formData)
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

  const handleDeleteClick = async (empId) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/employees/${empId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.status === 204 || response.ok) {
        triggerToast('Employee deleted successfully.');
        fetchEmployees();
      } else {
        triggerToast('Delete failed.', 'error');
      }
    } catch (err) {
      triggerToast('Network error while deleting employee', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_code: '',
      name: '',
      department: (user && user.role === 'department_admin' && user.departments?.length > 0) ? user.departments[0] : '',
      location: (user && user.role === 'department_admin' && user.locations?.length > 0) ? user.locations[0] : '',
      branch: selectedBranch || '',
      designation: '',
      date_of_joining: new Date().toISOString().split('T')[0],
      assignment_period: 'April-2026 to June-2026',
      status: 'Active'
    });
    setActiveEmployee(null);
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 className="dashboard-title" style={{ marginBottom: 0 }}>Employee Master</h1>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'rgba(30, 58, 138, 0.08)', padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center' }}>
            Total: {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
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
          <button className="btn btn-secondary btn-sm" onClick={handleExportEmployees} title="Export employees to Excel">
            <Download size={15} />
            <span>Export Master</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsImportModalOpen(true)}>
            <Upload size={15} />
            <span>Excel Import</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
            <Plus size={15} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

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
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{emp.employee_code}</td>
                  <td style={{ fontWeight: '500' }}>{emp.name}</td>
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
                        onClick={() => handleDeleteClick(emp.id)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                        title="Delete Employee"
                      >
                        <Trash2 size={16} />
                      </button>
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

              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Department</label>
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
                  <label className="form-label">Location</label>
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
                  <label className="form-label">Default Assignment Period</label>
                  <input
                    type="text"
                    name="assignment_period"
                    className="form-control"
                    placeholder="e.g. Annual"
                    value={formData.assignment_period}
                    onChange={handleInputChange}
                    required
                  />
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

              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Department</label>
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
                  <label className="form-label">Location</label>
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
                  <label className="form-label">Default Assignment Period</label>
                  <input
                    type="text"
                    name="assignment_period"
                    className="form-control"
                    value={formData.assignment_period}
                    onChange={handleInputChange}
                    required
                  />
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
                <p style={{ fontSize: '14px', marginBottom: '16px' }}>Select Employee Master Excel file (.xlsx)</p>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'block', margin: '0 auto', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left' }}>
                  Required Columns: <strong>Employee Code, Employee Name, Department, Location, Designation, Date of Joining</strong>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={importLoading}>
                  {importLoading ? 'Importing...' : 'Upload File'}
                </button>
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
                    placeholder={deptAdminForm.editingId ? "Leave blank to keep unchanged" : "Set password"}
                    value={deptAdminForm.password}
                    onChange={(e) => setDeptAdminForm({ ...deptAdminForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
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
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No Department Admins registered yet.</td>
                    </tr>
                  ) : (
                    deptAdmins.map((da) => (
                      <tr key={da.id}>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{da.user_detail?.username || da.username}</td>
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
    </div>
  );
}

