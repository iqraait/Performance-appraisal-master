import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Calendar, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  Briefcase
} from 'lucide-react';

export default function IncentiveMaster({ token, user, selectedBranch }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('periods');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data states
  const [periods, setPeriods] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [levelConfigs, setLevelConfigs] = useState([]);
  const [expConfigs, setExpConfigs] = useState([]);

  // Rate edit buffer
  const [rateEdits, setRateEdits] = useState({});

  // Modals state
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ 
    id: null, 
    name: '', 
    year: new Date().getFullYear(), 
    months: '', 
    cutoff_date: '', 
    is_active: false 
  });

  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [divisionForm, setDivisionForm] = useState({ id: null, division_name: '', rate: 0 });

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [levelForm, setLevelForm] = useState({ id: null, level_code: '', description: '', score: 1.0 });

  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expForm, setExpForm] = useState({ id: null, name: '', min_months: 0, max_months: 12, score: 1.0 });

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all configs
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Token ${token}` };
      const branchQuery = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : '';

      // Periods
      const resPeriods = await fetch(`http://${window.location.hostname}:8000/api/incentives/periods/${branchQuery}`, { headers });
      if (resPeriods.ok) {
        const data = await resPeriods.json();
        setPeriods(data);
      }

      // Divisions
      const resDivs = await fetch(`http://${window.location.hostname}:8000/api/incentives/division-rates/${branchQuery}`, { headers });
      if (resDivs.ok) {
        const data = await resDivs.json();
        setDivisions(data);
        const map = {};
        data.forEach(d => { map[d.id] = d.rate; });
        setRateEdits(map);
      }

      // Level 1 Configs
      const resLvls = await fetch(`http://${window.location.hostname}:8000/api/incentives/level-configs/${branchQuery}`, { headers });
      if (resLvls.ok) {
        const data = await resLvls.json();
        setLevelConfigs(data);
      }

      // Level 2 Experience Configs
      const resExp = await fetch(`http://${window.location.hostname}:8000/api/incentives/experience-configs/${branchQuery}`, { headers });
      if (resExp.ok) {
        const data = await resExp.json();
        setExpConfigs(data);
      }
    } catch (err) {
      triggerToast('Error loading incentive configurations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  // Period actions
  const handleSavePeriod = async (e) => {
    e.preventDefault();
    if (!periodForm.name || !periodForm.cutoff_date) {
      triggerToast('Period name and cut-off date are required', 'error');
      return;
    }

    try {
      const url = periodForm.id 
        ? `http://${window.location.hostname}:8000/api/incentives/periods/${periodForm.id}/`
        : `http://${window.location.hostname}:8000/api/incentives/periods/`;
      const method = periodForm.id ? 'PUT' : 'POST';

      // Send payload without internal UI 'year' helper property
      const { year, ...payload } = periodForm;
      if (selectedBranch && !payload.branch) {
        payload.branch = selectedBranch;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerToast(periodForm.id ? 'Period updated successfully' : 'Period created successfully');
        setIsPeriodModalOpen(false);
        setPeriodForm({ id: null, name: '', year: new Date().getFullYear(), months: '', cutoff_date: '', is_active: false });
        fetchData();
      } else {
        const err = await res.json();
        triggerToast(`Failed to save period: ${JSON.stringify(err)}`, 'error');
      }
    } catch (err) {
      triggerToast('Network error while saving period', 'error');
    }
  };

  const handleSetActivePeriod = async (periodId) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/periods/${periodId}/set-active/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        triggerToast('Active period updated');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error setting active period', 'error');
    }
  };

  const handleDeletePeriod = async (id) => {
    if (!window.confirm("Are you sure you want to delete this incentive period? All staff records, appraisals, and incentive data for this period will be deleted from Employee Master, while Department Admins, tagged departments, and locations remain completely preserved.")) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/periods/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok || res.status === 204) {
        triggerToast('Incentive period and its employee records deleted successfully.');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error deleting period', 'error');
    }
  };

  // Division actions
  const handleSyncDivisions = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/division-rates/sync-from-employees/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ branch: selectedBranch })
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message || 'Divisions synced successfully');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error syncing divisions', 'error');
    }
  };

  const handleBulkSaveRates = async () => {
    const items = Object.entries(rateEdits).map(([id, rate]) => ({ id: Number(id), rate: Number(rate) }));
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/division-rates/bulk-update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ branch: selectedBranch, items })
      });
      if (res.ok) {
        triggerToast('Division rates updated successfully');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error updating division rates', 'error');
    }
  };

  const handleSaveDivision = async (e) => {
    e.preventDefault();
    if (!divisionForm.division_name) return;
    try {
      const url = divisionForm.id
        ? `http://${window.location.hostname}:8000/api/incentives/division-rates/${divisionForm.id}/`
        : `http://${window.location.hostname}:8000/api/incentives/division-rates/`;
      const method = divisionForm.id ? 'PUT' : 'POST';

      const payload = { ...divisionForm };
      if (selectedBranch && !payload.branch) {
        payload.branch = selectedBranch;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast(divisionForm.id ? 'Division updated' : 'Division added');
        setIsDivisionModalOpen(false);
        setDivisionForm({ id: null, division_name: '', rate: 0 });
        fetchData();
      }
    } catch (err) {
      triggerToast('Error saving division', 'error');
    }
  };

  const handleDeleteDivision = async (id, divisionName) => {
    const confirmMsg = divisionName 
      ? `Are you sure you want to delete the division "${divisionName}"?` 
      : "Are you sure you want to delete this division?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/division-rates/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok || res.status === 204) {
        triggerToast(`Division "${divisionName || ''}" deleted successfully`);
        setRateEdits(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        fetchData();
      } else {
        triggerToast('Failed to delete division', 'error');
      }
    } catch (err) {
      triggerToast('Error deleting division', 'error');
    }
  };

  // Level 1 actions
  const handleSyncLevels = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/level-configs/sync-from-employees/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ branch: selectedBranch })
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message || 'Levels synced successfully');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error syncing levels', 'error');
    }
  };

  const handleSaveLevel = async (e) => {
    e.preventDefault();
    if (!levelForm.level_code) return;
    try {
      const url = levelForm.id
        ? `http://${window.location.hostname}:8000/api/incentives/level-configs/${levelForm.id}/`
        : `http://${window.location.hostname}:8000/api/incentives/level-configs/`;
      const method = levelForm.id ? 'PUT' : 'POST';

      const payload = { ...levelForm };
      if (selectedBranch && !payload.branch) {
        payload.branch = selectedBranch;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast('Level saved successfully');
        setIsLevelModalOpen(false);
        setLevelForm({ id: null, level_code: '', description: '', score: 1.0 });
        fetchData();
      }
    } catch (err) {
      triggerToast('Error saving level', 'error');
    }
  };

  const handleDeleteLevel = async (id) => {
    if (!window.confirm("Delete this employee level?")) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/level-configs/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok || res.status === 204) {
        triggerToast('Level deleted');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error deleting level', 'error');
    }
  };

  // Level 2 Experience actions
  const handleSaveExp = async (e) => {
    e.preventDefault();
    if (!expForm.name) return;
    try {
      const url = expForm.id
        ? `http://${window.location.hostname}:8000/api/incentives/experience-configs/${expForm.id}/`
        : `http://${window.location.hostname}:8000/api/incentives/experience-configs/`;
      const method = expForm.id ? 'PUT' : 'POST';

      const payload = { ...expForm };
      if (selectedBranch && !payload.branch) {
        payload.branch = selectedBranch;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast('Experience bracket saved');
        setIsExpModalOpen(false);
        setExpForm({ id: null, name: '', min_months: 0, max_months: 12, score: 1.0 });
        fetchData();
      }
    } catch (err) {
      triggerToast('Error saving bracket', 'error');
    }
  };

  const handleDeleteExp = async (id) => {
    if (!window.confirm("Delete this experience bracket?")) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/incentives/experience-configs/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok || res.status === 204) {
        triggerToast('Bracket deleted');
        fetchData();
      }
    } catch (err) {
      triggerToast('Error deleting bracket', 'error');
    }
  };

  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* Toast Notification */}
      {toast && (
        <div className={`alert-toast alert-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={26} color="var(--primary)" />
            <span>Incentive Configuration & Master</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              Configure incentive periods, cut-off dates, division fixed rates, and calculation unit scores.
            </p>
            {selectedBranch && (
              <span style={{ 
                backgroundColor: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                borderRadius: '6px', 
                padding: '2px 10px', 
                fontSize: '12px', 
                color: '#1d4ed8', 
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                Branch: {selectedBranch}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchData} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/reports?tab=incentives')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Process & View Payouts</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="tab-container" style={{ marginBottom: '24px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
        <button
          className={`tab-btn ${activeTab === 'periods' ? 'active' : ''}`}
          onClick={() => setActiveTab('periods')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Calendar size={16} />
          <span>Incentive Periods & Cut-off Dates ({periods.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'divisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('divisions')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <DollarSign size={16} />
          <span>Division Rates ({divisions.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'level1' ? 'active' : ''}`}
          onClick={() => setActiveTab('level1')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Layers size={16} />
          <span>Level 1: Staff Levels ({levelConfigs.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'level2' ? 'active' : ''}`}
          onClick={() => setActiveTab('level2')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <TrendingUp size={16} />
          <span>Level 2: Experience Brackets ({expConfigs.length})</span>
        </button>
      </div>

      {/* TAB 1: PERIODS & CUT-OFF DATES */}
      {activeTab === 'periods' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                Incentive Calculation Periods
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Each period preserves its own set of months and cut-off date to calculate staff experience.
              </p>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                const yr = new Date().getFullYear();
                setPeriodForm({ 
                  id: null, 
                  name: '', 
                  year: yr, 
                  months: '', 
                  cutoff_date: `${yr}-12-31`, 
                  is_active: periods.filter(p => p.is_active).length === 0 
                });
                setIsPeriodModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Create New Incentive Period</span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period Name</th>
                  <th>Covered Months & Year</th>
                  <th>Experience Cut-Off Date</th>
                  <th>Current Active (Max 1)</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{p.name}</td>
                    <td style={{ fontWeight: '500' }}>
                      {p.months ? (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          backgroundColor: 'rgba(30, 58, 138, 0.06)', 
                          color: 'var(--primary)',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {p.months}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--accent)' }}>{p.cutoff_date}</td>
                    <td>
                      {p.is_active ? (
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          backgroundColor: 'rgba(16, 185, 129, 0.12)', 
                          color: '#059669', 
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle2 size={12} />
                          Active Period
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActivePeriod(p.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          title="Set as the only active period"
                        >
                          Set as Active
                        </button>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.created_at ? p.created_at.substring(0, 10) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => {
                            let yr = new Date().getFullYear();
                            if (p.cutoff_date) {
                              const parsed = parseInt(p.cutoff_date.split('-')[0]);
                              if (!isNaN(parsed)) yr = parsed;
                            }
                            setPeriodForm({ 
                              id: p.id, 
                              name: p.name, 
                              year: yr, 
                              months: p.months, 
                              cutoff_date: p.cutoff_date, 
                              is_active: p.is_active 
                            });
                            setIsPeriodModalOpen(true);
                          }}
                          title="Edit Period"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                          onClick={() => handleDeletePeriod(p.id)}
                          title="Delete Period"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No incentive periods created yet. Click "Create New Incentive Period" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DIVISION RATES */}
      {activeTab === 'divisions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                Division Fixed Incentive Rates
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Unique division names extracted from staff data. Admin configures the fixed rate multiplier for each division.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleSyncDivisions}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Pulls all unique divisions from uploaded staff records"
              >
                <RefreshCw size={13} />
                <span>Auto-Sync from Staff Data</span>
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setDivisionForm({ id: null, division_name: '', rate: 1000 });
                  setIsDivisionModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add Division</span>
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleBulkSaveRates}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#059669', borderColor: '#059669' }}
              >
                <Save size={14} />
                <span>Save All Rates</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Division Name</th>
                  <th style={{ width: '220px' }}>Fixed Incentive Rate (₹)</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{d.division_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '14px' }}>₹</span>
                        <input
                          type="number"
                          className="form-control"
                          step="100"
                          min="0"
                          value={rateEdits[d.id] !== undefined ? rateEdits[d.id] : d.rate}
                          onChange={(e) => setRateEdits({ ...rateEdits, [d.id]: e.target.value })}
                          style={{ fontWeight: '700', fontSize: '14px', width: '130px', color: '#000000', backgroundColor: '#ffffff' }}
                        />
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {d.updated_at ? d.updated_at.substring(0, 10) : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="Edit Division"
                          onClick={() => {
                            setDivisionForm({ id: d.id, division_name: d.division_name, rate: rateEdits[d.id] !== undefined ? rateEdits[d.id] : d.rate });
                            setIsDivisionModalOpen(true);
                          }}
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                          title="Delete Division"
                          onClick={() => handleDeleteDivision(d.id, d.division_name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {divisions.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No divisions registered. Click "Auto-Sync from Staff Data" to import divisions from employees or click "Add Division".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LEVEL 1 (EMPLOYEE LEVELS) */}
      {activeTab === 'level1' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                Level 1: Staff Level Units & Scores
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Each staff designation belongs to a level (e.g. MAN, SUP, LOW, MID). Admin configures unit score for each level.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleSyncLevels}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Auto-Sync from Staff Data</span>
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setLevelForm({ id: null, level_code: '', description: '', score: 1.0 });
                  setIsLevelModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add Level</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Level Code</th>
                  <th>Description</th>
                  <th>Level 1 Score / Units</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {levelConfigs.map(l => (
                  <tr key={l.id}>
                    <td>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: '700', 
                        backgroundColor: 'rgba(30, 58, 138, 0.08)', 
                        color: 'var(--primary)', 
                        border: '1px solid rgba(30, 58, 138, 0.2)' 
                      }}>
                        {l.level_code}
                      </span>
                    </td>
                    <td>{l.description || '-'}</td>
                    <td style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '14px' }}>
                      {l.score}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l.updated_at ? l.updated_at.substring(0, 10) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => {
                            setLevelForm({ id: l.id, level_code: l.level_code, description: l.description, score: l.score });
                            setIsLevelModalOpen(true);
                          }}
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                          onClick={() => handleDeleteLevel(l.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {levelConfigs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No staff levels configured yet. Click "Add Level" or "Auto-Sync from Staff Data".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LEVEL 2 (EXPERIENCE BRACKETS) */}
      {activeTab === 'level2' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                Level 2: Experience Brackets & Score Units
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Experience is calculated in months from staff Joining Date to the period Cut-Off Date (e.g. 1 - 3 years has score 3).
              </p>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setExpForm({ id: null, name: '', min_months: 13, max_months: 36, score: 3.0 });
                setIsExpModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Add Experience Bracket</span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bracket Name</th>
                  <th>Min Months (Inclusive)</th>
                  <th>Max Months (Inclusive)</th>
                  <th>Level 2 Score / Units</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expConfigs.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{e.name}</td>
                    <td>{e.min_months} months ({Math.floor(e.min_months / 12)} yrs {e.min_months % 12}m)</td>
                    <td>{e.max_months >= 9999 ? 'No limit (9999)' : `${e.max_months} months (${Math.floor(e.max_months / 12)} yrs ${e.max_months % 12}m)`}</td>
                    <td style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '14px' }}>
                      {e.score}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.updated_at ? e.updated_at.substring(0, 10) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => {
                            setExpForm({ id: e.id, name: e.name, min_months: e.min_months, max_months: e.max_months, score: e.score });
                            setIsExpModalOpen(true);
                          }}
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                          onClick={() => handleDeleteExp(e.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expConfigs.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No experience brackets configured yet. Click "Add Experience Bracket" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Period Form */}
      {isPeriodModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{periodForm.id ? 'Edit Incentive Period' : 'Create Incentive Period'}</h2>
            </div>
            <form onSubmit={handleSavePeriod}>
              {/* Year & Quick Presets */}
              <div style={{ backgroundColor: 'rgba(30, 58, 138, 0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>
                    Incentive Cycle Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    step="1"
                    className="form-control"
                    style={{ width: '100px', padding: '4px 8px', textAlign: 'center', fontWeight: '700' }}
                    value={periodForm.year || new Date().getFullYear()}
                    onChange={(e) => {
                      const yr = parseInt(e.target.value) || new Date().getFullYear();
                      setPeriodForm(prev => {
                        // If months already had a year, update them
                        let updatedMonths = prev.months;
                        if (updatedMonths) {
                          updatedMonths = updatedMonths.replace(/\b(20\d\d)\b/g, yr);
                        }
                        let updatedName = prev.name;
                        if (updatedName && /\b(20\d\d)\b/.test(updatedName)) {
                          updatedName = updatedName.replace(/\b(20\d\d)\b/g, yr);
                        }
                        let updatedCutoff = prev.cutoff_date;
                        if (updatedCutoff) {
                          const parts = updatedCutoff.split('-');
                          if (parts.length === 3) updatedCutoff = `${yr}-${parts[1]}-${parts[2]}`;
                        }
                        return { ...prev, year: yr, months: updatedMonths, name: updatedName, cutoff_date: updatedCutoff };
                      });
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Quick Cycle Presets for {periodForm.year || new Date().getFullYear()}:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Jun - Aug', months: `June ${periodForm.year || new Date().getFullYear()}, July ${periodForm.year || new Date().getFullYear()}, August ${periodForm.year || new Date().getFullYear()}`, name: `Jun, July, Aug ${periodForm.year || new Date().getFullYear()}`, cutoff: `${periodForm.year || new Date().getFullYear()}-08-31` },
                    { label: 'Sep - Nov', months: `September ${periodForm.year || new Date().getFullYear()}, October ${periodForm.year || new Date().getFullYear()}, November ${periodForm.year || new Date().getFullYear()}`, name: `Sep, Oct, Nov ${periodForm.year || new Date().getFullYear()}`, cutoff: `${periodForm.year || new Date().getFullYear()}-11-30` },
                    { label: 'Dec - Feb', months: `December ${(periodForm.year || new Date().getFullYear()) - 1}, January ${periodForm.year || new Date().getFullYear()}, February ${periodForm.year || new Date().getFullYear()}`, name: `Dec, Jan, Feb ${periodForm.year || new Date().getFullYear()}`, cutoff: `${periodForm.year || new Date().getFullYear()}-02-28` },
                    { label: 'Mar - May', months: `March ${periodForm.year || new Date().getFullYear()}, April ${periodForm.year || new Date().getFullYear()}, May ${periodForm.year || new Date().getFullYear()}`, name: `Mar, Apr, May ${periodForm.year || new Date().getFullYear()}`, cutoff: `${periodForm.year || new Date().getFullYear()}-05-31` },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => setPeriodForm(prev => ({
                        ...prev,
                        name: preset.name,
                        months: preset.months,
                        cutoff_date: preset.cutoff
                      }))}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Period Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jun, July, Aug 2026 or Sep, Oct, Nov 2026"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Covered Months (Includes Year)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. June 2026, July 2026, August 2026"
                  value={periodForm.months}
                  onChange={(e) => setPeriodForm({ ...periodForm, months: e.target.value })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Specify the covered months along with the year (e.g. June 2026, July 2026, August 2026).
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Experience Cut-off Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={periodForm.cutoff_date}
                  onChange={(e) => setPeriodForm({ ...periodForm, cutoff_date: e.target.value })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Experience for this cycle will be calculated from Joining Date till this Cut-off Date.
                </small>
              </div>

              <div style={{ backgroundColor: 'rgba(234, 88, 12, 0.05)', border: '1px solid rgba(234, 88, 12, 0.25)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="period_is_active"
                    checked={periodForm.is_active}
                    onChange={(e) => setPeriodForm({ ...periodForm, is_active: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="period_is_active" style={{ fontSize: '13px', fontWeight: '700', color: '#b45309', margin: 0, cursor: 'pointer' }}>
                    Set as Single Active Period
                  </label>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '24px' }}>
                  <strong>Important:</strong> Only one incentive period can be active at a time. Setting this period active will automatically deactivate all other periods in the system.
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPeriodModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Period</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Division Form */}
      {isDivisionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{divisionForm.id ? 'Edit Division Rate' : 'Add Division Rate'}</h2>
            </div>
            <form onSubmit={handleSaveDivision}>
              <div className="form-group">
                <label className="form-label">Division Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. OFFICE AND ADMINISTRATION- PI"
                  value={divisionForm.division_name}
                  onChange={(e) => setDivisionForm({ ...divisionForm, division_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fixed Rate Amount (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  step="100"
                  min="0"
                  placeholder="e.g. 1000"
                  value={divisionForm.rate}
                  onChange={(e) => setDivisionForm({ ...divisionForm, rate: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {divisionForm.id && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ color: '#ef4444', borderColor: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        handleDeleteDivision(divisionForm.id, divisionForm.division_name);
                        setIsDivisionModalOpen(false);
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsDivisionModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Division</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Level 1 Form */}
      {isLevelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{levelForm.id ? 'Edit Staff Level' : 'Add Staff Level'}</h2>
            </div>
            <form onSubmit={handleSaveLevel}>
              <div className="form-group">
                <label className="form-label">Level Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MAN, SUP, LOW, MID"
                  value={levelForm.level_code}
                  onChange={(e) => setLevelForm({ ...levelForm, level_code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Managerial Level"
                  value={levelForm.description}
                  onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Level 1 Score / Unit</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 1.0"
                  value={levelForm.score}
                  onChange={(e) => setLevelForm({ ...levelForm, score: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsLevelModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Level</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Level 2 Experience Form */}
      {isExpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{expForm.id ? 'Edit Experience Bracket' : 'Add Experience Bracket'}</h2>
            </div>
            <form onSubmit={handleSaveExp}>
              <div className="form-group">
                <label className="form-label">Bracket Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1 - 3 Years"
                  value={expForm.name}
                  onChange={(e) => setExpForm({ ...expForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid-cols-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Min Months</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={expForm.min_months}
                    onChange={(e) => setExpForm({ ...expForm, min_months: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Months</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={expForm.max_months}
                    onChange={(e) => setExpForm({ ...expForm, max_months: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Level 2 Score / Unit</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 3.0"
                  value={expForm.score}
                  onChange={(e) => setExpForm({ ...expForm, score: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Bracket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
