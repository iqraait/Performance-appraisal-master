import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileCheck,
  Clock,
  Award,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart2,
  User,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HeartPulse,
  Droplet,
  Sparkles,
  FlaskConical,
  Activity,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
  X,
  MapPin,
  Briefcase,
  Layers,
  Filter
} from 'lucide-react';

export default function Dashboard({ token, user, selectedBranch }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Table Controls & Filter states
  const [activeTableTab, setActiveTableTab] = useState('pending'); // 'pending' | 'submitted' | 'all'
  const [tableSearch, setTableSearch] = useState('');
  const [tableDeptFilter, setTableDeptFilter] = useState('All');
  const [tableLocFilter, setTableLocFilter] = useState('All');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_ITEMS_PER_PAGE = 10;

  // Details Modal state
  const [modalItem, setModalItem] = useState(null);

  // Pagination states for visual charts (5 items per page)
  const ITEMS_PER_PAGE = 5;
  const [deptPage, setDeptPage] = useState(1);
  const [ratioPage, setRatioPage] = useState(1);

  const isDeptAdmin = Boolean(user && user.role === 'department_admin');

  useEffect(() => {
    // Reset to page 1 whenever department chart filter changes
    setDeptPage(1);
  }, [deptFilter]);

  useEffect(() => {
    // Reset table pagination when search or filters change
    setTablePage(1);
  }, [tableSearch, tableDeptFilter, tableLocFilter, activeTableTab]);

  useEffect(() => {
    // Format live date & time: e.g. "14 Oct 2026, 05:12 PM"
    const updateDateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hoursFormatted = hours.toString().padStart(2, '0');
      setCurrentTimeStr(`${day} ${month} ${year}, ${hoursFormatted}:${minutes} ${ampm}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const branchQuery = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : '';
        const response = await fetch(`http://${window.location.hostname}:8000/api/dashboard/${branchQuery}`, {
          headers: {
            'Authorization': `Token ${token}`,
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          if ((data.pending_list || []).length === 0 && (data.submitted_list || []).length > 0) {
            setActiveTableTab('submitted');
          }
        } else {
          setError('Failed to fetch dashboard statistics.');
        }
      } catch (err) {
        setError('Error connecting to API backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, selectedBranch]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    total_employees = 0,
    total_appraisals = 0,
    pending_appraisals = 0,
    completion_rate = 0,
    ratings = {},
    score_distribution = [],
    department_stats = [],
    pending_list = [],
    submitted_list = [],
    dept_admin_info = null,
    active_period = null
  } = stats || {};

  // Helper for department specific medical icons
  const getDeptIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('academy') || n.includes('train') || n.includes('educat')) {
      return <GraduationCap size={16} color="#0284c7" />;
    }
    if (n.includes('bio') || n.includes('biomedical') || n.includes('equip')) {
      return <Activity size={16} color="#059669" />;
    }
    if (n.includes('blood')) {
      return <Droplet size={16} color="#dc2626" />;
    }
    if (n.includes('cardio') || n.includes('heart')) {
      return <HeartPulse size={16} color="#9333ea" />;
    }
    if (n.includes('sterile') || n.includes('cssd') || n.includes('supply')) {
      return <Sparkles size={16} color="#2563eb" />;
    }
    if (n.includes('lab') || n.includes('clinic') || n.includes('patho')) {
      return <FlaskConical size={16} color="#0284c7" />;
    }
    if (n.includes('nutri') || n.includes('diet')) {
      return <Activity size={16} color="#0284c7" />;
    }
    if (n.includes('dent')) {
      return <Sparkles size={16} color="#2563eb" />;
    }
    return <Activity size={16} color="#0066ff" />;
  };

  // Helper for 5-tier score rating badge & info
  const getScoreTierInfo = (score) => {
    const s = Number(score) || 0;
    if (s >= 2.70) return { label: '2.70 – 3.00 (Tier 1)', pct: '90% – 100%', color: '#00b87c', bg: '#ecfdf5', border: '#a7f3d0' };
    if (s >= 2.25) return { label: '2.25 – 2.69 (Tier 2)', pct: '75% – 89%', color: '#0066ff', bg: '#eff6ff', border: '#bfdbfe' };
    if (s >= 1.80) return { label: '1.80 – 2.24 (Tier 3)', pct: '60% – 74%', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' };
    if (s >= 1.50) return { label: '1.50 – 1.79 (Tier 4)', pct: '50% – 59%', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' };
    return { label: '< 1.50 (Tier 5)', pct: 'Below 50%', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
  };

  // Real departments from database submissions
  const displayDepartments = department_stats || [];

  const filteredDepartments = deptFilter === 'All Departments'
    ? displayDepartments
    : displayDepartments.filter(d => d.department === deptFilter);

  // Department Pagination Calculations (5 items per page)
  const totalDeptPages = Math.ceil(filteredDepartments.length / ITEMS_PER_PAGE) || 1;
  const currentDeptPageSafe = Math.min(deptPage, totalDeptPages);
  const paginatedDepartments = filteredDepartments.slice(
    (currentDeptPageSafe - 1) * ITEMS_PER_PAGE,
    currentDeptPageSafe * ITEMS_PER_PAGE
  );

  // 5 Score tiers on 3.0 scale
  const defaultScoreTiers = [
    { key: 'tier1', scoreRange: '2.70 – 3.00', pct: '90% – 100%', label: 'Score 2.70 – 3.00 (90% – 100%)', color: '#00b87c' },
    { key: 'tier2', scoreRange: '2.25 – 2.69', pct: '75% – 89%', label: 'Score 2.25 – 2.69 (75% – 89%)', color: '#0066ff' },
    { key: 'tier3', scoreRange: '1.80 – 2.24', pct: '60% – 74%', label: 'Score 1.80 – 2.24 (60% – 74%)', color: '#8b5cf6' },
    { key: 'tier4', scoreRange: '1.50 – 1.79', pct: '50% – 59%', label: 'Score 1.50 – 1.79 (50% – 59%)', color: '#f97316' },
    { key: 'tier5', scoreRange: '< 1.50', pct: 'Below 50%', label: 'Score < 1.50 (Below 50%)', color: '#ef4444' },
  ];

  const tiersList = (score_distribution && score_distribution.length > 0)
    ? score_distribution.map(s => ({
        key: s.key,
        scoreRange: s.short_label || s.score_range,
        pct: s.percentage_range,
        label: s.label,
        count: s.count,
        color: s.color
      }))
    : defaultScoreTiers.map(t => ({
        ...t,
        count: ratings?.[t.key] ?? ratings?.[t.key.replace('tier', '')] ?? 0
      }));

  const totalRatioPages = Math.ceil(tiersList.length / ITEMS_PER_PAGE) || 1;
  const currentRatioPageSafe = Math.min(ratioPage, totalRatioPages);
  const paginatedTiers = tiersList.slice(
    (currentRatioPageSafe - 1) * ITEMS_PER_PAGE,
    currentRatioPageSafe * ITEMS_PER_PAGE
  );

  // Combined and filtered data for Department Appraisal Details Table
  const allEmployeesList = useMemo(() => {
    const list = [
      ...pending_list.map(emp => ({ ...emp, isSubmitted: false })),
      ...submitted_list.map(app => ({ ...app, isSubmitted: true }))
    ];
    return list;
  }, [pending_list, submitted_list]);

  // Extract unique departments and locations for table filter dropdowns
  const availableTableDepts = useMemo(() => {
    if (isDeptAdmin) {
      return (user?.departments || []).slice().sort();
    }
    const deptsSet = new Set();
    allEmployeesList.forEach(e => {
      if (e.department) {
        e.department.split(',').forEach(d => {
          if (d.trim()) deptsSet.add(d.trim());
        });
      }
    });
    return Array.from(deptsSet).sort();
  }, [isDeptAdmin, user, allEmployeesList]);

  const availableTableLocs = useMemo(() => {
    if (isDeptAdmin) {
      return (user?.locations || []).slice().sort();
    }
    const locsSet = new Set();
    allEmployeesList.forEach(e => {
      if (e.location) {
        e.location.split(',').forEach(l => {
          if (l.trim()) locsSet.add(l.trim());
        });
      }
    });
    return Array.from(locsSet).sort();
  }, [isDeptAdmin, user, allEmployeesList]);

  const filteredTableData = useMemo(() => {
    let source = [];
    if (activeTableTab === 'pending') {
      source = pending_list.map(emp => ({ ...emp, isSubmitted: false }));
    } else if (activeTableTab === 'submitted') {
      source = submitted_list.map(app => ({ ...app, isSubmitted: true }));
    } else {
      source = allEmployeesList;
    }

    return source.filter(item => {
      // Search matching code, name, designation, department, location
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const codeMatch = (item.employee_code || '').toLowerCase().includes(q);
        const nameMatch = (item.name || item.employee_name || '').toLowerCase().includes(q);
        const desigMatch = (item.designation || '').toLowerCase().includes(q);
        const deptMatch = (item.department || '').toLowerCase().includes(q);
        const locMatch = (item.location || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !desigMatch && !deptMatch && !locMatch) {
          return false;
        }
      }

      // Department filter (support multi-tagged departments)
      if (tableDeptFilter !== 'All') {
        const itemDepts = (item.department || '').split(',').map(d => d.trim().toLowerCase());
        if (!itemDepts.includes(tableDeptFilter.toLowerCase())) {
          return false;
        }
      }

      // Location filter (support multi-tagged locations)
      if (tableLocFilter !== 'All') {
        const itemLocs = (item.location || '').split(',').map(l => l.trim().toLowerCase());
        if (!itemLocs.includes(tableLocFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [activeTableTab, pending_list, submitted_list, allEmployeesList, tableSearch, tableDeptFilter, tableLocFilter]);

  // Table pagination calculations (10 items per page)
  const totalTablePages = Math.ceil(filteredTableData.length / TABLE_ITEMS_PER_PAGE) || 1;
  const currentTablePageSafe = Math.min(tablePage, totalTablePages);
  const paginatedTableData = filteredTableData.slice(
    (currentTablePageSafe - 1) * TABLE_ITEMS_PER_PAGE,
    currentTablePageSafe * TABLE_ITEMS_PER_PAGE
  );

  // Open details modal for an employee / appraisal
  const handleOpenModal = (item) => {
    // If opened from pending list, check if there's any matching submission just in case
    const submittedMatch = submitted_list.find(s => s.employee_code === item.employee_code);
    if (submittedMatch) {
      setModalItem({ ...submittedMatch, isSubmitted: true });
    } else {
      setModalItem(item);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading-state">
        <span className="spinner"></span>
        <span className="loading-label">Loading Dashboard Analytics & Details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card dashboard-error-card">
        <ShieldCheck size={28} color="#ef4444" />
        <div>
          <h3>Dashboard Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* Top Header Row: Welcome Title + Branch & Date Pills */}
      <div className="dashboard-top-banner">
        <div className="dashboard-headline-wrap">
          <div className="welcome-kicker">
            {isDeptAdmin ? 'DEPARTMENT ADMINISTRATOR HUB' : 'EXECUTIVE DASHBOARD'}
          </div>
          <h1 className="dashboard-main-title">
            {isDeptAdmin ? 'Department Dashboard' : 'Executive Dashboard'}
          </h1>
          <p className="dashboard-sub-title">
            {isDeptAdmin 
              ? 'Overview of appraisal submissions, staff scores, and pending reviews for your department(s)'
              : 'Overview of appraisal submissions, overall institutional metrics, and employee performance'}
          </p>
        </div>

        <div className="dashboard-top-pills">
          {/* Branch Pill */}
          <div 
            className="branch-indicator-pill"
            title={selectedBranch || 'IQRAA INTERNATIONAL HOSPITAL'}
          >
            <div className="branch-pill-icon-circle">
              <Building2 size={16} color="#ffffff" />
            </div>
            <span className="branch-pill-text">
              Branch: {selectedBranch ? (selectedBranch.length > 24 ? selectedBranch.substring(0, 24) + '..' : selectedBranch) : 'IQRAA INTERNATIONAL HOSPITAL..'}
            </span>
            <ChevronDown size={14} className="branch-pill-chevron" />
          </div>

          {/* Date & Time Pill */}
          <div className="date-indicator-pill">
            <Calendar size={18} className="date-pill-icon" />
            <div className="date-pill-text-col">
              <span className="date-pill-label">Today</span>
              <span className="date-pill-time">{currentTimeStr || 'Live Date'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Department Admin Overview & Identity Banner */}
      {isDeptAdmin && (
        <div className="dept-admin-overview-card">
          <div className="dept-admin-overview-top">
            <div className="dept-admin-identity">
              <div className="dept-admin-avatar-badge">
                <ShieldCheck size={22} color="#ffffff" />
              </div>
              <div className="dept-admin-title-text">
                <span className="dept-admin-badge-label">Assigned Department Administrator</span>
                <span className="dept-admin-user-name">
                  {user?.username || 'Department Admin'}
                  {dept_admin_info?.email ? ` (${dept_admin_info.email})` : ''}
                </span>
              </div>
            </div>

            <div className="dept-admin-pills-row">
              {/* Active Period */}
              {active_period && (
                <span className="dept-meta-pill dept-meta-pill-period" title="Active Incentive Period">
                  <Calendar size={13} />
                  <span>Period: {active_period}</span>
                </span>
              )}

              {/* Tagged Departments */}
              {user?.departments && user.departments.length > 0 && (
                <span className="dept-meta-pill dept-meta-pill-dept" title="Tagged Departments">
                  <Building2 size={13} />
                  <span>{user.departments.length === 1 ? `Dept: ${user.departments[0]}` : `Depts: ${user.departments.join(', ')}`}</span>
                </span>
              )}

              {/* Tagged Locations */}
              {user?.locations && user.locations.length > 0 && (
                <span className="dept-meta-pill dept-meta-pill-loc" title="Assigned Duty Locations">
                  <MapPin size={13} />
                  <span>{user.locations.length === 1 ? `Location: ${user.locations[0]}` : `Locations: ${user.locations.join(', ')}`}</span>
                </span>
              )}

              {/* Tagged Branch */}
              {selectedBranch && (
                <span className="dept-meta-pill dept-meta-pill-branch" title="Hospital Branch">
                  <Building2 size={13} />
                  <span>{selectedBranch}</span>
                </span>
              )}
            </div>
          </div>

          {/* Department Completion Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              <span>Department Appraisal Completion Progress</span>
              <span style={{ color: '#0066ff', fontWeight: 700 }}>
                {total_appraisals} of {total_employees} Completed ({completion_rate}%)
              </span>
            </div>
            <div className="kpi-progress-bar-wrap" style={{ height: '8px', marginTop: '6px' }}>
              <div 
                className="kpi-progress-bar-fill" 
                style={{ width: `${Math.min(100, completion_rate)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Executive Metric Cards (Total Employees, Appraisals Submitted, Pending, and Completion Rate) */}
      <div className="dashboard-kpi-grid">
        {/* Card 1: Total Employees */}
        <div className="card kpi-card kpi-card-blue">
          <div className="kpi-card-inner">
            <div className="kpi-icon-badge kpi-icon-blue">
              <Users size={20} color="#0066ff" />
            </div>
            <div className="kpi-content">
              <span className="kpi-title">{isDeptAdmin ? 'DEPARTMENT STAFF' : 'TOTAL EMPLOYEES'}</span>
              <div className="kpi-number">{total_employees}</div>
              <div className="kpi-trend up">
                <TrendingUp size={13} />
                <span>Active Period Staff</span>
              </div>
            </div>
          </div>
          <Users size={84} className="kpi-watermark-icon" aria-hidden="true" />
        </div>

        {/* Card 2: Appraisals Submitted */}
        <div className="card kpi-card kpi-card-green">
          <div className="kpi-card-inner">
            <div className="kpi-icon-badge kpi-icon-green">
              <FileCheck size={20} color="#00b87c" />
            </div>
            <div className="kpi-content">
              <span className="kpi-title">APPRAISALS SUBMITTED</span>
              <div className="kpi-number">{total_appraisals}</div>
              <div className="kpi-trend up">
                <CheckCircle2 size={13} />
                <span>Completed Reviews</span>
              </div>
            </div>
          </div>
          <FileCheck size={84} className="kpi-watermark-icon" aria-hidden="true" />
        </div>

        {/* Card 3: Pending Appraisals */}
        <div className="card kpi-card kpi-card-orange">
          <div className="kpi-card-inner">
            <div className="kpi-icon-badge kpi-icon-orange">
              <Clock size={20} color="#f97316" />
            </div>
            <div className="kpi-content">
              <span className="kpi-title">PENDING APPRAISALS</span>
              <div className="kpi-number">{pending_appraisals}</div>
              <div className="kpi-trend down">
                <Clock size={13} />
                <span>Awaiting Submission</span>
              </div>
            </div>
          </div>
          <Clock size={84} className="kpi-watermark-icon" aria-hidden="true" />
        </div>

        {/* Card 4: Completion Rate */}
        <div className="card kpi-card kpi-card-purple">
          <div className="kpi-card-inner">
            <div className="kpi-icon-badge kpi-icon-purple">
              <Award size={20} color="#8b5cf6" />
            </div>
            <div className="kpi-content">
              <span className="kpi-title">COMPLETION RATE</span>
              <div className="kpi-number">{completion_rate}%</div>
              <div className="kpi-trend up">
                <Activity size={13} />
                <span>{total_appraisals} / {total_employees || 1} Appraised</span>
              </div>
            </div>
          </div>
          <Award size={84} className="kpi-watermark-icon" aria-hidden="true" />
        </div>
      </div>

      {/* Middle Section: Performance Score Distribution (Out of 3.0) */}
      <div className="rating-distribution-section">
        <div className="rating-distribution-header">
          <div className="rating-distribution-title">
            <Award size={18} color="#0066ff" />
            <h2>Score Distribution (Out of 3.0 Scale)</h2>
          </div>
          <button 
            onClick={() => navigate('/reports')} 
            className="rating-distribution-details-btn"
            title="View Appraisal Reports"
          >
            <span>View Full Reports</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 5 Score Tier Mini Cards */}
        <div className="rating-mini-cards-grid">
          {tiersList.map((tier, idx) => {
            const count = tier.count ?? 0;
            const badgeClasses = ['rating-badge-a', 'rating-badge-b', 'rating-badge-c', 'rating-badge-d', 'rating-badge-e'];
            const cardClasses = ['rating-card-a', 'rating-card-b', 'rating-card-c', 'rating-card-d', 'rating-card-e'];
            return (
              <div key={tier.key} className={`card rating-mini-card ${cardClasses[idx] || ''}`}>
                <div className="rating-mini-content">
                  <span className="rating-mini-label" style={{ fontSize: '11px', fontWeight: '700' }}>{tier.scoreRange}</span>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: '500' }}>{tier.pct}</div>
                  <div className="rating-mini-val">{count}</div>
                </div>
                <div className={`rating-mini-badge ${badgeClasses[idx] || ''}`}>
                  <Award size={18} color={tier.color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: 2 Columns (Score Distribution Ratios & Average Scores by Department) */}
      <div className="dashboard-bottom-grid">
        {/* Left Column: Score Distribution Ratios (Paginated 5 per page) */}
        <div className="card dashboard-chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <BarChart2 size={18} color="#0066ff" />
              <span>Score Distribution Ratios</span>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot dot-blue"></span>
                <span>Active Period</span>
              </div>
            </div>
          </div>

          <div className="rating-ratios-list">
            {paginatedTiers.map(tier => {
              const count = tier.count ?? 0;
              const total = total_appraisals || 1;
              const percentage = total_appraisals ? Math.round((count / total) * 100) : 0;
              const displayWidth = percentage > 0 ? `${percentage}%` : '0%';

              return (
                <div key={tier.key} className="rating-ratio-row">
                  <div className="ratio-row-label" style={{ minWidth: '155px', fontWeight: '500' }}>
                    {tier.label}
                  </div>
                  <div className="ratio-row-track">
                    <div 
                      className="ratio-row-fill"
                      style={{ width: displayWidth, backgroundColor: tier.color }}
                    ></div>
                  </div>
                  <div className="ratio-row-value">{count} ({percentage}%)</div>
                </div>
              );
            })}
          </div>

          {/* Rating Ratios Pagination Bar */}
          <div className="card-pagination-bar">
            <span className="card-pagination-label">
              Showing {(currentRatioPageSafe - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentRatioPageSafe * ITEMS_PER_PAGE, tiersList.length)} of {tiersList.length}
            </span>
            <div className="card-pagination-actions">
              <button
                className="card-page-btn"
                disabled={currentRatioPageSafe <= 1}
                onClick={() => setRatioPage(p => Math.max(1, p - 1))}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalRatioPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  className={`card-page-num ${currentRatioPageSafe === num ? 'active' : ''}`}
                  onClick={() => setRatioPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="card-page-btn"
                disabled={currentRatioPageSafe >= totalRatioPages}
                onClick={() => setRatioPage(p => Math.min(totalRatioPages, p + 1))}
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Average Scores by Department (Paginated 5 per page) */}
        <div className="card dashboard-chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">
              <User size={18} color="#0066ff" />
              <span>Average Scores by Department</span>
            </div>
            <div className="department-filter-pill-wrap">
              <select
                className="department-filter-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                disabled={displayDepartments.length === 0}
              >
                <option value="All Departments">All Departments</option>
                {displayDepartments.map(d => (
                  <option key={d.department} value={d.department}>{d.department}</option>
                ))}
              </select>
              <ChevronDown size={13} className="department-select-arrow" />
            </div>
          </div>

          <div className="dept-scores-list">
            {displayDepartments.length === 0 ? (
              <div style={{ padding: '38px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Building2 size={34} color="var(--border-color)" style={{ marginBottom: '10px' }} />
                <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>No Submissions Yet</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>No department has completed appraisals for this period yet.</p>
              </div>
            ) : paginatedDepartments.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '12px', margin: 0 }}>No submissions found for selected department.</p>
              </div>
            ) : (
              paginatedDepartments.map((dept) => {
                const avg = Number(dept.avg_score || 0);
                const percentage = Math.min(100, Math.round((avg / 3.0) * 100));
                const barWidth = percentage > 0 ? `${Math.max(6, percentage)}%` : '0%';

                return (
                  <div key={dept.department} className="dept-score-row">
                    <div className="dept-score-info">
                      <span className="dept-score-icon">{getDeptIcon(dept.department)}</span>
                      <span className="dept-score-name" title={dept.department}>
                        {dept.department} <span className="dept-submissions">({dept.submitted} {dept.submitted === 1 ? 'Submission' : 'Submissions'})</span>
                      </span>
                    </div>
                    <div className="dept-score-track">
                      <div 
                        className="dept-score-fill"
                        style={{ width: barWidth }}
                      ></div>
                    </div>
                    <div className="dept-score-badge">
                      Avg: {avg.toFixed(2)} / 3.0
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Department Scores Pagination Bar */}
          {filteredDepartments.length > 0 && (
            <div className="card-pagination-bar">
              <span className="card-pagination-label">
                Showing {(currentDeptPageSafe - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentDeptPageSafe * ITEMS_PER_PAGE, filteredDepartments.length)} of {filteredDepartments.length}
              </span>
              <div className="card-pagination-actions">
                <button
                  className="card-page-btn"
                  disabled={currentDeptPageSafe <= 1}
                  onClick={() => setDeptPage(p => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalDeptPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    className={`card-page-num ${currentDeptPageSafe === num ? 'active' : ''}`}
                    onClick={() => setDeptPage(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="card-page-btn"
                  disabled={currentDeptPageSafe >= totalDeptPages}
                  onClick={() => setDeptPage(p => Math.min(totalDeptPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          DEPARTMENT APPRAISAL DETAILS & CORRESPONDING RECORDS SECTION
          ========================================================================= */}
      <div className="dashboard-table-section">
        <div className="table-section-header">
          <div>
            <h2 className="table-section-title">
              {isDeptAdmin ? 'Department Appraisal Details & Records' : 'Appraisal Records & Employee Details'}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
              Detailed tracking of pending reviews, submitted appraisals, and corresponding employee performance metrics
            </p>
          </div>
          <span className="table-section-count">
            {filteredTableData.length} {filteredTableData.length === 1 ? 'Record Found' : 'Records Found'}
          </span>
        </div>

        {/* Header Controls: Tab Switcher + Real-time Search + Dropdowns */}
        <div className="table-header-controls">
          {/* Tab Switcher */}
          <div className="dashboard-table-tabs">
            <button
              className={`dashboard-tab-btn ${activeTableTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTableTab('pending')}
            >
              <Clock size={15} />
              <span>Pending Reviews</span>
              <span className="tab-count-badge">{pending_list.length}</span>
            </button>
            <button
              className={`dashboard-tab-btn ${activeTableTab === 'submitted' ? 'active' : ''}`}
              onClick={() => setActiveTableTab('submitted')}
            >
              <CheckCircle2 size={15} />
              <span>Completed Submissions</span>
              <span className="tab-count-badge">{submitted_list.length}</span>
            </button>
            <button
              className={`dashboard-tab-btn ${activeTableTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTableTab('all')}
            >
              <Users size={15} />
              <span>All Staff</span>
              <span className="tab-count-badge">{allEmployeesList.length}</span>
            </button>
          </div>

          {/* Search Input & Filtering Controls */}
          <div className="dashboard-search-filters-row">
            {/* Search Box */}
            <div className="dashboard-search-input-wrap">
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search name, code, role..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Filter (if multiple available) */}
            {availableTableDepts.length > 1 && (
              <div className="dashboard-filter-select-wrap">
                <select
                  value={tableDeptFilter}
                  onChange={(e) => setTableDeptFilter(e.target.value)}
                >
                  <option value="All">All Departments ({availableTableDepts.length})</option>
                  {availableTableDepts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="select-arrow" />
              </div>
            )}

            {/* Location Filter (if multiple available) */}
            {availableTableLocs.length > 1 && (
              <div className="dashboard-filter-select-wrap">
                <select
                  value={tableLocFilter}
                  onChange={(e) => setTableLocFilter(e.target.value)}
                >
                  <option value="All">All Locations ({availableTableLocs.length})</option>
                  {availableTableLocs.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="select-arrow" />
              </div>
            )}
          </div>
        </div>

        {/* Table Card */}
        <div className="card table-card">
          {filteredTableData.length > 0 ? (
            <div className="table-responsive">
              <table className="executive-table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Duty Location</th>
                    <th>Designation</th>
                    {activeTableTab !== 'pending' && <th>Score / Rating</th>}
                    {activeTableTab !== 'pending' && <th>Score Tier</th>}
                    <th>Appraisal Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTableData.map((item) => {
                    const empCode = item.employee_code;
                    const empName = item.name || item.employee_name || '-';
                    const isSubmitted = Boolean(item.isSubmitted);
                    const tierInfo = isSubmitted ? getScoreTierInfo(item.final_score) : null;

                    return (
                      <tr key={`${empCode}-${item.id || 'p'}`}>
                        <td className="code-cell">{empCode}</td>
                        <td className="name-cell">{empName}</td>
                        <td>{item.department}</td>
                        <td>{item.location || '-'}</td>
                        <td>{item.designation}</td>
                        
                        {activeTableTab !== 'pending' && (
                          <td>
                            {isSubmitted ? (
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                {Number(item.final_score || 0).toFixed(2)} / 3.0
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending</span>
                            )}
                          </td>
                        )}

                        {activeTableTab !== 'pending' && (
                          <td>
                            {isSubmitted && tierInfo ? (
                              <span
                                className="tier-score-pill"
                                style={{
                                  backgroundColor: tierInfo.bg,
                                  color: tierInfo.color,
                                  border: `1px solid ${tierInfo.border}`
                                }}
                              >
                                {tierInfo.label}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                        )}

                        <td>
                          {isSubmitted ? (
                            <span className="status-pill status-pill-submitted">
                              <CheckCircle2 size={12} />
                              <span>Submitted</span>
                            </span>
                          ) : (
                            <span className="status-pill status-pill-pending">
                              <Clock size={12} />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* View Corresponding Details Modal Button */}
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="btn-table-action-details"
                              title="View full employee details and scoring breakdown"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>

                            {/* Direct Action Button */}
                            {!isSubmitted ? (
                              <button
                                onClick={() => navigate(`/appraise?code=${empCode}`)}
                                className="btn-table-action"
                                title="Open appraisal submission form"
                              >
                                Go to Form →
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/reports?search=${encodeURIComponent(empCode)}`)}
                                className="btn-table-action-report"
                                title="View completed appraisal report"
                              >
                                <ExternalLink size={13} />
                                <span>Report</span>
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
          ) : (
            <div className="empty-pending-state">
              <ShieldCheck size={36} color="#00b87c" />
              <p style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', margin: '4px 0 0 0' }}>
                No records matching your search or filter criteria.
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {activeTableTab === 'pending'
                  ? 'All appraisals for your department(s) are completed and submitted!'
                  : 'Try adjusting your search query or department/location filter.'}
              </p>
            </div>
          )}

          {/* Table Pagination Bar */}
          {filteredTableData.length > TABLE_ITEMS_PER_PAGE && (
            <div className="card-pagination-bar" style={{ marginTop: '16px' }}>
              <span className="card-pagination-label">
                Showing {(currentTablePageSafe - 1) * TABLE_ITEMS_PER_PAGE + 1}–{Math.min(currentTablePageSafe * TABLE_ITEMS_PER_PAGE, filteredTableData.length)} of {filteredTableData.length} records
              </span>
              <div className="card-pagination-actions">
                <button
                  className="card-page-btn"
                  disabled={currentTablePageSafe <= 1}
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalTablePages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    className={`card-page-num ${currentTablePageSafe === num ? 'active' : ''}`}
                    onClick={() => setTablePage(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="card-page-btn"
                  disabled={currentTablePageSafe >= totalTablePages}
                  onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          QUICK VIEW DETAILS MODAL
          ========================================================================= */}
      {modalItem && (
        <div className="modal-backdrop-blur" onClick={() => setModalItem(null)}>
          <div className="dash-details-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="dash-modal-header">
              <div className="dash-modal-title-wrap">
                <div className="dash-modal-avatar">
                  <User size={22} color="#ffffff" />
                </div>
                <div>
                  <h3 className="dash-modal-emp-name">
                    {modalItem.name || modalItem.employee_name || 'Employee Details'}
                  </h3>
                  <div className="dash-modal-emp-sub">
                    <span style={{ fontWeight: 700, color: '#0066ff' }}>{modalItem.employee_code}</span>
                    <span>•</span>
                    <span>{modalItem.designation || 'Staff'}</span>
                    <span>•</span>
                    {modalItem.isSubmitted ? (
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
                onClick={() => setModalItem(null)}
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="dash-modal-body">
              {/* Section 1: Employee & Department Details */}
              <div>
                <div className="dash-modal-section-title">
                  <Briefcase size={15} color="#0066ff" />
                  <span>Employee & Department Details</span>
                </div>
                <div className="dash-modal-grid-details">
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Employee Code</span>
                    <span className="dash-modal-detail-value" style={{ color: '#0066ff' }}>{modalItem.employee_code}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Full Name</span>
                    <span className="dash-modal-detail-value">{modalItem.name || modalItem.employee_name || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Department</span>
                    <span className="dash-modal-detail-value">{modalItem.department || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Duty Location</span>
                    <span className="dash-modal-detail-value">{modalItem.location || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Branch / Hospital</span>
                    <span className="dash-modal-detail-value">{modalItem.branch || selectedBranch || 'Main Branch'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Designation</span>
                    <span className="dash-modal-detail-value">{modalItem.designation || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Date of Joining</span>
                    <span className="dash-modal-detail-value">{modalItem.date_of_joining || '-'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Assignment Period</span>
                    <span className="dash-modal-detail-value">{modalItem.assignment_period || active_period || 'Annual'}</span>
                  </div>
                  <div className="dash-modal-detail-item">
                    <span className="dash-modal-detail-label">Staff Category / Level</span>
                    <span className="dash-modal-detail-value">{modalItem.category || modalItem.level || 'Standard'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Performance Appraisal Corresponding Details */}
              <div>
                <div className="dash-modal-section-title">
                  <Award size={15} color="#0066ff" />
                  <span>Performance Scoring & Domain Details</span>
                </div>

                {modalItem.isSubmitted ? (
                  <div>
                    {/* 3 Top Score Summary Badges */}
                    <div className="dash-modal-scores-row">
                      <div className="dash-modal-score-badge-card">
                        <span className="dash-modal-detail-label">Final Score (3.0 Scale)</span>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0066ff' }}>
                          {Number(modalItem.final_score || 0).toFixed(2)} / 3.0
                        </div>
                        {getScoreTierInfo(modalItem.final_score) && (
                          <span 
                            className="tier-score-pill" 
                            style={{ 
                              margin: '2px auto 0 auto',
                              backgroundColor: getScoreTierInfo(modalItem.final_score).bg,
                              color: getScoreTierInfo(modalItem.final_score).color,
                              border: `1px solid ${getScoreTierInfo(modalItem.final_score).border}`
                            }}
                          >
                            {getScoreTierInfo(modalItem.final_score).label}
                          </span>
                        )}
                      </div>

                      <div className="dash-modal-score-badge-card">
                        <span className="dash-modal-detail-label">Marks Obtained</span>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#00b87c' }}>
                          {modalItem.marks_obtained !== undefined ? modalItem.marks_obtained : '-'} / 100
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>After disciplinary deductions</span>
                      </div>

                      <div className="dash-modal-score-badge-card">
                        <span className="dash-modal-detail-label">Deductions Applied</span>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: (modalItem.total_deduction > 0 ? '#ef4444' : '#64748b') }}>
                          {modalItem.total_deduction || 0} pts
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Gross: {modalItem.performance_score || 0}/100
                        </span>
                      </div>
                    </div>

                    {/* 5 Performance Domains Breakdown */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>
                        5 Core Competency Domains (Max 20 Each)
                      </span>
                      <div className="dash-modal-domain-bars">
                        {[
                          { label: '1. Job Competence & Skills', score: modalItem.job_competence },
                          { label: '2. Productivity & Responsibility', score: modalItem.productivity_responsibility },
                          { label: '3. Communication & Teamwork', score: modalItem.communication_teamwork },
                          { label: '4. Professionalism & Discipline', score: modalItem.professionalism_discipline },
                          { label: '5. Initiative & Self Improvement', score: modalItem.initiative_improvement },
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

                      {modalItem.submitted_date && (
                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          <span>Submitted on: {modalItem.submitted_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <AlertCircle size={28} color="#ea580c" style={{ flexShrink: 0 }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#9a3412' }}>
                        Appraisal Submission Pending
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#c2410c' }}>
                        This employee has not yet been evaluated for the active period ({modalItem.assignment_period || active_period || 'Active Period'}).
                        Click below to open the appraisal evaluation form.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="dash-modal-footer">
              <button
                className="dash-modal-btn-secondary"
                onClick={() => setModalItem(null)}
              >
                Close
              </button>

              {modalItem.isSubmitted ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="dash-modal-btn-secondary"
                    onClick={() => {
                      setModalItem(null);
                      navigate(`/appraise?code=${modalItem.employee_code}`);
                    }}
                  >
                    Edit in Form
                  </button>
                  <button
                    className="dash-modal-btn-primary"
                    onClick={() => {
                      setModalItem(null);
                      navigate(`/reports?search=${encodeURIComponent(modalItem.employee_code)}`);
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>View Full Report</span>
                  </button>
                </div>
              ) : (
                <button
                  className="dash-modal-btn-primary"
                  onClick={() => {
                    setModalItem(null);
                    navigate(`/appraise?code=${modalItem.employee_code}`);
                  }}
                >
                  <span>Start Appraisal Form</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
