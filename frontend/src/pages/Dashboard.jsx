import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileCheck,
  Clock,
  Award,
  TrendingUp,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function Dashboard({ token, selectedBranch }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: '1', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <span className="spinner"></span>
        <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Loading Analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', gap: '12px', padding: '20px', margin: '20px' }}>
        <ShieldCheck size={24} color="#ef4444" />
        <div>
          <h3 style={{ marginBottom: '4px' }}>Error</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { total_employees, total_appraisals, pending_appraisals, ratings, department_stats, pending_list } = stats;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="dashboard-title" style={{ marginBottom: 0 }}>Executive Dashboard</h1>
        {selectedBranch && (
          <span 
            title={selectedBranch}
            style={{ 
              backgroundColor: 'rgba(234, 88, 12, 0.08)', 
              color: 'var(--accent)', 
              padding: '5px 14px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: '600',
              border: '1px solid rgba(234, 88, 12, 0.2)',
              maxWidth: '280px',
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


      {/* Metrics Row 1 */}
      <div className="dashboard-grid">
        <div className="card metric-card" style={{ '--primary': 'var(--primary)' }}>
          <div className="metric-title">Total Employees</div>
          <div className="metric-val">
            <Users size={28} color="var(--primary)" />
            <span>{total_employees}</span>
          </div>
        </div>

        <div className="card metric-card" style={{ '--primary': 'var(--color-a)' }}>
          <div className="metric-title">Appraisals Submitted</div>
          <div className="metric-val">
            <FileCheck size={28} color="var(--color-a)" />
            <span>{total_appraisals}</span>
          </div>
        </div>

        <div className="card metric-card" style={{ '--primary': 'var(--color-d)' }}>
          <div className="metric-title">Pending Appraisals</div>
          <div className="metric-val">
            <Clock size={28} color="var(--color-d)" />
            <span>{pending_appraisals}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row 2: Ratings Breakdown */}
      <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)' }}>Rating Distribution</h2>
      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        <div className="card metric-card" style={{ '--primary': 'var(--color-a)' }}>
          <div className="metric-title">Outstanding (A)</div>
          <div className="metric-val">
            <Award size={28} color="var(--color-a)" />
            <span>{ratings.A}</span>
          </div>
        </div>

        <div className="card metric-card" style={{ '--primary': 'var(--color-b)' }}>
          <div className="metric-title">Very Good (B)</div>
          <div className="metric-val">
            <Award size={28} color="var(--color-b)" />
            <span>{ratings.B}</span>
          </div>
        </div>

        <div className="card metric-card" style={{ '--primary': 'var(--color-c)' }}>
          <div className="metric-title">Good (C)</div>
          <div className="metric-val">
            <Award size={28} color="var(--color-c)" />
            <span>{ratings.C}</span>
          </div>
        </div>

        <div className="card metric-card" style={{ '--primary': 'var(--color-d)' }}>
          <div className="metric-title">Needs Imp. (D)</div>
          <div className="metric-val">
            <Award size={28} color="var(--color-d)" />
            <span>{ratings.D}</span>
          </div>
        </div>

        <div className="card metric-card" style={{ '--primary': 'var(--color-e)' }}>
          <div className="metric-title">Unsatisfactory (E)</div>
          <div className="metric-val">
            <Award size={28} color="var(--color-e)" />
            <span>{ratings.E}</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="chart-section">

        {/* Rating Breakdown Chart */}
        <div className="card chart-card">
          <div className="chart-title">
            <TrendingUp size={18} color="var(--primary)" />
            <span>Appraisal Rating Ratios</span>
          </div>
          <div className="custom-chart-bar-container">
            {Object.entries(ratings).map(([grade, count]) => {
              const total = total_appraisals || 1;
              const percentage = Math.round((count / total) * 100);

              // Pick class rating
              let color = 'var(--color-e)';
              if (grade === 'A') color = 'var(--color-a)';
              if (grade === 'B') color = 'var(--color-b)';
              if (grade === 'C') color = 'var(--color-c)';
              if (grade === 'D') color = 'var(--color-d)';

              return (
                <div className="chart-bar-item" key={grade}>
                  <div className="chart-bar-label">
                    <span>Grade {grade}</span>
                    <span>{count} ({percentage}%)</span>
                  </div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${percentage}%`, background: color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Statistics Chart */}
        <div className="card chart-card">
          <div className="chart-title">
            <TrendingUp size={18} color="var(--accent)" />
            <span>Average Scores by Department</span>
          </div>
          <div className="custom-chart-bar-container">
            {department_stats.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No appraisal records submitted yet.</p>
            ) : (
              department_stats.map((dept) => {
                // Max possible score is 100
                const scorePercentage = Math.min(100, Math.max(0, dept.avg_score));
                return (
                  <div className="chart-bar-item" key={dept.department}>
                    <div className="chart-bar-label">
                      <span>{dept.department} ({dept.submitted} Submissions)</span>
                      <span>Avg: {dept.avg_score}/100</span>
                    </div>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill"
                        style={{ width: `${scorePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Pending Appraisals Table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '40px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-main)' }}>
          Pending Employee Appraisals
        </h2>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'var(--bg-active)', padding: '3px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          Total: {pending_list ? pending_list.length : 0} {pending_list?.length === 1 ? 'employee' : 'employees'}
        </span>
      </div>
      <div className="card" style={{ padding: '24px', marginBottom: '40px' }}>
        {pending_list && pending_list.length > 0 ? (
          <div className="table-container">
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ color: 'var(--text-main)', fontWeight: '600' }}>Employee Code</th>
                  <th style={{ color: 'var(--text-main)', fontWeight: '600' }}>Name</th>
                  <th style={{ color: 'var(--text-main)', fontWeight: '600' }}>Department</th>
                  <th style={{ color: 'var(--text-main)', fontWeight: '600' }}>Duty Location</th>
                  <th style={{ color: 'var(--text-main)', fontWeight: '600' }}>Designation</th>
                  <th style={{ textAlign: 'center', color: 'var(--text-main)', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending_list.map((emp) => (
                  <tr key={emp.employee_code} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{emp.employee_code}</td>
                    <td style={{ color: 'var(--text-main)' }}>{emp.name}</td>
                    <td style={{ color: 'var(--text-main)' }}>{emp.department}</td>
                    <td style={{ color: 'var(--text-main)' }}>{emp.location || '-'}</td>
                    <td style={{ color: 'var(--text-main)' }}>{emp.designation}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/appraise?code=${emp.employee_code}`)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Go to Form
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No pending appraisals for your department(s).
          </p>
        )}
      </div>

    </div>
  );
}
