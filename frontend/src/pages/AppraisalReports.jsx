import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Download, 
  Eye, 
  Printer, 
  Calendar,
  X,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Award,
  Layers,
  CheckSquare,
  Square,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function AppraisalReports({ token, user, selectedBranch }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: 'assessments' or 'incentives'
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'incentives' ? 'incentives' : 'assessments';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'incentives') {
      setActiveTab('incentives');
    } else if (params.get('tab') === 'assessments') {
      setActiveTab('assessments');
    }
  }, [location.search]);

  const [toast, setToast] = useState(null);
  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ==========================================
  // TAB 1: APPRAISAL ASSESSMENTS STATE
  // ==========================================
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Appraisal Filters
  const [search, setSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [desigFilter, setDesigFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown list sets
  const [depts, setDepts] = useState([]);
  const [locs, setLocs] = useState([]);
  const [desigs, setDesigs] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [ratings, setRatings] = useState([]);

  // Selected appraisal for View/Print modal
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getQueryString = () => {
    return `search=${search}&code=${codeFilter}&name=${nameFilter}&department=${deptFilter}&location=${locFilter}&designation=${desigFilter}&assignment_period=${periodFilter}&rating=${ratingFilter}&start_date=${startDate}&end_date=${endDate}&status=${statusFilter}&branch=${encodeURIComponent(selectedBranch || '')}`;
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/appraisals/?${getQueryString()}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);

        // Derive unique dropdown sets from all records
        if (depts.length === 0) {
          fetch(`http://${window.location.hostname}:8000/api/appraisals/?status=all&branch=${encodeURIComponent(selectedBranch || '')}`, {
            headers: { 'Authorization': `Token ${token}` }
          })
          .then(res => res.json())
          .then(allData => {
            if (Array.isArray(allData)) {
              const uniqueDepts = [...new Set(allData.map(r => r.department))].filter(Boolean).sort();
              const uniqueLocs = [...new Set(allData.map(r => r.location))].filter(Boolean).sort();
              const uniqueDesigs = [...new Set(allData.map(r => r.designation))].filter(Boolean).sort();
              const uniquePeriods = [...new Set(allData.map(r => r.assignment_period))].filter(Boolean).sort();
              const uniqueRatings = [...new Set(allData.map(r => r.rating))].filter(r => r && r !== 'Pending').sort();
              setDepts(uniqueDepts);
              setLocs(uniqueLocs);
              setDesigs(uniqueDesigs);
              setPeriods(uniquePeriods);
              setRatings(uniqueRatings);
            }
          })
          .catch(() => {});
        }
      } else {
        triggerToast('Failed to load appraisal reports.', 'error');
      }
    } catch (err) {
      triggerToast('Connection error fetching reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'assessments') {
      fetchReports();
    }
  }, [search, codeFilter, nameFilter, deptFilter, locFilter, desigFilter, periodFilter, ratingFilter, startDate, endDate, statusFilter, selectedBranch, activeTab]);

  const handleExportExcel = () => {
    const exportUrl = `http://${window.location.hostname}:8000/api/appraisals/export-excel/?${getQueryString()}`;
    triggerToast('Preparing Appraisal Excel export...');
    fetch(exportUrl, {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appraisal_reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerToast('Appraisal report downloaded successfully!');
    })
    .catch(err => triggerToast('Failed to download Excel report', 'error'));
  };

  const handleViewClick = (appraisal) => {
    setSelectedAppraisal(appraisal);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for Rating Class Names
  const getRatingClass = (r) => {
    if (!r) return '';
    if (r.includes('(A)') || r.startsWith('3.0') || r.startsWith('2.9') || r.startsWith('2.8') || r.startsWith('2.7')) return 'rating-a';
    if (r.includes('(B)') || r.startsWith('2.6') || r.startsWith('2.5') || r.startsWith('2.4')) return 'rating-b';
    if (r.includes('(C)') || r.startsWith('2.3') || r.startsWith('2.2') || r.startsWith('2.1') || r.startsWith('2.0')) return 'rating-c';
    if (r.includes('(D)') || r.startsWith('1.')) return 'rating-d';
    return 'rating-e';
  };

  // ==========================================
  // TAB 2: INCENTIVE CALCULATIONS STATE
  // ==========================================
  const [incentivePeriods, setIncentivePeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [incentiveLoading, setIncentiveLoading] = useState(false);
  const [incentiveData, setIncentiveData] = useState({ period: null, summary: {}, records: [] });
  const [divisionList, setDivisionList] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);

  // Incentive Filters
  const [incSearch, setIncSearch] = useState('');
  const [incDivision, setIncDivision] = useState('');
  const [incDepartment, setIncDepartment] = useState('');
  const [incStatus, setIncStatus] = useState('all');
  const [incCurrentPage, setIncCurrentPage] = useState(1);
  const INC_PAGE_SIZE = 20;

  // Multi-selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());

  // Detailed Breakdown Modal
  const [selectedIncentiveRecord, setSelectedIncentiveRecord] = useState(null);
  const [isIncentiveModalOpen, setIsIncentiveModalOpen] = useState(false);

  // Load incentive periods and divisions list
  const fetchIncentivePeriodsAndMeta = async () => {
    try {
      const [periodsRes, divRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:8000/api/incentives/periods/`, {
          headers: { 'Authorization': `Token ${token}` }
        }),
        fetch(`http://${window.location.hostname}:8000/api/incentives/division-rates/`, {
          headers: { 'Authorization': `Token ${token}` }
        })
      ]);

      if (periodsRes.ok) {
        const pData = await periodsRes.json();
        setIncentivePeriods(pData);
        if (pData.length > 0 && !selectedPeriodId) {
          const activeP = pData.find(p => p.is_active) || pData[0];
          setSelectedPeriodId(activeP.id);
        }
      }

      if (divRes.ok) {
        const dData = await divRes.json();
        setDivisionList(dData.map(d => d.division_name).filter(Boolean));
      }
    } catch (e) {
      console.error("Error loading incentive periods", e);
    }
  };

  useEffect(() => {
    fetchIncentivePeriodsAndMeta();
  }, []);

  // Fetch incentive calculation records
  const fetchIncentiveData = async () => {
    if (!selectedPeriodId) return;
    setIncentiveLoading(true);
    try {
      const query = new URLSearchParams({
        period_id: selectedPeriodId,
        division: incDivision,
        department: incDepartment,
        status: incStatus,
        search: incSearch,
        branch: selectedBranch || ''
      });
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/calculate/?${query.toString()}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncentiveData(data);
      } else {
        triggerToast('Failed to load incentive calculation data.', 'error');
      }
    } catch (err) {
      triggerToast('Connection error fetching incentive records.', 'error');
    } finally {
      setIncentiveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'incentives' && selectedPeriodId) {
      fetchIncentiveData();
    }
  }, [activeTab, selectedPeriodId, incDivision, incDepartment, incStatus, incSearch, selectedBranch]);

  // Reset pagination to first page when incentive filters or period change
  useEffect(() => {
    setIncCurrentPage(1);
  }, [selectedPeriodId, incDivision, incDepartment, incStatus, incSearch]);

  // Selection toggle handlers
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(incentiveData.records.map(r => r.employee_id));
      setSelectedEmployeeIds(allIds);
    } else {
      setSelectedEmployeeIds(new Set());
    }
  };

  const handleToggleSelectRow = (empId) => {
    setSelectedEmployeeIds(prev => {
      const updated = new Set(prev);
      if (updated.has(empId)) {
        updated.delete(empId);
      } else {
        updated.add(empId);
      }
      return updated;
    });
  };

  // Process / Revert incentives
  const handleProcessIncentives = async (actionType = 'process', selectAll = false, specificEmpId = null) => {
    if (!selectedPeriodId) {
      triggerToast('Please select an incentive period.', 'error');
      return;
    }

    const empIds = specificEmpId ? [specificEmpId] : (selectAll ? [] : Array.from(selectedEmployeeIds));
    if (!selectAll && empIds.length === 0) {
      triggerToast('Please select at least one staff record to process.', 'error');
      return;
    }

    setProcessingAction(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/process/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          period_id: selectedPeriodId,
          employee_ids: empIds,
          select_all: selectAll,
          action: actionType
        })
      });
      const result = await res.json();
      if (res.ok) {
        triggerToast(result.message || 'Incentives updated successfully!');
        if (!specificEmpId) {
          setSelectedEmployeeIds(new Set());
        }
        await fetchIncentiveData();
        if (selectedIncentiveRecord) {
          setSelectedIncentiveRecord(prev => prev ? { 
            ...prev, 
            is_processed: actionType === 'process',
            status: actionType === 'process' ? 'Processed' : 'Draft'
          } : null);
        }
      } else {
        triggerToast(result.error || 'Failed to update incentives.', 'error');
      }
    } catch (err) {
      triggerToast('Network error processing incentives.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // Export Incentive Excel
  const handleExportIncentivesExcel = () => {
    if (!selectedPeriodId) {
      triggerToast('Please select an incentive period to export.', 'error');
      return;
    }
    const query = new URLSearchParams({
      period_id: selectedPeriodId,
      division: incDivision,
      department: incDepartment,
      status: incStatus,
      search: incSearch
    });
    const exportUrl = `http://${window.location.hostname}:8000/api/incentives/export-excel/?${query.toString()}`;
    triggerToast('Preparing Incentive Excel report...');
    fetch(exportUrl, {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const pName = incentiveData.period ? incentiveData.period.name.replace(/\s+/g, '_') : 'period';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incentive_report_${pName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerToast('Incentive Excel downloaded successfully!');
    })
    .catch(err => triggerToast('Failed to download Incentive Excel report', 'error'));
  };

  // Export Incentive CSV for instant downloadable staff details
  const handleExportIncentivesCSV = () => {
    if (!incentiveData.records || incentiveData.records.length === 0) {
      triggerToast('No staff records found for this period to download.', 'error');
      return;
    }
    const headers = [
      "Employee Code", "Employee Name", "Division", "Department", "Location",
      "Date of Joining", "Experience Months", "Level Code", "Level 1 Score",
      "Level 2 Score (Exp)", "Appraisal Marks", "Level 3 Score (Assessment)",
      "Total Score Units", "Division Rate (INR)", "Final Incentive Amount (INR)", "Status"
    ];
    const rows = incentiveData.records.map(r => [
      `"${r.employee_code || ''}"`,
      `"${(r.employee_name || '').replace(/"/g, '""')}"`,
      `"${(r.division || '').replace(/"/g, '""')}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${r.date_of_joining || r.joining_date || ''}"`,
      `"${r.months_of_experience || r.experience_months || 0}"`,
      `"${r.level_code || r.employee_level || ''}"`,
      `"${r.level1_score || r.level_1_score || 0}"`,
      `"${r.level2_score || r.level_2_score || 0}"`,
      `"${r.marks_obtained || r.appraisal_marks || 0}"`,
      `"${r.level3_score || r.level_3_score || 0}"`,
      `"${r.total_units || r.total_unit_score || 0}"`,
      `"${r.division_rate || 0}"`,
      `"${r.final_amount || r.final_incentive_amount || 0}"`,
      `"${r.status || (r.is_processed ? 'Processed' : 'Draft')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const pTitle = incentiveData.period ? incentiveData.period.name.replace(/\s+/g, '_') : 'period';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `incentive_staff_report_${pTitle}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Incentive staff report downloaded (CSV)!');
  };

  const handleOpenBreakdown = (record) => {
    setSelectedIncentiveRecord(record);
    setIsIncentiveModalOpen(true);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(location.search);
    newParams.set('tab', newTab);
    navigate({ search: newParams.toString() }, { replace: true });
  };

  const selectedPeriodObj = incentivePeriods.find(p => p.id === Number(selectedPeriodId)) || incentiveData.period;

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`alert-toast alert-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header with Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 className="dashboard-title" style={{ marginBottom: 0 }}>Reports & Incentive Payouts</h1>
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

        {/* Global actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'assessments' ? (
            <button className="btn btn-primary btn-sm" onClick={handleExportExcel}>
              <Download size={15} />
              <span>Export Appraisals</span>
            </button>
          ) : (
            <>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/incentives')}
                title="Configure Incentive Periods, Division Rates, and Levels"
              >
                <Award size={15} />
                <span>Configure Rates & Levels</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExportIncentivesExcel}>
                <Download size={15} />
                <span>Export Incentive Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        borderBottom: '2px solid var(--border-color)', 
        marginBottom: '24px' 
      }}>
        <button
          onClick={() => handleTabChange('assessments')}
          style={{
            background: activeTab === 'assessments' ? 'var(--bg-secondary, #ffffff)' : 'transparent',
            color: activeTab === 'assessments' ? 'var(--primary, #0f766e)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeTab === 'assessments' ? '3px solid var(--primary, #0f766e)' : '3px solid transparent',
            padding: '12px 22px',
            fontSize: '14px',
            fontWeight: activeTab === 'assessments' ? '700' : '500',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          }}
        >
          <FileCheck size={18} />
          <span>Appraisal Assessments</span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '700', 
            backgroundColor: activeTab === 'assessments' ? 'rgba(15, 118, 110, 0.12)' : 'rgba(0,0,0,0.06)', 
            color: activeTab === 'assessments' ? 'var(--primary, #0f766e)' : 'inherit',
            padding: '2px 8px', 
            borderRadius: '12px' 
          }}>
            {reports.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('incentives')}
          style={{
            background: activeTab === 'incentives' ? 'var(--bg-secondary, #ffffff)' : 'transparent',
            color: activeTab === 'incentives' ? 'var(--accent, #ea580c)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeTab === 'incentives' ? '3px solid var(--accent, #ea580c)' : '3px solid transparent',
            padding: '12px 22px',
            fontSize: '14px',
            fontWeight: activeTab === 'incentives' ? '700' : '500',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          }}
        >
          <Sparkles size={18} />
          <span>Incentive Calculations (New)</span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '700', 
            backgroundColor: activeTab === 'incentives' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(0,0,0,0.06)', 
            color: activeTab === 'incentives' ? 'var(--accent, #ea580c)' : 'inherit',
            padding: '2px 8px', 
            borderRadius: '12px' 
          }}>
            {incentiveData?.records?.length || 0}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: APPRAISAL ASSESSMENTS VIEW                        */}
      {/* ======================================================== */}
      {activeTab === 'assessments' && (
        <div>
          {/* Advanced Filters */}
          <div className="filter-bar">
            <div className="filter-item filter-search">
              <label className="form-label">Search (Code/Name)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="filter-item">
              <label className="form-label">Submission Status</label>
              <select 
                className="form-control" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontWeight: statusFilter ? '600' : 'normal', color: statusFilter === 'pending' ? 'var(--color-d)' : 'inherit' }}
              >
                <option value="">Submitted Appraisals</option>
                <option value="pending">Pending Appraisals</option>
                <option value="all">All (Submitted & Pending)</option>
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
              <label className="form-label">Designation</label>
              <select className="form-control" value={desigFilter} onChange={(e) => setDesigFilter(e.target.value)}>
                <option value="">All Designations</option>
                {desigs.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Period</label>
              <select className="form-control" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                <option value="">All Periods</option>
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Rating</label>
              <select className="form-control" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
                <option value="">All Ratings</option>
                {ratings.map(r => {
                  const match = r.match(/\(([^)]+)\)/);
                  const label = match ? match[1] : r;
                  return <option key={r} value={r}>{label}</option>;
                })}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="filter-item">
              <label className="form-label">End Date</label>
              <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Reports Table */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
              <span className="spinner"></span>
            </div>
          ) : reports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No appraisal records match the filter criteria.
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
                    <th>Period</th>
                    <th style={{ textAlign: 'center' }}>Perf. Marks (/100)</th>
                    <th style={{ textAlign: 'center' }}>Deduction</th>
                    <th style={{ textAlign: 'center' }}>Final Score (/3.0)</th>
                    <th>Score / Rating</th>
                    <th>Submitted Date</th>
                    <th>Admin ID</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const isPending = r.is_pending || r.status === 'Pending' || r.rating === 'Pending';
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{r.employee_code}</td>
                        <td style={{ fontWeight: '500' }}>{r.employee_name}</td>
                        <td>{r.department}</td>
                        <td>{r.location || '-'}</td>
                        <td title={r.branch || '-'}><span className="cell-truncated">{r.branch || '-'}</span></td>
                        <td>{r.designation}</td>
                        <td>{r.assignment_period || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {isPending ? '-' : (r.marks_obtained !== undefined && r.marks_obtained !== null ? r.marks_obtained : r.performance_score)}
                        </td>
                        <td style={{ textAlign: 'center', color: !isPending && r.total_deduction > 0 ? 'var(--color-e)' : 'inherit' }}>
                          {isPending ? '-' : r.total_deduction}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--accent)' }}>
                          {isPending ? '-' : Number(r.final_score).toFixed(2)}
                        </td>
                        <td>
                          {isPending ? (
                            <span className="rating-badge" style={{ backgroundColor: '#f59e0b', color: '#ffffff', fontWeight: '600' }}>
                              Pending
                            </span>
                          ) : (
                            <span className={`rating-badge ${getRatingClass(r.rating)}`}>
                              {r.rating || `${Number(r.final_score).toFixed(2)} / 3.0`}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {!isPending && r.submitted_date ? r.submitted_date.substring(0, 10) : '-'}
                        </td>
                        <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                          {!isPending && r.submitted_by_detail ? r.submitted_by_detail.username : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {isPending ? (
                              <button
                                onClick={() => navigate(`/appraise?code=${r.employee_code}`)}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                title="Go to Appraisal Form"
                              >
                                Go to Form
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleViewClick(r)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '6px', minWidth: 'auto' }}
                                title="View Appraisal Details"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: INCENTIVE CALCULATIONS VIEW                       */}
      {/* ======================================================== */}
      {activeTab === 'incentives' && (
        <div>
          {/* Incentive Cycle & Period Selector Ribbon */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', backgroundColor: 'rgba(234, 88, 12, 0.03)', borderColor: 'rgba(234, 88, 12, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>Incentive Period:</span>
                </div>
                <select 
                  className="form-control"
                  style={{ minWidth: '260px', fontWeight: '600', borderColor: 'var(--accent)' }}
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                >
                  {incentivePeriods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.months ? `(${p.months})` : ''} - Cut-off: {p.cutoff_date} {p.is_active ? '★ ACTIVE' : ''}
                    </option>
                  ))}
                </select>

                {selectedPeriodObj && (
                  <span style={{ 
                    fontSize: '12px', 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(22, 101, 52, 0.1)', 
                    color: '#166534', 
                    fontWeight: '600' 
                  }}>
                    Cut-off: {selectedPeriodObj.cutoff_date}
                  </span>
                )}
              </div>

              {/* Action Buttons for Processing & Direct Downloads */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleExportIncentivesExcel}
                  title="Download full staff incentive report in Excel format"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download Excel</span>
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportIncentivesCSV}
                  title="Download full staff incentive report in CSV format"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>

                {selectedEmployeeIds.size > 0 && (
                  <>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleProcessIncentives('process', false)}
                      disabled={processingAction}
                      style={{ backgroundColor: '#166534', borderColor: '#166534' }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Process Selected ({selectedEmployeeIds.size})</span>
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleProcessIncentives('revert', false)}
                      disabled={processingAction}
                      style={{ color: '#b45309' }}
                    >
                      <RotateCcw size={15} />
                      <span>Revert Selected ({selectedEmployeeIds.size})</span>
                    </button>
                  </>
                )}

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleProcessIncentives('process', true)}
                  disabled={processingAction || incentiveData?.records?.length === 0}
                  title="Process all staff matching current filters for this period"
                >
                  <ShieldCheck size={15} />
                  <span>Process All ({incentiveData?.records?.length || 0})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Incentive Summary KPI Cards */}
          <div className="grid-cols-4" style={{ gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Total Staff</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>
                {incentiveData.summary?.total_employees || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Eligible for incentive</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Total Incentive Payout</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534', marginTop: '4px' }}>
                ₹{(incentiveData.summary?.total_incentive_amount || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Sum of all calculated staff</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Processed Staff</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)', marginTop: '4px' }}>
                {incentiveData.summary?.processed_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Approved by Admin</div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Pending (Draft)</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#b45309', marginTop: '4px' }}>
                {incentiveData.summary?.draft_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting processing</div>
            </div>
          </div>

          {/* Incentive Filters */}
          <div className="filter-bar" style={{ marginBottom: '16px' }}>
            <div className="filter-item filter-search">
              <label className="form-label">Search (Code / Name)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by code or name..."
                  value={incSearch}
                  onChange={(e) => setIncSearch(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="filter-item">
              <label className="form-label">Division (from Excel)</label>
              <select className="form-control" value={incDivision} onChange={(e) => setIncDivision(e.target.value)}>
                <option value="">All Divisions</option>
                {divisionList.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Department</label>
              <select className="form-control" value={incDepartment} onChange={(e) => setIncDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label">Payout Status</label>
              <select className="form-control" value={incStatus} onChange={(e) => setIncStatus(e.target.value)}>
                <option value="all">All (Processed & Draft)</option>
                <option value="processed">Processed Only</option>
                <option value="draft">Draft / Pending Only</option>
              </select>
            </div>

            <div className="filter-item" style={{ flexGrow: 0, alignSelf: 'flex-end' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={fetchIncentiveData}
                title="Refresh Calculation"
                style={{ height: '38px', padding: '0 14px' }}
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Incentive Table with 20-per-page Pagination */}
          {incentiveLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
              <span className="spinner"></span>
            </div>
          ) : incentiveData.records?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No staff incentive records found for the selected period ({selectedPeriodObj?.name || 'Active Period'}). Only staff added for this period will be displayed.
            </div>
          ) : (() => {
            const totalIncRecords = incentiveData.records?.length || 0;
            const totalIncPages = Math.ceil(totalIncRecords / INC_PAGE_SIZE) || 1;
            const paginatedRecords = (incentiveData.records || []).slice(
              (incCurrentPage - 1) * INC_PAGE_SIZE,
              incCurrentPage * INC_PAGE_SIZE
            );
            return (
              <div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={selectedEmployeeIds.size > 0 && selectedEmployeeIds.size === incentiveData.records.length}
                            onChange={handleToggleSelectAll}
                            title="Select All Staff"
                          />
                        </th>
                        <th>Code</th>
                        <th>Employee Name</th>
                        <th>Division</th>
                        <th>Department</th>
                        <th>Joining Date</th>
                        <th style={{ textAlign: 'center' }}>Level 1 (Level)</th>
                        <th style={{ textAlign: 'center' }}>Level 2 (Exp)</th>
                        <th style={{ textAlign: 'center' }}>Level 3 (Appraisal)</th>
                        <th style={{ textAlign: 'center' }}>Total Units</th>
                        <th style={{ textAlign: 'right' }}>Div Rate (₹)</th>
                        <th style={{ textAlign: 'right' }}>Final Amount (₹)</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((rec) => {
                        const isChecked = selectedEmployeeIds.has(rec.employee_id);
                        return (
                          <tr key={rec.employee_id} style={{ backgroundColor: isChecked ? 'rgba(234, 88, 12, 0.04)' : 'transparent' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => handleToggleSelectRow(rec.employee_id)}
                              />
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{rec.employee_code}</td>
                            <td style={{ fontWeight: '500' }}>{rec.employee_name}</td>
                            <td>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0369a1' }}>
                                {rec.division || 'Unassigned'}
                              </span>
                            </td>
                            <td>{rec.department}</td>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {rec.date_of_joining || rec.joining_date || '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span title={`Level: ${rec.level_code || rec.employee_level || '-'}`}>
                                <strong>{rec.level_code || rec.employee_level || '-'}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  ({Number(rec.level1_score || 0).toFixed(2)})
                                </span>
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span title={`${rec.experience_display || ''} (${rec.experience_bracket || ''})`}>
                                <strong>{rec.months_of_experience || rec.experience_months || 0}m</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  ({Number(rec.level2_score || 0).toFixed(2)})
                                </span>
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span title={`Marks: ${rec.marks_obtained || 0}/100`}>
                                <strong style={{ color: 'var(--primary)' }}>{Number(rec.level3_score || 0).toFixed(2)}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '2px' }}>/3.0</span>
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: '700', color: '#7c3aed' }}>
                              {Number(rec.total_units || rec.total_unit_score || 0).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '500' }}>
                              ₹{Number(rec.division_rate || 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: '#166534', fontSize: '14px' }}>
                              ₹{Number(rec.final_amount || rec.final_incentive_amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {rec.is_processed || rec.status === 'Processed' ? (
                                <span className="rating-badge rating-a" style={{ fontSize: '11px', padding: '3px 8px' }}>
                                  Processed
                                </span>
                              ) : (
                                <span className="rating-badge rating-c" style={{ fontSize: '11px', padding: '3px 8px' }}>
                                  Draft
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenBreakdown(rec)}
                                  title="View Detailed Calculation Breakdown"
                                  style={{ padding: '6px' }}
                                >
                                  <Eye size={14} />
                                </button>
                                {rec.is_processed || rec.status === 'Processed' ? (
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleProcessIncentives('revert', false, rec.employee_id)}
                                    title="Revert to Draft"
                                    style={{ padding: '6px', color: '#b45309' }}
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                ) : (
                                  <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleProcessIncentives('process', false, rec.employee_id)}
                                    title="Process Incentive"
                                    style={{ padding: '6px', backgroundColor: '#166534', borderColor: '#166534' }}
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls - Strictly 20 records per page */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '16px', 
                  padding: '12px 18px', 
                  backgroundColor: 'var(--card-bg, #fff)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm, 8px)', 
                  flexWrap: 'wrap', 
                  gap: '12px' 
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Showing <strong>{totalIncRecords > 0 ? (incCurrentPage - 1) * INC_PAGE_SIZE + 1 : 0}</strong> to <strong>{Math.min(incCurrentPage * INC_PAGE_SIZE, totalIncRecords)}</strong> of <strong>{totalIncRecords}</strong> staff records (Page {incCurrentPage} of {totalIncPages})
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={incCurrentPage <= 1}
                      onClick={() => setIncCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalIncPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalIncPages || Math.abs(p - incCurrentPage) <= 2)
                      .map((pageNum, idx, arr) => (
                        <React.Fragment key={pageNum}>
                          {idx > 0 && pageNum - arr[idx - 1] > 1 && (
                            <span style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '12px' }}>...</span>
                          )}
                          <button
                            className={`btn btn-sm ${incCurrentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                              minWidth: '32px', 
                              padding: '4px 8px', 
                              fontSize: '12px',
                              fontWeight: incCurrentPage === pageNum ? '700' : 'normal'
                            }}
                            onClick={() => setIncCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={incCurrentPage >= totalIncPages}
                      onClick={() => setIncCurrentPage(prev => Math.min(totalIncPages, prev + 1))}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: VIEW/PRINT APPRAISAL FORM                       */}
      {/* ======================================================== */}
      {isModalOpen && selectedAppraisal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              className="btn-print-hide" 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div id="print-area">
              <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h2 style={{ fontSize: '22px', color: 'var(--text-main)' }}>Employee Performance Appraisal</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    Record Submitted: {new Date(selectedAppraisal.submitted_date).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`rating-badge ${getRatingClass(selectedAppraisal.rating)}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                    {selectedAppraisal.rating || `${Number(selectedAppraisal.final_score).toFixed(2)} / 3.0`}
                  </span>
                </div>
              </div>

              {/* Employee Master Section */}
              <h3 style={{ fontSize: '15px', color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Employee Details</h3>
              <div className="grid-cols-2" style={{ gap: '16px', marginBottom: '24px', fontSize: '14px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div>Employee Code: <strong>{selectedAppraisal.employee_code}</strong></div>
                <div>Employee Name: <strong>{selectedAppraisal.employee_name}</strong></div>
                <div>Department: <strong>{selectedAppraisal.department}</strong></div>
                <div>Location: <strong>{selectedAppraisal.location || ''}</strong></div>
                <div>Designation: <strong>{selectedAppraisal.designation}</strong></div>
                <div>Date of Joining: <strong>{selectedAppraisal.date_of_joining}</strong></div>
                <div>Assignment Period: <strong>{selectedAppraisal.assignment_period}</strong></div>
              </div>

              {/* Scores Grid */}
              <h3 style={{ fontSize: '15px', color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Performance Domain Scores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {[
                  { name: 'Job Competence', val: selectedAppraisal.job_competence, desc: 'Technical skills, work quality, job knowledge, accuracy' },
                  { name: 'Productivity & Responsibility', val: selectedAppraisal.productivity_responsibility, desc: 'Task completion speed, volume of work, taking ownership' },
                  { name: 'Communication & Teamwork', val: selectedAppraisal.communication_teamwork, desc: 'Clarity, collaborative skills, relationship with colleagues' },
                  { name: 'Professionalism & Discipline', val: selectedAppraisal.professionalism_discipline, desc: 'Punctuality, dress code, adherence to guidelines' },
                  { name: 'Initiative & Continuous Improvement', val: selectedAppraisal.initiative_improvement, desc: 'Proactivity, problem-solving, self-learning, innovation' }
                ].map((dom, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{i + 1}. {dom.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dom.desc}</div>
                    </div>
                    <strong style={{ color: 'var(--primary)', fontSize: '15px' }}>{dom.val} / 20</strong>
                  </div>
                ))}
              </div>

              {/* Totals & Score Basis Calculation */}
              <div className="grid-cols-2" style={{ gap: '20px', marginBottom: '24px' }}>
                
                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Attendance Deductions</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span>Unapproved Absences:</span>
                    <span>Reviewed Manual Entry</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span>Punctuality Flags:</span>
                    <span>Reviewed Manual Entry</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px', fontWeight: '600' }}>
                    <span>Total Deduction:</span>
                    <span style={{ color: 'var(--color-e)' }}>-{selectedAppraisal.total_deduction}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', border: '2px solid var(--primary)', borderRadius: 'var(--radius-sm)', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Marks Obtained:</span>
                    <strong>{selectedAppraisal.marks_obtained !== undefined ? selectedAppraisal.marks_obtained : selectedAppraisal.performance_score} / 100</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Deduction:</span>
                    <strong style={{ color: 'var(--color-e)' }}>-{selectedAppraisal.total_deduction}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Formula:</span>
                    <span>(Marks × 3) / 100</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                    <span>Final Score:</span>
                    <span style={{ color: 'var(--accent)' }}>{Number(selectedAppraisal.final_score).toFixed(2)} / 3.00</span>
                  </div>
                </div>

              </div>

              {/* Signatures */}
              <div className="grid-cols-2" style={{ marginTop: '40px', gap: '40px', borderTop: '1px dashed var(--border-color)', paddingTop: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ borderTop: '1px solid var(--text-muted)', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '6px' }}>
                    Reviewer / Submitted By ({selectedAppraisal.submitted_by_detail ? selectedAppraisal.submitted_by_detail.username : 'System'})
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ borderTop: '1px solid var(--text-muted)', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '6px' }}>
                    Employee Signature
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIncSearch(selectedAppraisal.employee_code);
                    handleTabChange('incentives');
                  }}
                >
                  <Award size={16} />
                  <span>View Staff Incentive Payout</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>Print Appraisal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DETAILED INCENTIVE BREAKDOWN (User Requested)  */}
      {/* ======================================================== */}
      {isIncentiveModalOpen && selectedIncentiveRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              className="btn-print-hide" 
              onClick={() => setIsIncentiveModalOpen(false)}
              style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div id="incentive-slip-print">
              {/* Slip Header */}
              <div style={{ borderBottom: '2px solid var(--accent)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Sparkles size={16} />
                    <span>Incentive Calculation Slip</span>
                  </div>
                  <h2 style={{ fontSize: '22px', color: 'var(--text-main)', marginTop: '4px' }}>
                    {selectedIncentiveRecord.employee_name} ({selectedIncentiveRecord.employee_code})
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                    Cycle: <strong>{selectedPeriodObj ? selectedPeriodObj.name : 'Current'}</strong> | Cut-off Date: <strong>{selectedPeriodObj ? selectedPeriodObj.cutoff_date : '-'}</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {selectedIncentiveRecord.is_processed || selectedIncentiveRecord.status === 'Processed' ? (
                    <span className="rating-badge rating-a" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      ✓ Processed
                    </span>
                  ) : (
                    <span className="rating-badge rating-c" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      Draft / Pending
                    </span>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Division: <strong>{selectedIncentiveRecord.division || 'Unassigned'}</strong>
                  </div>
                </div>
              </div>

              {/* Staff Details Snapshot */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '12px', 
                padding: '14px', 
                backgroundColor: 'rgba(0,0,0,0.02)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                <div>Department: <strong>{selectedIncentiveRecord.department}</strong></div>
                <div>Designation: <strong>{selectedIncentiveRecord.designation || '-'}</strong></div>
                <div>Duty Location: <strong>{selectedIncentiveRecord.duty_location || selectedIncentiveRecord.location || '-'}</strong></div>
                <div>Joining Date: <strong>{selectedIncentiveRecord.date_of_joining || selectedIncentiveRecord.joining_date || '-'}</strong></div>
                <div>Employee Level: <strong>{selectedIncentiveRecord.level_code || selectedIncentiveRecord.employee_level || 'N/A'}</strong></div>
                <div>Division Fixed Rate: <strong>₹{Number(selectedIncentiveRecord.division_rate || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              {/* Step-by-Step Calculation Breakdown Card */}
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                How this staff achieved the incentive amount
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                
                {/* Level 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                      Level 1: Staff Designation Level
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Level assigned: <strong>{selectedIncentiveRecord.level_code || selectedIncentiveRecord.employee_level || 'Default'}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                      +{Number(selectedIncentiveRecord.level1_score || 0).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>units</span>
                  </div>
                </div>

                {/* Level 2 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                      Level 2: Hospital Service Experience
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Experience up to cut-off: <strong>{selectedIncentiveRecord.months_of_experience || selectedIncentiveRecord.experience_months || 0} months</strong>
                      {selectedIncentiveRecord.experience_bracket && ` (${selectedIncentiveRecord.experience_bracket})`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                      +{Number(selectedIncentiveRecord.level2_score || 0).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>units</span>
                  </div>
                </div>

                {/* Level 3 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                      Level 3: Appraisal Assessment Score
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Formula: <code>(Marks Obtained × 3) / 100</code> | Marks: <strong>{selectedIncentiveRecord.marks_obtained !== undefined ? selectedIncentiveRecord.marks_obtained : (selectedIncentiveRecord.appraisal_marks || 0)} / 100</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent)' }}>
                      +{Number(selectedIncentiveRecord.level3_score || 0).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>/ 3.00 units</span>
                  </div>
                </div>

                {/* Total Units Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#7c3aed' }}>
                      Total Score Units (Level 1 + Level 2 + Level 3)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {Number(selectedIncentiveRecord.level1_score || 0).toFixed(2)} + {Number(selectedIncentiveRecord.level2_score || 0).toFixed(2)} + {Number(selectedIncentiveRecord.level3_score || 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#7c3aed' }}>
                      = {Number(selectedIncentiveRecord.total_units || selectedIncentiveRecord.total_unit_score || 0).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>units</span>
                  </div>
                </div>

                {/* Final Calculation Banner */}
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)', 
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(22, 101, 52, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                        Final Incentive Payout Formula
                      </div>
                      <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.95 }}>
                        Total Units ({Number(selectedIncentiveRecord.total_units || selectedIncentiveRecord.total_unit_score || 0).toFixed(2)}) × Division Rate (₹{Number(selectedIncentiveRecord.division_rate || 0).toLocaleString('en-IN')})
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>TOTAL PAYABLE AMOUNT</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                        ₹{Number(selectedIncentiveRecord.final_amount || selectedIncentiveRecord.final_incentive_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Audit / Process metadata */}
              <div style={{ padding: '12px 16px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  Status: <strong>{selectedIncentiveRecord.is_processed || selectedIncentiveRecord.status === 'Processed' ? 'Processed / Approved' : 'Draft'}</strong>
                  {selectedIncentiveRecord.processed_at && (
                    <span style={{ marginLeft: '12px' }}>
                      Processed at: {new Date(selectedIncentiveRecord.processed_at).toLocaleString()}
                    </span>
                  )}
                  {selectedIncentiveRecord.processed_by && (
                    <span style={{ marginLeft: '12px' }}>
                      By: {selectedIncentiveRecord.processed_by}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {selectedIncentiveRecord.is_processed || selectedIncentiveRecord.status === 'Processed' ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => handleProcessIncentives('revert', false, selectedIncentiveRecord.employee_id)}
                    disabled={processingAction}
                    style={{ color: '#b45309' }}
                  >
                    <RotateCcw size={16} />
                    <span>Revert to Draft</span>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => handleProcessIncentives('process', false, selectedIncentiveRecord.employee_id)}
                    disabled={processingAction}
                    style={{ backgroundColor: '#166534', borderColor: '#166534' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Process & Approve This Staff</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsIncentiveModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
