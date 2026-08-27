import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Download, 
  Eye, 
  Printer, 
  Calendar,
  X,
  FileCheck,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function AppraisalReports({ token, user, selectedBranch }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters State
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

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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

        // Derive unique dropdown sets from all records (both submitted and pending)
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
    fetchReports();
  }, [search, codeFilter, nameFilter, deptFilter, locFilter, desigFilter, periodFilter, ratingFilter, startDate, endDate, statusFilter, selectedBranch]);


  const handleExportExcel = () => {
    const exportUrl = `http://${window.location.hostname}:8000/api/appraisals/export-excel/?${getQueryString()}`;
    const link = document.createElement('a');
    link.href = exportUrl;
    link.setAttribute('download', 'appraisal_reports.xlsx');
    triggerToast('Preparing Excel export...');
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
      triggerToast('Excel report downloaded successfully!');
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
    if (r.includes('(A)')) return 'rating-a';
    if (r.includes('(B)')) return 'rating-b';
    if (r.includes('(C)')) return 'rating-c';
    if (r.includes('(D)')) return 'rating-d';
    return 'rating-e';
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
          <h1 className="dashboard-title" style={{ marginBottom: 0 }}>Appraisal Reports</h1>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'rgba(30, 58, 138, 0.08)', padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center' }}>
            Total: {reports.length} {reports.length === 1 ? 'record' : 'records'}
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
        <button className="btn btn-primary btn-sm" onClick={handleExportExcel}>
          <Download size={15} />
          <span>Export to Excel</span>
        </button>
      </div>

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
                <th style={{ textAlign: 'center' }}>Perf. Score</th>
                <th style={{ textAlign: 'center' }}>Deduction</th>
                <th style={{ textAlign: 'center' }}>Final Score</th>
                <th>Rating</th>
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
                    <td style={{ textAlign: 'center' }}>{isPending ? '-' : r.performance_score}</td>
                    <td style={{ textAlign: 'center', color: !isPending && r.total_deduction > 0 ? 'var(--color-e)' : 'inherit' }}>
                      {isPending ? '-' : r.total_deduction}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent)' }}>{isPending ? '-' : r.final_score}</td>
                    <td>
                      {isPending ? (
                        <span className="rating-badge" style={{ backgroundColor: '#f59e0b', color: '#ffffff', fontWeight: '600' }}>
                          Pending
                        </span>
                      ) : (
                        <span className={`rating-badge ${getRatingClass(r.rating)}`}>
                          {r.rating ? (() => {
                            const match = r.rating.match(/\(([^)]+)\)/);
                            return match ? match[1] : r.rating;
                          })() : ''} 
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
                            title="View Appraisal"
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

      {/* View Form / Print Appraisal Modal */}
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
                    {selectedAppraisal.rating}
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

              {/* Totals & Deductions */}
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
                    <span>Total Deduction Score:</span>
                    <span style={{ color: 'var(--color-e)' }}>-{selectedAppraisal.total_deduction}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyGap: '12px', padding: '16px', border: '2px solid var(--primary)', borderRadius: 'var(--radius-sm)', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Performance Score:</span>
                    <strong>{selectedAppraisal.performance_score} / 100</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                    <span>Deduction Score:</span>
                    <strong style={{ color: 'var(--color-e)' }}>-{selectedAppraisal.total_deduction}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '10px' }}>
                    <span>Final Score:</span>
                    <span style={{ color: 'var(--primary)' }}>{selectedAppraisal.final_score}</span>
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

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Appraisal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
