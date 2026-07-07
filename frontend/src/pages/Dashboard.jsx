import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileCheck, 
  Clock, 
  Award, 
  TrendingUp, 
  ChevronRight,
  ShieldCheck 
} from 'lucide-react';

export default function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:8000/api/dashboard/`, {
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
  }, [token]);

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

  const { total_employees, total_appraisals, pending_appraisals, ratings, department_stats } = stats;

  return (
    <div>
      <h1 className="dashboard-title">Executive Dashboard</h1>
      
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
    </div>
  );
}
