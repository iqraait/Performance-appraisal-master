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
  Pencil,
  Mail
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
  const [deptAdmins, setDeptAdmins] = useState([]);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState(null);
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
    email: '',
    department_email: '',
    training_period_months: 1,
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

  // Multi-selection state
  const [selectedTraineeIds, setSelectedTraineeIds] = useState([]);
  const [bulkSending, setBulkSending] = useState(false);

  // Email SMTP Config Modal State
  const [isEmailConfigModalOpen, setIsEmailConfigModalOpen] = useState(false);
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    use_tls: true,
    use_ssl: false,
    from_email: 'HR@IQRAAHOSPITAL.IN',
    smtp_user: 'HR@IQRAAHOSPITAL.IN',
    smtp_password: '',
    masked_password: '',
    is_enabled: true
  });
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [emailGuideOpen, setEmailGuideOpen] = useState(false);

  // Automated Alert scan running
  const [runningAlertScan, setRunningAlertScan] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Email Dispatch Status & Delivery Report Modal State
  const [emailResultModalData, setEmailResultModalData] = useState(null);
  const [isEmailResultModalOpen, setIsEmailResultModalOpen] = useState(false);

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


  // Load Department Admins to link department emails
  useEffect(() => {
    const fetchDeptAdmins = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/department-admins/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDeptAdmins(data);
        }
      } catch (e) {}
    };
    if (token) fetchDeptAdmins();
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
    fetchEmailConfig();
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

  // Department change helper to auto-fill department email in Add form
  const handleDepartmentChange = (deptName) => {
    let foundEmail = '';
    if (deptName) {
      const matchedAdmin = deptAdmins.find(da => da.departments && da.departments.some(d => d.trim().toLowerCase() === deptName.trim().toLowerCase()));
      if (matchedAdmin) {
        foundEmail = matchedAdmin.email || matchedAdmin.user_detail?.email || '';
      }
    }
    setNewTrainee(prev => ({
      ...prev,
      department: deptName,
      location: '',
      department_email: foundEmail || prev.department_email
    }));
  };

  // Send Single Trainee Email Notification (Dept Head with staff details)
  const handleSendSingleAlert = async (trainee) => {
    setActionLoadingId(trainee.id);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/${trainee.id}/send-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          base_url: `http://${window.location.hostname}:5173`,
          notify_candidates: false
        })
      });
      const data = await res.json();
      fetchTrainees();

      const isOk = res.ok && data.success;
      setEmailResultModalData({
        title: `Email Notification: ${trainee.name}`,
        subtitle: `Assessment intimation dispatched for staff code ${trainee.employee_code} (${trainee.department})`,
        isSuccess: isOk,
        isPartial: false,
        summaryMessage: data.message || data.error || (isOk ? "Email dispatched successfully" : "Failed to dispatch email"),
        totalStaff: 1,
        sentStaff: isOk ? 1 : 0,
        failedStaff: isOk ? 0 : 1,
        totalDepartments: 1,
        sentDepartments: isOk ? 1 : 0,
        failedDepartments: isOk ? 0 : 1,
        departmentResults: data.department_results || [
          {
            department: trainee.department || 'Department',
            recipient_emails: trainee.department_email ? [trainee.department_email] : [],
            trainees_count: 1,
            trainees: [{ id: trainee.id, employee_code: trainee.employee_code, name: trainee.name, designation: trainee.designation }],
            status: isOk ? 'Sent' : 'Failed',
            message: data.message || data.error
          }
        ]
      });
      setIsEmailResultModalOpen(true);

      if (isOk) {
        triggerToast(data.message || 'Email notification dispatched successfully!');
      } else {
        triggerToast(data.error || 'Failed to dispatch email notification.', 'error');
      }
    } catch (e) {
      triggerToast('Error triggering email notification', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run 7-Day Automated Check for All Due Reminders (Email - Department-Wise)
  const handleRunDueAlertScan = async () => {
    setRunningAlertScan(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/send-all-reminders/`, {
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
      fetchTrainees();

      if (res.ok) {
        const sentCount = data.sent_count || 0;
        const failedCount = data.failed_count || 0;
        const totalEligible = data.total_eligible || 0;

        setEmailResultModalData({
          title: "7-Day & 3-Day Alert Scan (Department-Wise)",
          subtitle: "Automated scan completed for trainees approaching training completion date",
          isSuccess: failedCount === 0 && (sentCount > 0 || totalEligible === 0),
          isPartial: failedCount > 0 && sentCount > 0,
          summaryMessage: `Scan completed: ${totalEligible} staff eligible. Successfully sent: ${sentCount} | Failed: ${failedCount}`,
          totalStaff: totalEligible,
          sentStaff: sentCount,
          failedStaff: failedCount,
          totalDepartments: data.total_departments || (data.department_results ? data.department_results.length : 0),
          sentDepartments: data.department_results ? data.department_results.filter(d => d.status === 'Sent').length : (sentCount > 0 ? 1 : 0),
          failedDepartments: data.department_results ? data.department_results.filter(d => d.status === 'Failed').length : (failedCount > 0 ? 1 : 0),
          departmentResults: data.department_results || []
        });
        setIsEmailResultModalOpen(true);

        triggerToast(`Email Scan Completed! Eligible: ${totalEligible} | Sent: ${sentCount} | Failed: ${failedCount}`);
      } else {
        triggerToast('Failed to run automated reminder check', 'error');
      }
    } catch (e) {
      triggerToast('Error running automated reminder check', 'error');
    } finally {
      setRunningAlertScan(false);
    }
  };

  // Multi-selection handlers
  const handleToggleSelectAll = () => {
    if (selectedTraineeIds.length === trainees.length && trainees.length > 0) {
      setSelectedTraineeIds([]);
    } else {
      setSelectedTraineeIds(trainees.map(t => t.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedTraineeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedDeptsCount = [...new Set(
    trainees.filter(t => selectedTraineeIds.includes(t.id)).map(t => t.department).filter(Boolean)
  )].length;

  // Send Bulk Email to Selected Employees (Consolidated Department-Wise)
  const handleSendBulkEmail = async () => {
    if (selectedTraineeIds.length === 0) {
      triggerToast("Please select at least one employee from the table", "error");
      return;
    }
    setBulkSending(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/send-bulk-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          employee_ids: selectedTraineeIds,
          base_url: `http://${window.location.hostname}:5173`,
          notify_candidates: false
        })
      });
      const data = await res.json();
      fetchTrainees();
      setSelectedTraineeIds([]);

      const sentCount = data.sent_staff !== undefined ? data.sent_staff : (data.sent || 0);
      const failedCount = data.failed_staff !== undefined ? data.failed_staff : (data.failed || 0);
      const totalCount = data.total_staff !== undefined ? data.total_staff : (data.total || 0);

      setEmailResultModalData({
        title: "Department-Wise Email Dispatch Results",
        subtitle: `Dispatched consolidated assessment emails to Department Heads`,
        isSuccess: (res.ok || res.status === 207) && failedCount === 0 && sentCount > 0,
        isPartial: (res.ok || res.status === 207) && failedCount > 0 && sentCount > 0,
        summaryMessage: data.message || `Dispatched notifications for ${totalCount} staff: ${sentCount} sent, ${failedCount} failed.`,
        totalStaff: totalCount,
        sentStaff: sentCount,
        failedStaff: failedCount,
        totalDepartments: data.total_departments || (data.department_results ? data.department_results.length : 0),
        sentDepartments: data.sent_departments || (data.department_results ? data.department_results.filter(d => d.status === 'Sent').length : 0),
        failedDepartments: data.failed_departments || (data.department_results ? data.department_results.filter(d => d.status === 'Failed').length : 0),
        departmentResults: data.department_results || []
      });
      setIsEmailResultModalOpen(true);

      const msg = `Bulk Email: Sent ${sentCount} of ${totalCount} staff notifications successfully!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`;
      triggerToast(msg, failedCount > 0 && sentCount === 0 ? "error" : "success");
    } catch (e) {
      triggerToast("Error sending bulk emails", "error");
    } finally {
      setBulkSending(false);
    }
  };

  // Send Consolidated Emails for All Pending Staff Grouped by Department
  const handleSendPendingDepartmentEmails = async () => {
    const pendingStaff = trainees.filter(t => !t.email_notification_sent && t.status !== 'Completed');
    const pendingDepts = [...new Set(pendingStaff.map(t => t.department).filter(Boolean))];

    if (pendingStaff.length === 0) {
      triggerToast("All eligible trainees already have emails sent! No pending staff.", "info");
      return;
    }

    if (!window.confirm(`Send department-wise reminder emails for ${pendingStaff.length} pending staff across ${pendingDepts.length} department(s)?\n\nEach Department Head will receive ONE email containing a table of all pending staff in their department.`)) {
      return;
    }

    setBulkSending(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/send-pending-by-department/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          department: deptFilter !== 'All' ? deptFilter : '',
          only_unsent: true,
          base_url: `http://${window.location.hostname}:5173`,
          notify_candidates: false
        })
      });
      const data = await res.json();
      fetchTrainees();

      const sentCount = data.sent_staff !== undefined ? data.sent_staff : (data.sent || 0);
      const failedCount = data.failed_staff !== undefined ? data.failed_staff : (data.failed || 0);
      const totalCount = data.total_staff !== undefined ? data.total_staff : (data.total || 0);

      setEmailResultModalData({
        title: "Department-Wise Pending Staff Reminders",
        subtitle: `Consolidated emails dispatched to Department Heads for pending evaluations`,
        isSuccess: (res.ok || res.status === 207) && failedCount === 0 && sentCount > 0,
        isPartial: (res.ok || res.status === 207) && failedCount > 0 && sentCount > 0,
        summaryMessage: data.message || `Dispatched pending notifications: ${sentCount} staff covered, ${failedCount} failed.`,
        totalStaff: totalCount,
        sentStaff: sentCount,
        failedStaff: failedCount,
        totalDepartments: data.total_departments || (data.department_results ? data.department_results.length : 0),
        sentDepartments: data.sent_departments || (data.department_results ? data.department_results.filter(d => d.status === 'Sent').length : 0),
        failedDepartments: data.failed_departments || (data.department_results ? data.department_results.filter(d => d.status === 'Failed').length : 0),
        departmentResults: data.department_results || []
      });
      setIsEmailResultModalOpen(true);

      if (res.ok || res.status === 207) {
        triggerToast(data.message || `Dispatched emails covering ${sentCount} pending staff!`);
      } else {
        triggerToast(data.error || "Failed to dispatch pending emails", "error");
      }
    } catch (e) {
      triggerToast("Error sending pending department emails", "error");
    } finally {
      setBulkSending(false);
    }
  };

  // Email SMTP Configuration Handlers
  const fetchEmailConfig = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/email/config/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailConfig({
          smtp_host: data.smtp_host || 'smtp.office365.com',
          smtp_port: data.smtp_port || 587,
          use_tls: data.use_tls !== undefined ? data.use_tls : true,
          use_ssl: data.use_ssl || false,
          from_email: data.from_email || 'HR@IQRAAHOSPITAL.IN',
          smtp_user: data.smtp_user || 'HR@IQRAAHOSPITAL.IN',
          smtp_password: '',
          masked_password: data.masked_password || '',
          is_enabled: data.is_enabled !== undefined ? data.is_enabled : true
        });
      }
    } catch (e) {
      console.error("Failed to load email config", e);
    }
  };

  const handleSaveEmailConfig = async (e) => {
    e.preventDefault();
    setSavingEmailConfig(true);
    try {
      const payload = { ...emailConfig };
      if (!payload.smtp_password) {
        delete payload.smtp_password;
      }
      const res = await fetch(`http://${window.location.hostname}:8000/api/email/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast("Email SMTP configuration saved successfully!");
        setEmailConfig(prev => ({
          ...prev,
          ...data,
          smtp_password: '',
          masked_password: data.masked_password || prev.masked_password
        }));
      } else {
        const err = await res.json();
        triggerToast(err.error || "Failed to save email settings", "error");
      }
    } catch (e) {
      triggerToast("Error saving email settings", "error");
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.trim()) {
      triggerToast("Please enter a test recipient email address", "error");
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/email/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          action: 'test',
          to_email: testEmailRecipient.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(data.message || `Test email sent to ${testEmailRecipient}!`);
      } else {
        triggerToast(data.error || "Test email delivery failed.", "error");
      }
    } catch (e) {
      triggerToast("Error sending test email", "error");
    } finally {
      setTestingEmail(false);
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
    setImportError(null);
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
        setImportError(null);
        triggerToast(`Imported ${data.summary?.successfully_imported || 0} training staff successfully!`);
        fetchTrainees();
      } else {
        setImportError(data.error || 'Failed to process Excel file');
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
          email: '',
          department_email: '',
          training_period_months: 1,
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
      email: t.email || '',
      department_email: t.department_email || '',
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
  const alertDueCount = trainees.filter(t => t.is_alert_due && !t.email_notification_sent).length;
  const emailSentCount = trainees.filter(t => t.email_notification_sent).length;
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
              Training Periods: 1 & 6 Months
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: '4px' }}>
            Manage staff in training period, track 1-month & 6-month completion dates, and automate email assessment notifications (7 days prior to candidate & dept head; 3-day reminder to dept head).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSendPendingDepartmentEmails}
            disabled={bulkSending}
            title="Send 1 consolidated email per department to each Department Head with a table of pending staff"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: 'rgba(15, 118, 110, 0.08)', borderColor: '#0f766e', color: '#0f766e', fontWeight: '600' }}
          >
            <Mail size={15} className={bulkSending ? "spin" : ""} />
            <span>Send Department-Wise Reminders</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={handleRunDueAlertScan}
            disabled={runningAlertScan}
            title="Scan trainees and send department-wise email reminders (7 days before & 3-day reminder to Department Heads)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <RefreshCw size={15} className={runningAlertScan ? "spin" : ""} />
            <span>{runningAlertScan ? "Scanning & Sending..." : "Run 7-Day Alert Check (Email)"}</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => { setIsEmailConfigModalOpen(true); fetchEmailConfig(); }}
            title="Configure SMTP Email settings (Host, Port, User, Password, TLS) for hospital notifications"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Settings size={15} />
            <span>Email Settings</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => { setIsImportModalOpen(true); setImportSummary(null); setImportError(null); setFailedRows([]); setExcelFile(null); }}
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
            <span style={{ fontSize: '13px', color: '#047857', fontWeight: '700' }}>EMAIL DELIVERED</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Mail size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px', color: '#10b981' }}>{emailSentCount}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Alerts sent to Dept & Trainee</span>
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
            Training period: 1 Month or 6 Months. Automated email notification sent to Dept Head & Candidate.
          </span>
        </div>

        {/* Multi-Selection Bulk Action Bar */}
        {selectedTraineeIds.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderBottom: '1px solid rgba(37, 99, 235, 0.25)',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--primary)" />
              <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--primary)' }}>
                {selectedTraineeIds.length} employee{selectedTraineeIds.length > 1 ? 's' : ''} selected ({selectedDeptsCount} Department{selectedDeptsCount > 1 ? 's' : ''})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedTraineeIds([])}
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                Clear Selection
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSendBulkEmail}
                disabled={bulkSending}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
                title="Send 1 consolidated email per department to each Department Head with the table of selected staff"
              >
                <Mail size={13} className={bulkSending ? "spin" : ""} />
                <span>{bulkSending ? "Sending Department Emails..." : `Send Department-Wise Email (${selectedTraineeIds.length} Staff)`}</span>
              </button>
            </div>
          </div>
        )}

        <div className="table-container" style={{ margin: 0 }}>
          <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={trainees.length > 0 && selectedTraineeIds.length === trainees.length}
                    onChange={handleToggleSelectAll}
                    title="Select / Deselect All Employees"
                    style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                  />
                </th>
                <th>Code & Name</th>
                <th>Department & Branch</th>
                <th>Designation</th>
                <th>Joining Date</th>
                <th>Training Period & End</th>
                <th>Candidate Email</th>
                <th>Assigned Dept Admin & Email</th>
                <th>Email Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px' }}>
                    <span className="spinner"></span>
                    <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Loading training staff...</p>
                  </td>
                </tr>
              ) : trainees.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: '600' }}>No trainees found matching current filters.</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Upload Trainees (Excel)" or "Add Trainee" to begin.</p>
                  </td>
                </tr>
              ) : (
                trainees.map((t) => {
                  const isDue = t.is_alert_due;
                  const emailStatus = t.email_notification_status;
                  const hasSentEmail = t.email_notification_sent;
                  const isSelected = selectedTraineeIds.includes(t.id);

                  return (
                    <tr key={t.id} style={{ backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.04)' : undefined }}>
                      {/* Selection Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(t.id)}
                          style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                        />
                      </td>

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

                      {/* Training Period & End */}
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: t.training_period_months === 6 ? 'rgba(147, 51, 234, 0.12)' : 'rgba(59, 130, 246, 0.12)', 
                            color: t.training_period_months === 6 ? '#7e22ce' : '#2563eb', 
                            fontWeight: '700',
                            fontSize: '11px',
                            padding: '2px 8px'
                          }}
                        >
                          {t.training_period_months === 6 ? '6 Months' : '1 Month'}
                        </span>
                        <div style={{ fontWeight: '600', color: isDue ? '#b45309' : 'inherit', marginTop: '4px', fontSize: '12px' }}>
                          {t.training_end_date}
                        </div>
                      </td>

                      {/* Candidate Email */}
                      <td>
                        {t.email ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-color)', wordBreak: 'break-all' }}>
                            {t.email}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>
                            No email added
                          </span>
                        )}
                      </td>

                      {/* Assigned Dept Admin & Email */}
                      <td>
                        {t.dept_admins && t.dept_admins.length > 0 ? (
                          t.dept_admins.map(da => (
                            <div key={da.id} style={{ fontSize: '12px', marginBottom: '3px' }}>
                              <span style={{ fontWeight: '600' }}>{da.username}</span>
                              <div style={{ fontSize: '11px', color: (da.email || t.department_email) ? 'var(--primary)' : '#ef4444' }}>
                                {(da.email || t.department_email) ? (da.email || t.department_email) : 'No Dept Email tagged'}
                              </div>
                            </div>
                          ))
                        ) : t.department_email ? (
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ fontWeight: '600' }}>Dept Admin</span>
                            <div style={{ fontSize: '11px', color: 'var(--primary)' }}>{t.department_email}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '11px', fontStyle: 'italic' }}>
                            No Dept Email tagged
                          </span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td>
                        {hasSentEmail ? (
                          <div>
                            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                              <Check size={12} /> Email Sent
                            </span>
                            {t.dept_reminder_3day_sent && (
                              <div style={{ marginTop: '3px' }}>
                                <span className="badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#0369a1', fontSize: '10px' }}>
                                  3-Day Reminder Sent
                                </span>
                              </div>
                            )}
                            {t.email_notification_date && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {new Date(t.email_notification_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : emailStatus === 'Failed' ? (
                          <div>
                            <span 
                              className="badge" 
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c', fontWeight: '600', cursor: 'pointer' }} 
                              title={`${t.email_error_message || 'Email delivery failed'} (Click to open Email Settings)`}
                              onClick={() => { setIsEmailConfigModalOpen(true); fetchEmailConfig(); }}
                            >
                              Failed ⚙️
                            </span>
                            <div 
                              style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} 
                              title={`${t.email_error_message} (Click to open Email Settings)`}
                              onClick={() => { setIsEmailConfigModalOpen(true); fetchEmailConfig(); }}
                            >
                              {t.email_error_message?.includes('Authentication') || t.email_error_message?.includes('530') ? 'Auth error: Click Email Settings' : (t.email_error_message || 'Click to configure')}
                            </div>
                          </div>
                        ) : (
                          <span className="badge" style={{ backgroundColor: isDue ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.1)', color: isDue ? '#b45309' : '#64748b' }}>
                            {isDue ? 'Due (7-Day Notice)' : 'Pending'}
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

                          {/* Send Email Button */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '11px',
                              backgroundColor: hasSentEmail ? 'transparent' : 'rgba(37, 99, 235, 0.08)',
                              borderColor: hasSentEmail ? 'var(--border-color)' : 'var(--primary)',
                              color: hasSentEmail ? 'var(--text-muted)' : 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleSendSingleAlert(t)}
                            disabled={actionLoadingId === t.id}
                            title={hasSentEmail ? "Resend assessment email notification to Department Head & Candidate" : "Send assessment email notification to Department Head & Candidate now"}
                          >
                            <Mail size={11} className={actionLoadingId === t.id ? "spin" : ""} />
                            <span>{hasSentEmail ? "Resend Email" : "Send Email"}</span>
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
                Upload an Excel spreadsheet with staff starting their training period. The training period (1 Month or 6 Months) will automatically calculate the completion date. <strong>Note:</strong> The Department Email ID must already be configured in Admin Login for every department in the sheet.
              </p>

              {importError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', color: '#991b1b', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <AlertCircle size={16} color="#dc2626" />
                    <span>Upload Validation Failed</span>
                  </div>
                  <div style={{ lineHeight: 1.5 }}>{importError}</div>
                </div>
              )}

              <div style={{ backgroundColor: 'var(--bg-active)', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>Expected Excel Column Headers:</div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                  Employee Code, Employee Name, Department, Location, Branch, Designation, Date of Joining (YYYY-MM-DD), Candidate Email, Training Period (1 or 6)
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
                  <label className="form-label" style={{ fontSize: '12px' }}>Employee Code *</label>
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
                  <label className="form-label" style={{ fontSize: '12px' }}>Employee Name *</label>
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
                  <label className="form-label" style={{ fontSize: '12px' }}>Department *</label>
                  <select
                    className="form-control"
                    value={newTrainee.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
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
                  <label className="form-label" style={{ fontSize: '12px' }}>Designation *</label>
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
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Training Period *</label>
                  <select
                    className="form-control"
                    value={newTrainee.training_period_months}
                    onChange={(e) => setNewTrainee({ ...newTrainee, training_period_months: parseInt(e.target.value, 10) })}
                    required
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value={1}>1 Month</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Date of Joining *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newTrainee.date_of_joining}
                    onChange={(e) => setNewTrainee({ ...newTrainee, date_of_joining: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Candidate Email ID</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. candidate@iqraahospital.in"
                    value={newTrainee.email}
                    onChange={(e) => setNewTrainee({ ...newTrainee, email: e.target.value })}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Receives 7-day completion notice</div>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Department Email ID</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. dept.head@iqraahospital.in"
                    value={newTrainee.department_email}
                    onChange={(e) => setNewTrainee({ ...newTrainee, department_email: e.target.value })}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Auto-populated from Admin Login</div>
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
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

              <div style={{ backgroundColor: 'var(--bg-active)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Note: Training end date is automatically calculated based on the selected period (1 Month or 6 Months). Automated email notifications are sent from HR@IQRAAHOSPITAL.IN to both candidate and department head 7 days before completion, with a reminder to department head 3 days before.
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

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Training Period</label>
                  <select
                    className="form-control"
                    value={editingTrainee.training_period_months || 1}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, training_period_months: parseInt(e.target.value, 10) })}
                    style={{ fontSize: '13px', padding: '6px 10px', color: '#000000', backgroundColor: '#ffffff', borderColor: 'var(--border-color)' }}
                  >
                    <option value={1}>1 Month</option>
                    <option value={6}>6 Months</option>
                  </select>
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

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Candidate Email ID</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. candidate@iqraahospital.in"
                    value={editingTrainee.email || ''}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, email: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Department Email ID</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. dept.head@iqraahospital.in"
                    value={editingTrainee.department_email || ''}
                    onChange={(e) => setEditingTrainee({ ...editingTrainee, department_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
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

      {/* Email SMTP Config Modal */}
      {isEmailConfigModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={18} color="var(--primary)" />
                <span>SMTP Email Server Configuration</span>
              </h2>
            </div>

            {/* Presets & Guide Box */}
            <div style={{ marginBottom: '16px', backgroundColor: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '8px', padding: '12px 14px' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setEmailGuideOpen(!emailGuideOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13px', color: 'var(--primary)' }}>
                  <HelpCircle size={15} />
                  <span>Email Server Setup Presets & Instructions</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>{emailGuideOpen ? 'Hide Presets ▲' : 'Show Presets ▼'}</span>
              </div>

              {emailGuideOpen && (
                <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: '1.6', color: '#1e3a8a' }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Quick presets for IQRAA Hospital email configuration:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => setEmailConfig(prev => ({
                        ...prev,
                        smtp_host: 'smtp.office365.com',
                        smtp_port: 587,
                        use_tls: true,
                        use_ssl: false,
                        from_email: 'HR@IQRAAHOSPITAL.IN',
                        smtp_user: 'HR@IQRAAHOSPITAL.IN'
                      }))}
                    >
                      Use Microsoft 365 / Outlook (Default)
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => setEmailConfig(prev => ({
                        ...prev,
                        smtp_host: 'smtp.gmail.com',
                        smtp_port: 587,
                        use_tls: true,
                        use_ssl: false,
                        from_email: 'HR@IQRAAHOSPITAL.IN',
                        smtp_user: 'HR@IQRAAHOSPITAL.IN'
                      }))}
                    >
                      Use Gmail / Google Workspace
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => setEmailConfig(prev => ({
                        ...prev,
                        smtp_host: '172.16.21.1',
                        smtp_port: 25,
                        use_tls: false,
                        use_ssl: false,
                        from_email: 'HR@IQRAAHOSPITAL.IN',
                        smtp_user: ''
                      }))}
                    >
                      Internal Hospital Relay (Port 25)
                    </button>
                  </div>
                  <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li><b>Microsoft 365 (Office 365):</b> Host <code>smtp.office365.com</code>, Port <code>587</code>, TLS Enabled. Enter your <code>HR@IQRAAHOSPITAL.IN</code> mailbox password.</li>
                    <li><b>Google Workspace:</b> Host <code>smtp.gmail.com</code>, Port <code>587</code>, TLS Enabled. Note: If 2FA is active, generate and paste a 16-character <i>Google App Password</i>.</li>
                    <li><b>Hospital Relay:</b> If your IT team allows unauthenticated relay internally, set Port to <code>25</code> and TLS to <code>false</code>.</li>
                  </ul>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveEmailConfig}>
              {/* Host & Port */}
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Host Server</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. smtp.office365.com or smtp.gmail.com"
                    value={emailConfig.smtp_host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Port</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="587"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                    required
                  />
                </div>
              </div>

              {/* Sender & Username */}
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Sender From Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="HR@IQRAAHOSPITAL.IN"
                    value={emailConfig.from_email}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Username / Login Account</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="HR@IQRAAHOSPITAL.IN"
                    value={emailConfig.smtp_user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  SMTP Account Password / App Password{' '}
                  {emailConfig.masked_password ? (
                    <span style={{ color: '#10b981', fontWeight: '600' }}>(Configured: {emailConfig.masked_password})</span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>(Not Set - Authentication Required)</span>
                  )}
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder={emailConfig.masked_password ? "Leave empty to keep existing password, or enter new password" : "Enter email password or App Password"}
                  value={emailConfig.smtp_password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                  autoComplete="new-password"
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  This password is securely stored on the server to authenticate email notifications sent by IQRAA HR.
                </div>
              </div>

              {/* Security Checkboxes */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.use_tls}
                    onChange={(e) => setEmailConfig({ ...emailConfig, use_tls: e.target.checked, use_ssl: e.target.checked ? false : emailConfig.use_ssl })}
                  />
                  <span>Use STARTTLS (Port 587)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.use_ssl}
                    onChange={(e) => setEmailConfig({ ...emailConfig, use_ssl: e.target.checked, use_tls: e.target.checked ? false : emailConfig.use_tls })}
                  />
                  <span>Use SSL (Port 465)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emailConfig.is_enabled}
                    onChange={(e) => setEmailConfig({ ...emailConfig, is_enabled: e.target.checked })}
                  />
                  <span>Enable Email Sending</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingEmailConfig}>
                  {savingEmailConfig ? 'Saving...' : 'Save Email Configuration'}
                </button>
              </div>
            </form>

            {/* Test Email Delivery Tool */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--primary)' }}>
                Live Email Delivery Test
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Send an immediate test email to verify that your SMTP host and password are functioning properly before dispatching staff notifications.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter recipient email (e.g. your-email@iqraahospital.in)"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  style={{ height: '36px', fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSendTestEmail}
                  disabled={testingEmail || !testEmailRecipient}
                  style={{ height: '36px', fontSize: '12px', whiteSpace: 'nowrap', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  {testingEmail ? "Sending..." : "Send Test Email"}
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEmailConfigModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Dispatch Result & Delivery Report Modal */}
      {isEmailResultModalOpen && emailResultModalData && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: emailResultModalData.isSuccess ? 'rgba(16, 185, 129, 0.12)' : (emailResultModalData.isPartial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: emailResultModalData.isSuccess ? '#10b981' : (emailResultModalData.isPartial ? '#f59e0b' : '#ef4444')
                }}>
                  <Mail size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-color)' }}>
                    {emailResultModalData.title || "Email Dispatch Summary"}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {emailResultModalData.subtitle || "Consolidated department-wise assessment notification details"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsEmailResultModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                title="Close Report"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 0' }}>
              {/* Status Alert Banner */}
              <div style={{
                backgroundColor: emailResultModalData.isSuccess ? '#f0fdf4' : (emailResultModalData.isPartial ? '#fffbeb' : '#fef2f2'),
                border: `1px solid ${emailResultModalData.isSuccess ? '#bbf7d0' : (emailResultModalData.isPartial ? '#fde68a' : '#fecaca')}`,
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {emailResultModalData.isSuccess ? (
                  <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <AlertCircle size={20} color={emailResultModalData.isPartial ? "#d97706" : "#dc2626"} style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: emailResultModalData.isSuccess ? '#166534' : (emailResultModalData.isPartial ? '#92400e' : '#991b1b') }}>
                    {emailResultModalData.isSuccess ? "Email Dispatched Successfully" : (emailResultModalData.isPartial ? "Partial Delivery Completed" : "Email Dispatch Issue")}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '3px', color: emailResultModalData.isSuccess ? '#15803d' : (emailResultModalData.isPartial ? '#b45309' : '#b91c1c') }}>
                    {emailResultModalData.summaryMessage}
                  </div>
                </div>
              </div>

              {/* KPI Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '22px' }}>
                <div style={{ backgroundColor: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Departments</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                    {emailResultModalData.sentDepartments || 0} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>/ {emailResultModalData.totalDepartments || 0}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Total Staff</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-color)', marginTop: '2px' }}>
                    {emailResultModalData.totalStaff || 0}
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#047857', textTransform: 'uppercase', fontWeight: '600' }}>Sent / Delivered</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                    {emailResultModalData.sentStaff || 0}
                  </div>
                </div>

                <div style={{ backgroundColor: emailResultModalData.failedStaff > 0 ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-secondary, #f8fafc)', border: `1px solid ${emailResultModalData.failedStaff > 0 ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-color)'}`, borderRadius: '8px', padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: emailResultModalData.failedStaff > 0 ? '#b91c1c' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Failed / Pending</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: emailResultModalData.failedStaff > 0 ? '#dc2626' : 'var(--text-muted)', marginTop: '2px' }}>
                    {emailResultModalData.failedStaff || 0}
                  </div>
                </div>
              </div>

              {/* Department Breakdown Table */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--bg-secondary, #f8fafc)', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-color)' }}>
                    Department-Wise Intimation Details
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    1 consolidated email sent per department containing staff table
                  </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-primary, #ffffff)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 12px', width: '22%' }}>Department</th>
                        <th style={{ padding: '8px 12px', width: '28%' }}>Sent To (HOD Email)</th>
                        <th style={{ padding: '8px 12px', width: '25%' }}>Pending Staff in Table</th>
                        <th style={{ padding: '8px 12px', width: '12%', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '8px 12px', width: '13%' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailResultModalData.departmentResults && emailResultModalData.departmentResults.length > 0 ? (
                        emailResultModalData.departmentResults.map((deptItem, idx) => {
                          const isSent = deptItem.status === 'Sent';
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                              <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '13px' }}>
                                  {deptItem.department}
                                </div>
                              </td>

                              <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                {deptItem.recipient_emails && deptItem.recipient_emails.length > 0 ? (
                                  deptItem.recipient_emails.map((em, eIdx) => (
                                    <div key={eIdx} style={{ fontFamily: 'monospace', color: 'var(--text-color)', fontSize: '11px', wordBreak: 'break-all' }}>
                                      {em}
                                    </div>
                                  ))
                                ) : (
                                  <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>
                                    No HOD email tagged
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                <div style={{ marginBottom: '4px' }}>
                                  <span className="badge" style={{ backgroundColor: 'rgba(15, 118, 110, 0.1)', color: '#0f766e', fontWeight: '700', fontSize: '11px' }}>
                                    {deptItem.trainees_count} staff member{deptItem.trainees_count > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                                  {deptItem.trainees && deptItem.trainees.map((tr, tIdx) => (
                                    <span key={tIdx} style={{ fontSize: '10px', backgroundColor: 'var(--bg-secondary, #f1f5f9)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-color)' }} title={tr.designation}>
                                      {tr.employee_code} ({tr.name})
                                    </span>
                                  ))}
                                </div>
                              </td>

                              <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                                {isSent ? (
                                  <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#047857', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Check size={11} /> Sent
                                  </span>
                                ) : (
                                  <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <X size={11} /> Failed
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                <div style={{ fontSize: '11px', color: isSent ? 'var(--text-muted)' : '#dc2626', lineHeight: '1.4' }}>
                                  {deptItem.message}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            No department breakdown data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Troubleshooting helper if errors present */}
              {emailResultModalData.failedStaff > 0 && (
                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong>Need Help?</strong> If a department failed due to missing Department Admin email or SMTP password, configure them to enable delivery.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setIsEmailResultModalOpen(false); setIsEmailConfigModalOpen(true); fetchEmailConfig(); }}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Email SMTP Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsEmailResultModalOpen(false)}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
