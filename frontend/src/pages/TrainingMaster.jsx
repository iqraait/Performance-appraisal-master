import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  Plus, 
  Search, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Settings, 
  ExternalLink, 
  RefreshCw, 
  FileSpreadsheet, 
  Trash2, 
  Eye, 
  MessageSquare, 
  Check, 
  X,
  HelpCircle,
  Calendar,
  Pencil
} from 'lucide-react';

export default function TrainingMaster({ token, user, selectedBranch }) {
  const isAdmin = user && (user.is_staff || user.is_superuser || user.role === 'department_admin' || user.role === 'superuser');
  const isSuperUser = user && (user.is_superuser || (user.is_staff && user.role !== 'department_admin'));

  // Trainees state
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dueOnly, setDueOnly] = useState(false);

  // Filter options
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [deptLocationsMap, setDeptLocationsMap] = useState({});

  // Modals state

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [failedRows, setFailedRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTrainee, setNewTrainee] = useState({
    employee_code: '',
    name: '',
    department: (user && user.role === 'department_admin' && user.departments?.length > 0) ? user.departments[0] : '',
    location: '',
    branch: selectedBranch || '',
    designation: '',
    date_of_joining: new Date().toISOString().split('T')[0]
  });

  // Edit Trainee Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // WhatsApp Meta Config Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [waConfig, setWaConfig] = useState({
    api_token: '',
    masked_token: '',
    phone_number_id: '',
    business_account_id: '',
    template_name: 'training_assessment_reminder',
    template_language: 'en_US',
    base_url: `http://${window.location.hostname}:5173`,
    is_enabled: true
  });
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testingWa, setTestingWa] = useState(false);
  const [waGuideOpen, setWaGuideOpen] = useState(false);

  // Automated Alert scan running
  const [runningAlertScan, setRunningAlertScan] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Trainees
  const fetchTrainees = async () => {
    setLoading(true);
    try {
      let url = `http://${window.location.hostname}:8000/api/training-employees/?search=${encodeURIComponent(search)}&department=${encodeURIComponent(deptFilter)}&branch=${encodeURIComponent(branchFilter || selectedBranch || '')}&status=${encodeURIComponent(statusFilter)}`;
      if (dueOnly) {
        url += `&due_only=true`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrainees(data);

        // Derive departments and branches if empty
        if (departments.length === 0) {
          const uniqueDepts = [...new Set(data.map(t => t.department))].filter(Boolean).sort();
          setDepartments(uniqueDepts);
        }
      } else {
        triggerToast('Failed to load trainees from server', 'error');
      }
    } catch (err) {
      triggerToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/branches/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBranches(data.map(b => b.name));
        }
      } catch (e) {}
    };
    fetchBranches();
  }, [token]);



  // Load departments and locations from DB metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/meta/departments-locations/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableDepartments(data.departments || []);
          setAvailableLocations(data.locations || []);
          setDeptLocationsMap(data.department_locations || {});
          if (data.all_departments?.length > 0) {
            setDepartments(data.all_departments);
          }
        }
      } catch (e) {
        console.error("Failed to load departments and locations", e);
      }
    };
    if (token) fetchMeta();
  }, [token]);


  // Load WhatsApp Config
  const fetchWaConfig = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/whatsapp/config/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWaConfig(prev => ({
          ...prev,
          ...data,
          api_token: '' // don't show full token in edit form
        }));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTrainees();
  }, [search, deptFilter, branchFilter, statusFilter, dueOnly, selectedBranch]);

  useEffect(() => {
    fetchWaConfig();
  }, [token]);

  // Handle WhatsApp Config Save
  const handleSaveWaConfig = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...waConfig };
      if (!payload.api_token) {
        delete payload.api_token;
      }
      const res = await fetch(`http://${window.location.hostname}:8000/api/whatsapp/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast('WhatsApp configuration saved successfully!');
        fetchWaConfig();
      } else {
        const err = await res.json();
        triggerToast(`Failed to save: ${JSON.stringify(err)}`, 'error');
      }
    } catch (e) {
      triggerToast('Error saving WhatsApp configuration', 'error');
    }
  };

  // Test WhatsApp Message
  const handleSendTestMessage = async () => {
    if (!testPhoneNumber) {
      triggerToast('Please enter a phone number with country code (e.g. 919876543210)', 'error');
      return;
    }
    setTestingWa(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/whatsapp/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          action: 'test',
          phone_number: testPhoneNumber
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(data.message || 'Test WhatsApp message delivered successfully!');
      } else {
        triggerToast(data.error || 'Failed to send test message. Check token and Phone ID.', 'error');
      }
    } catch (e) {
      triggerToast('Error sending test WhatsApp message', 'error');
    } finally {
      setTestingWa(false);
    }
  };

  // Send Single Trainee WhatsApp Alert
  const handleSendSingleAlert = async (trainee) => {
    setActionLoadingId(trainee.id);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/${trainee.id}/send-whatsapp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          base_url: `http://${window.location.hostname}:5173`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(data.message || 'WhatsApp alert sent successfully!');
        fetchTrainees();
      } else {
        triggerToast(data.error || 'Failed to send WhatsApp alert.', 'error');
        fetchTrainees();
      }
    } catch (e) {
      triggerToast('Error triggering WhatsApp alert', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run 7-Day Automated Check for All Due Reminders
  const handleRunDueAlertScan = async () => {
    setRunningAlertScan(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/send-all-reminders/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Alert Check Completed! Eligible: ${data.total_eligible} | Sent: ${data.sent_count} | Failed: ${data.failed_count}`);
        fetchTrainees();
      } else {
        triggerToast('Failed to run automated reminder check', 'error');
      }
    } catch (e) {
      triggerToast('Error running automated reminder check', 'error');
    } finally {
      setRunningAlertScan(false);
    }
  };

  // Excel Import Handler
  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      triggerToast('Please select an Excel file to upload', 'error');
      return;
    }
    setImportLoading(true);
    setImportSummary(null);
    setFailedRows([]);

    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('selected_branch', branchFilter || selectedBranch || '');

    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training/import-excel/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok || res.status === 207) {
        setImportSummary(data.summary);
        setFailedRows(data.failed_rows || []);
        triggerToast(`Imported ${data.summary?.successfully_imported || 0} training staff successfully!`);
        fetchTrainees();
      } else {
        triggerToast(data.error || 'Failed to process Excel file', 'error');
      }
    } catch (e) {
      triggerToast('Error uploading Excel file', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // Manual Add Trainee
  const handleAddTrainee = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(newTrainee)
      });
      if (res.ok) {
        triggerToast('Trainee employee added successfully!');
        setIsAddModalOpen(false);
        setNewTrainee({
          employee_code: '',
          name: '',
          department: (user && user.role === 'department_admin' && user.departments?.length > 0) ? user.departments[0] : '',
          location: '',
          branch: selectedBranch || '',
          designation: '',
          date_of_joining: new Date().toISOString().split('T')[0]
        });
        fetchTrainees();
      } else {
        const err = await res.json();
        const errKey = Object.keys(err)[0];
        const val = err[errKey];
        const msg = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        triggerToast(`Failed to add: ${errKey ? `${errKey} - ${msg}` : 'Could not add trainee'}`, 'error');
      }
    } catch (e) {
      triggerToast('Error adding trainee', 'error');
    }
  };

  // Open Edit Modal for staff
  const handleOpenEdit = (t) => {
    setEditingTrainee({
      id: t.id,
      employee_code: t.employee_code,
      name: t.name,
      department: t.department,
      location: t.location || '',
      branch: t.branch || selectedBranch || '',
      designation: t.designation || '',
      date_of_joining: t.date_of_joining || '',
      training_period_months: t.training_period_months || 1,
      training_end_date: t.training_end_date || '',
      status: t.status || 'Training'
    });
    setIsEditModalOpen(true);
  };

  // Submit Staff Updates
  const handleUpdateTrainee = async (e) => {
    e.preventDefault();
    if (!editingTrainee) return;
    setEditLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/${editingTrainee.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(editingTrainee)
      });
      if (res.ok) {
        const updated = await res.json();
        setTrainees(prev => prev.map(t => t.id === updated.id ? updated : t));
        triggerToast(`Updated staff details for ${updated.name} (${updated.employee_code})`);
        setIsEditModalOpen(false);
        setEditingTrainee(null);
      } else {
        const err = await res.json();
        const errKey = Object.keys(err)[0];
        const val = err[errKey];
        const msg = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        triggerToast(`Failed to update: ${errKey ? `${errKey} - ${msg}` : 'Could not update trainee'}`, 'error');
      }
    } catch (err) {
      triggerToast('Error updating trainee record', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Trainee
  const handleDeleteTrainee = async (id, code) => {
    if (!window.confirm(`Are you sure you want to remove trainee '${code}' from the training master?`)) {
      return;
    }
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        triggerToast('Trainee record deleted.');
        fetchTrainees();
      }
    } catch (e) {
      triggerToast('Error deleting trainee', 'error');
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    window.location.href = `http://${window.location.hostname}:8000/api/training-employees/sample-template/`;
  };

  // Export Trainees
  const handleExportExcel = () => {
    const url = `http://${window.location.hostname}:8000/api/training-employees/export-excel/?search=${encodeURIComponent(search)}&department=${encodeURIComponent(deptFilter)}&branch=${encodeURIComponent(branchFilter || selectedBranch || '')}&status=${encodeURIComponent(statusFilter)}`;
    window.location.href = url;
  };

  // Computed summary metrics
  const totalTrainees = trainees.length;
  const alertDueCount = trainees.filter(t => t.is_alert_due && !t.whatsapp_notification_sent).length;
  const whatsappSentCount = trainees.filter(t => t.whatsapp_notification_sent).length;
  const completedCount = trainees.filter(t => t.status === 'Completed' || (t.days_remaining !== null && t.days_remaining < 0)).length;

  return (
    <div className="content-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ zIndex: 9999 }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="page-title">Training Master</h1>
            <span className="badge" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', color: 'var(--primary)', fontWeight: '700', fontSize: '12px' }}>
              1-Month Training Period
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: '4px' }}>
            Manage staff in training period, track 1-month completion dates, and automate 7-day WhatsApp assessment alerts to Department Heads.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isSuperUser && (
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsConfigModalOpen(true)}
              title="Configure Meta WhatsApp Cloud API credentials"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Settings size={15} />
              <span>WhatsApp Settings</span>
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={handleRunDueAlertScan}
            disabled={runningAlertScan}
            title="Scan all trainees and send WhatsApp reminders to Department Admins for staff with <= 7 days left"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <RefreshCw size={15} className={runningAlertScan ? "spin" : ""} />
            <span>{runningAlertScan ? "Scanning & Sending..." : "Run 7-Day Alert Check"}</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => { setIsImportModalOpen(true); setImportSummary(null); setFailedRows([]); setExcelFile(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Upload size={15} />
            <span>Upload Trainees (Excel)</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Plus size={15} />
            <span>Add Trainee</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '20px', gap: '16px' }}>
        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL TRAINEES</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px' }}>{totalTrainees}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered in Training Period</span>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '700' }}>7-DAY ALERT DUE</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px', color: '#d97706' }}>{alertDueCount}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ending within 7 days (Unsent)</span>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#047857', fontWeight: '700' }}>WHATSAPP DELIVERED</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Send size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px', color: '#10b981' }}>{whatsappSentCount}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Alerts sent with Form Links</span>
        </div>

        <div className="stat-card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>COMPLETED / PAST</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#64748b' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px' }}>{completedCount}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>1-Month Period Concluded</span>
        </div>
      </div>

      {/* Trainees Filter & Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search code or staff name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ flex: '1 1 180px' }}>
            {user && user.role === 'department_admin' && user.departments?.length === 1 ? (
              <input 
                type="text" 
                className="form-control" 
                value={user.departments[0]} 
                disabled 
                style={{ height: '38px', fontSize: '13px', fontWeight: '600' }} 
              />
            ) : (
              <select
                className="form-control"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ height: '38px', fontSize: '13px' }}
              >
                <option value="">All Departments</option>
                {(user && user.role === 'department_admin' && user.departments?.length > 0 ? user.departments : departments).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Branch Filter */}
          <div style={{ flex: '1 1 180px' }}>
            <select
              className="form-control"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 1 150px' }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Training">In Training</option>
              <option value="Assessment Due">Assessment Due</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Alert Due Toggle */}
          <button
            type="button"
            className={`btn ${dueOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDueOnly(!dueOnly)}
            style={{ height: '38px', fontSize: '12px', fontWeight: '600' }}
          >
            {dueOnly ? 'Showing 7-Day Alert Due Only' : 'Filter 7-Day Due Only'}
          </button>

          {/* Export / Template Actions */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleDownloadTemplate}
              title="Download Excel template for training employee upload"
              style={{ height: '38px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FileSpreadsheet size={14} />
              <span>Template</span>
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleExportExcel}
              title="Export current trainee list to Excel"
              style={{ height: '38px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trainees Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
            Training Staff Directory ({trainees.length})
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Training period is strictly calculated as 1 month from joining date.
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Code & Name</th>
                <th>Department & Branch</th>
                <th>Designation</th>
                <th>Joining Date</th>
                <th>Training End (1 Mo.)</th>
                <th style={{ textAlign: 'center' }}>Days Left</th>
                <th>Assigned Dept Admin</th>
                <th>WhatsApp Alert</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px' }}>
                    <span className="spinner"></span>
                    <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Loading training staff...</p>
                  </td>
                </tr>
              ) : trainees.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: '600' }}>No trainees found matching current filters.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Upload Trainees (Excel)" or "Add Trainee" to begin.</p>
                  </td>
                </tr>
              ) : (
                trainees.map((t) => {
                  const days = t.days_remaining;
                  const isDue = t.is_alert_due;
                  const waStatus = t.whatsapp_notification_status;
                  const hasSentWa = t.whatsapp_notification_sent;

                  return (
                    <tr key={t.id}>
                      {/* Code & Name */}
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{t.employee_code}</div>
                        <div style={{ fontWeight: '600', color: 'var(--text-color)' }}>{t.name}</div>
                      </td>

                      {/* Department & Branch */}
                      <td>
                        <div style={{ fontWeight: '600' }}>{t.department}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {t.location ? `${t.location} • ` : ''}{t.branch || 'Main Unit'}
                        </div>
                      </td>

                      {/* Designation */}
                      <td>{t.designation || '-'}</td>

                      {/* Joining Date */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                          <span>{t.date_of_joining}</span>
                        </div>
                      </td>

                      {/* Training End Date */}
                      <td>
                        <div style={{ fontWeight: '600', color: isDue ? '#b45309' : 'inherit' }}>
                          {t.training_end_date}
                        </div>
                      </td>

                      {/* Days Left Badge */}
                      <td style={{ textAlign: 'center' }}>
                        {days === null ? (
                          <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>-</span>
                        ) : days < 0 ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#475569', fontWeight: '600' }}>
                            Completed ({Math.abs(days)}d ago)
                          </span>
                        ) : days <= 7 ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontWeight: '700', animation: !hasSentWa ? 'pulse 2s infinite' : 'none' }}>
                            {days} days left (Review Due)
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', fontWeight: '600' }}>
                            {days} days left
                          </span>
                        )}
                      </td>

                      {/* Assigned Dept Admin */}
                      <td>
                        {t.dept_admins && t.dept_admins.length > 0 ? (
                          t.dept_admins.map(da => (
                            <div key={da.id} style={{ fontSize: '12px' }}>
                              <span style={{ fontWeight: '600' }}>{da.username}</span>
                              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: da.whatsapp_number ? '#10b981' : '#ef4444' }}>
                                {da.whatsapp_number ? `WA: ${da.whatsapp_number}` : 'No WA number'}
                              </div>
                            </div>
                          ))
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '11px', fontStyle: 'italic' }}>
                            No Dept Admin tagged
                          </span>
                        )}
                      </td>

                      {/* WhatsApp Status */}
                      <td>
                        {hasSentWa ? (
                          <div>
                            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                              <Check size={12} /> Sent
                            </span>
                            {t.whatsapp_notification_date && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {new Date(t.whatsapp_notification_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : waStatus === 'Failed' ? (
                          <div>
                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c', fontWeight: '600' }} title={t.whatsapp_error_message}>
                              Failed
                            </span>
                            <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.whatsapp_error_message}>
                              {t.whatsapp_error_message}
                            </div>
                          </div>
                        ) : (
                          <span className="badge" style={{ backgroundColor: isDue ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.1)', color: isDue ? '#b45309' : '#64748b' }}>
                            {isDue ? 'Due (Unsent)' : 'Pending'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* Edit Staff Record */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleOpenEdit(t)}
                            title="Edit entered staff details in table"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Send WhatsApp Button */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '11px',
                              backgroundColor: hasSentWa ? 'transparent' : 'rgba(16, 185, 129, 0.08)',
                              borderColor: hasSentWa ? 'var(--border-color)' : '#10b981',
                              color: hasSentWa ? 'var(--text-muted)' : '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleSendSingleAlert(t)}
                            disabled={actionLoadingId === t.id}
                            title={hasSentWa ? "Resend WhatsApp assessment link to Department Admin" : "Send WhatsApp assessment link to Department Admin now"}
                          >
                            <Send size={11} className={actionLoadingId === t.id ? "spin" : ""} />
                            <span>{hasSentWa ? "Resend" : "Send WA"}</span>
                          </button>

                          {/* Open Trainee Assessment Form directly */}
                          <a
                            href={`/trainee-assessment?code=${t.employee_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Open dedicated Trainee Assessment Form (IIHRC/HRD/0007) for this staff"
                          >
                            <ExternalLink size={11} />
                            <span>Assess</span>
                          </a>

                          {/* Delete */}
                          {isSuperUser && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 6px', color: '#ef4444', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteTrainee(t.id, t.employee_code)}
                              title="Delete trainee"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Upload Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="var(--primary)" />
                <span>Upload Trainees in Training Period</span>
              </h2>
            </div>

            <form onSubmit={handleImportExcel}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Upload an Excel spreadsheet with staff starting their training period. The 1-month duration will automatically be calculated from the Date of Joining.
              </p>

              <div style={{ backgroundColor: 'var(--bg-active)', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>Expected Excel Column Headers:</div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                  Employee Code, Employee Name, Department, Location, Branch, Designation, Date of Joining (YYYY-MM-DD)
                </div>
                <div style={{ marginTop: '8px' }}>
                  <button type="button" onClick={handleDownloadTemplate} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    Download Blank Sample Template (.xlsx)
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Choose Excel File (.xlsx, .xls)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="form-control"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  required
                />
              </div>

              {importLoading && (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <span className="spinner"></span>
                  <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Importing trainees and calculating 1-month training cycles...</p>
                </div>
              )}

              {importSummary && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', color: '#15803d', fontSize: '13px', marginBottom: '6px' }}>Import Completed</div>
                  <div style={{ fontSize: '12px', color: '#166534', display: 'flex', gap: '16px' }}>
                    <span>Processed: <b>{importSummary.total_processed}</b></span>
                    <span>Imported: <b>{importSummary.successfully_imported}</b></span>
                    <span>Skipped: <b>{importSummary.skipped_duplicates}</b></span>
                    <span>Failed: <b style={{ color: importSummary.failed > 0 ? '#ef4444' : 'inherit' }}>{importSummary.failed}</b></span>
                  </div>
                </div>
              )}

              {failedRows.length > 0 && (
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px', backgroundColor: '#fef2f2', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', marginBottom: '4px' }}>Failed Rows:</div>
                  {failedRows.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#b91c1c' }}>
                      Row {f.row} ({f.code || 'No Code'}): {f.reason}
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setIsImportModalOpen(false); setExcelFile(null); setImportSummary(null); setFailedRows([]); }}
                  disabled={importLoading}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={importLoading || !excelFile}>
                  {importLoading ? "Processing..." : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Trainee Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Staff in Training Period</h2>
            </div>

            <form onSubmit={handleAddTrainee}>
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Employee Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TRN001"
                    value={newTrainee.employee_code}
                    onChange={(e) => setNewTrainee({ ...newTrainee, employee_code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Employee Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Full staff name"
                    value={newTrainee.name}
                    onChange={(e) => setNewTrainee({ ...newTrainee, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Department</label>
                  <select
                    className="form-control"
                    value={newTrainee.department}
                    onChange={(e) => setNewTrainee({ ...newTrainee, department: e.target.value, location: '' })}
                    required
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Department --</option>
                    {availableDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    {newTrainee.department && !availableDepartments.includes(newTrainee.department) && (
                      <option value={newTrainee.department}>{newTrainee.department}</option>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Trainee Staff Nurse"
                    value={newTrainee.designation}
                    onChange={(e) => setNewTrainee({ ...newTrainee, designation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Date of Joining</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newTrainee.date_of_joining}
                    onChange={(e) => setNewTrainee({ ...newTrainee, date_of_joining: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Branch</label>
                  <select
                    className="form-control"
                    value={newTrainee.branch}
                    onChange={(e) => setNewTrainee({ ...newTrainee, branch: e.target.value })}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Location / Ward</label>
                <select
                  className="form-control"
                  value={newTrainee.location}
                  onChange={(e) => setNewTrainee({ ...newTrainee, location: e.target.value })}
                  style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                >
                  <option value="">-- Select Location / Ward --</option>
                  {newTrainee.department && deptLocationsMap[newTrainee.department]?.length > 0 && (
                    <optgroup label={`${newTrainee.department} Locations`}>
                      {deptLocationsMap[newTrainee.department].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={newTrainee.department ? "All Other Hospital Locations" : "All Hospital Locations"}>
                    {availableLocations
                      .filter(l => !newTrainee.department || !deptLocationsMap[newTrainee.department]?.includes(l))
                      .map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))
                    }
                  </optgroup>
                  {newTrainee.location && !availableLocations.includes(newTrainee.location) && (
                    <option value={newTrainee.location}>{newTrainee.location}</option>
                  )}
                </select>
              </div>


              <div style={{ backgroundColor: 'var(--bg-active)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Note: Training end date will automatically be set to exactly 1 month after the Date of Joining. The corresponding Department Admin will receive an automated WhatsApp review alert 1 week prior.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Trainee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && editingTrainee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={18} color="var(--primary)" />
                <span>Edit Training Staff Record</span>
              </h2>
            </div>

            <form onSubmit={handleUpdateTrainee}>
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Trainee Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTrainee.employee_code}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, employee_code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTrainee.name}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Department</label>
                  <select
                    className="form-control"
                    value={editingTrainee.department}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, department: e.target.value })}
                    required
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Department --</option>
                    {availableDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    {editingTrainee.department && !availableDepartments.includes(editingTrainee.department) && (
                      <option value={editingTrainee.department}>{editingTrainee.department}</option>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTrainee.designation}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, designation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Location / Ward</label>
                  <select
                    className="form-control"
                    value={editingTrainee.location}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, location: e.target.value })}
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value="">-- Select Location / Ward --</option>
                    {editingTrainee.department && deptLocationsMap[editingTrainee.department]?.length > 0 && (
                      <optgroup label={`${editingTrainee.department} Locations`}>
                        {deptLocationsMap[editingTrainee.department].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={editingTrainee.department ? "All Other Hospital Locations" : "All Hospital Locations"}>
                      {availableLocations
                        .filter(l => !editingTrainee.department || !deptLocationsMap[editingTrainee.department]?.includes(l))
                        .map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))
                      }
                    </optgroup>
                    {editingTrainee.location && !availableLocations.includes(editingTrainee.location) && (
                      <option value={editingTrainee.location}>{editingTrainee.location}</option>
                    )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Branch</label>
                  <select
                    className="form-control"
                    value={editingTrainee.branch}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, branch: e.target.value })}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-cols-3" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Joining Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editingTrainee.date_of_joining}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, date_of_joining: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Completion Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editingTrainee.training_end_date}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, training_end_date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Status</label>
                  <select
                    className="form-control"
                    value={editingTrainee.status}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, status: e.target.value })}
                  >
                    <option value="Training">Training</option>
                    <option value="Assessment Due">Assessment Due</option>
                    <option value="Assessed">Assessed</option>
                    <option value="Completed">Completed</option>
                    <option value="Dropped">Dropped</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setIsEditModalOpen(false); setEditingTrainee(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Update Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Meta Config Modal */}
      {isConfigModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="#10b981" />
                <span>Meta WhatsApp Cloud API Configuration</span>
              </h2>
            </div>

            <form onSubmit={handleSaveWaConfig}>
              {/* Meta Setup Guide Toggle */}
              <div style={{ marginBottom: '16px', backgroundColor: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setWaGuideOpen(!waGuideOpen)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13px', color: '#1d4ed8' }}>
                    <HelpCircle size={15} />
                    <span>How to set up WhatsApp in your Meta Account</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '600' }}>{waGuideOpen ? 'Hide Guide ▲' : 'Show Guide ▼'}</span>
                </div>

                {waGuideOpen && (
                  <div style={{ marginTop: '10px', fontSize: '12px', lineHeight: '1.6', color: '#1e3a8a' }}>
                    <ol style={{ paddingLeft: '18px', margin: 0 }}>
                      <li>
                        <b>Meta Developer App:</b> Log in to <code>developers.facebook.com</code> &gt; <b>My Apps</b> &gt; Create Business App with WhatsApp product.
                      </li>
                      <li>
                        <b>Phone Number ID & Token:</b> Go to <b>WhatsApp &gt; API Setup</b>. Copy the <b>Phone number ID</b>. For a permanent token, generate a System User Token in Meta Business Suite (<code>business.facebook.com</code>) with <code>whatsapp_business_messaging</code> permission.
                      </li>
                      <li>
                        <b>Message Template:</b> Go to WhatsApp Manager &gt; Message Templates &gt; Create Template. Name: <code>training_assessment_reminder</code>, Category: <b>Utility</b>, Language: <b>English (US)</b>. Body parameters:
                        <div style={{ backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace', fontSize: '11px' }}>
                          Dear {"{{1}}"},\n\nStaff member {"{{2}}"} from your department ({"{{3}}"}) joined on {"{{4}}"}. Their 1-month training period will complete on {"{{5}}"}.\n\nPlease review their assessment at:\n{"{{6}}"}
                        </div>
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* API Credentials */}
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Meta Phone Number ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 104829104829104"
                    value={waConfig.phone_number_id}
                    onChange={(e) => setWaConfig({ ...waConfig, phone_number_id: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>WABA ID (Account ID)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 109283746192837"
                    value={waConfig.business_account_id}
                    onChange={(e) => setWaConfig({ ...waConfig, business_account_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Meta System User Access Token {waConfig.masked_token && <span style={{ color: '#10b981' }}>(Current: {waConfig.masked_token})</span>}
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={waConfig.masked_token ? "Leave blank to keep existing token, or paste new token" : "Paste Meta permanent access token (starts with EA...)"}
                  value={waConfig.api_token}
                  onChange={(e) => setWaConfig({ ...waConfig, api_token: e.target.value })}
                  style={{ fontSize: '11px', fontFamily: 'monospace' }}
                />
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Approved Template Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. training_assessment_reminder"
                    value={waConfig.template_name}
                    onChange={(e) => setWaConfig({ ...waConfig, template_name: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Template Language Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. en_US"
                    value={waConfig.template_language}
                    onChange={(e) => setWaConfig({ ...waConfig, template_language: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Application Base URL (for link generation)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. http://172.16.21.161:5173"
                  value={waConfig.base_url}
                  onChange={(e) => setWaConfig({ ...waConfig, base_url: e.target.value })}
                  required
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  WhatsApp links will direct Department Admins to: <code>{waConfig.base_url}/appraise?code=...</code>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button type="submit" className="btn btn-primary btn-sm">Save WhatsApp Settings</button>
              </div>
            </form>

            {/* Test WhatsApp Connection Tool */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#047857' }}>
                Test WhatsApp Live Delivery
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Send an immediate test notification to verify that your Meta Access Token and Phone Number ID are operating properly.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter phone with country code (e.g. 919876543210)"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  style={{ height: '36px', fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSendTestMessage}
                  disabled={testingWa || !testPhoneNumber}
                  style={{ height: '36px', fontSize: '12px', whiteSpace: 'nowrap', borderColor: '#10b981', color: '#047857' }}
                >
                  {testingWa ? "Sending..." : "Send Test WhatsApp"}
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsConfigModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
