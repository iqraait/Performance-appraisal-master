import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import AppraisalForm from './pages/AppraisalForm';
import AppraisalReports from './pages/AppraisalReports';
import TrainingMaster from './pages/TrainingMaster';
import TraineeAssessmentForm from './pages/TraineeAssessmentForm';

function RedirectToLoginWithReturn() {
  const loc = window.location.pathname + window.location.search;
  if (loc && !loc.startsWith('/login')) {
    sessionStorage.setItem('redirectUrl', loc);
  }
  return <Navigate to="/login" replace />;
}

function BranchSelector({ user, token, onSelectBranch }) {
  const [branches, setBranches] = useState(user?.branches || []);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://${window.location.hostname}:8000/api/branches/`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          const branchNames = data.map(b => b.name);
          setBranches(branchNames);
          if (branchNames.length > 0) {
            setSelectedBranch(branchNames[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [user, token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedBranch) {
      onSelectBranch(selectedBranch);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '440px', width: '90%', padding: '28px 24px' }}>
        <div className="auth-header" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#ffffff', boxShadow: '0 8px 20px rgba(234, 88, 12, 0.3)', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              <path d="M10 6h4"/>
              <path d="M10 10h4"/>
              <path d="M10 14h4"/>
              <path d="M10 18h4"/>
            </svg>
          </div>
          <h1 className="auth-logo" style={{ fontSize: '20px', fontWeight: '700' }}>Select Hospital Branch</h1>
          <p className="auth-subtitle" style={{ marginTop: '4px', fontSize: '13px' }}>
            Choose an assigned branch to view staff and start appraisals.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <span className="spinner"></span>
            <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading branches...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hospital Branch</label>
              <select
                className="form-control"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '10px 12px',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  borderColor: 'var(--border-color, #cbd5e1)',
                  borderRadius: '6px'
                }}
                required
              >
                {branches.length === 0 && <option value="">No assigned branches found</option>}
                {branches.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedBranch || branches.length === 0}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '6px',
                marginTop: '4px'
              }}
            >
              Proceed to Dashboard →
            </button>

            {branches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', fontSize: '12px' }}>
                No branches assigned to your login account. Contact administrator.
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}


function TopHeader({ user, onLogout }) {
  const navigate = useNavigate();
  const isAdmin = user && user.is_staff;

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="top-header">
      <div className="top-header-user-info">
        <span className="user-label">User Logged in:</span>
        <span className="user-value" title={user ? user.username : ''}>
          {user ? user.username : ''} {user && user.role === 'department_admin' ? `(${user.departments ? user.departments.join(', ') : ''})` : isAdmin ? '(Admin)' : '(Staff)'}
        </span>
      </div>
      <button className="top-header-logout-btn" onClick={handleLogoutClick} title="Logout Account">
        <LogOut size={14} />
        <span>Logout</span>
      </button>
    </div>
  );
}


function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('selectedBranch') || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLoginSuccess = (authData) => {
    localStorage.setItem('token', authData.token);
    const userData = {
      username: authData.username,
      is_staff: authData.is_staff,
      role: authData.role,
      departments: authData.departments || [],
      locations: authData.locations || [],
      branches: authData.branches || [],
      department: authData.department || ''
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authData.token);
    setUser(userData);
    
    // Auto-select if only 1 branch is available
    if (authData.branches && authData.branches.length === 1) {
      localStorage.setItem('selectedBranch', authData.branches[0]);
      setSelectedBranch(authData.branches[0]);
    } else {
      localStorage.removeItem('selectedBranch');
      setSelectedBranch('');
    }
  };

  const handleSelectBranch = (bName) => {
    localStorage.setItem('selectedBranch', bName);
    setSelectedBranch(bName);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBranch');
    setToken('');
    setUser(null);
    setSelectedBranch('');
    setIsSidebarOpen(false);
  };

  const isAuthenticated = !!token;
  const isAdmin = user && user.is_staff;
  const needsBranchSelection = isAuthenticated && isAdmin && !selectedBranch;

  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              isAdmin ? <Navigate to="/" replace /> : <Navigate to="/appraise" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* Protected Administrative Routes: Lock /appraise so only logged in admins/dept admins can submit */}
        <Route 
          path="/appraise" 
          element={
            isAuthenticated && isAdmin ? (
              needsBranchSelection ? (
                <BranchSelector user={user} token={token} onSelectBranch={handleSelectBranch} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="mobile-top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={22} />
                      </button>
                      <span style={{ fontSize: '16px', fontWeight: '700' }}>AppraisalPro</span>
                    </div>
                    {selectedBranch && (
                      <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                        {selectedBranch}
                      </span>
                    )}
                  </div>
                  <div className="app-container">
                    <Sidebar user={user} onLogout={handleLogout} selectedBranch={selectedBranch} setSelectedBranch={setSelectedBranch} token={token} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    <main className="main-content">
                      <TopHeader user={user} onLogout={handleLogout} />
                      <AppraisalForm token={token} user={user} selectedBranch={selectedBranch} />
                    </main>
                  </div>
                </div>
              )
            ) : (
              <RedirectToLoginWithReturn />
            )
          } 
        />

        {/* Protected Dedicated Trainee Assessment Route (IIHRC/HRD/0007) */}
        <Route 
          path="/trainee-assessment" 
          element={
            isAuthenticated && isAdmin ? (
              needsBranchSelection ? (
                <BranchSelector user={user} token={token} onSelectBranch={handleSelectBranch} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="mobile-top-bar no-print">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={22} />
                      </button>
                      <span style={{ fontSize: '16px', fontWeight: '700' }}>AppraisalPro</span>
                    </div>
                    {selectedBranch && (
                      <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                        {selectedBranch}
                      </span>
                    )}
                  </div>
                  <div className="app-container">
                    <div className="no-print">
                      <Sidebar user={user} onLogout={handleLogout} selectedBranch={selectedBranch} setSelectedBranch={setSelectedBranch} token={token} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    </div>
                    <main className="main-content" style={{ padding: 0 }}>
                      <div className="no-print">
                        <TopHeader user={user} onLogout={handleLogout} />
                      </div>
                      <TraineeAssessmentForm token={token} user={user} selectedBranch={selectedBranch} />
                    </main>
                  </div>
                </div>
              )
            ) : (
              <RedirectToLoginWithReturn />
            )
          } 
        />

        {/* Protected Administrative Routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              isAdmin ? (
                needsBranchSelection ? (
                  <BranchSelector user={user} token={token} onSelectBranch={handleSelectBranch} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div className="mobile-top-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                          <Menu size={22} />
                        </button>
                        <span style={{ fontSize: '16px', fontWeight: '700' }}>AppraisalPro</span>
                      </div>
                      {selectedBranch && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                          {selectedBranch}
                        </span>
                      )}
                    </div>
                    <div className="app-container">
                      <Sidebar user={user} onLogout={handleLogout} selectedBranch={selectedBranch} setSelectedBranch={setSelectedBranch} token={token} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                      <main className="main-content">
                        <TopHeader user={user} onLogout={handleLogout} />
                        <Routes>
                          <Route path="/" element={<Dashboard token={token} selectedBranch={selectedBranch} />} />
                          <Route path="/employees" element={<EmployeeMaster token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/reports" element={<AppraisalReports token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/training" element={<TrainingMaster token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/trainee-assessment" element={<TraineeAssessmentForm token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                )
              ) : (
                <Navigate to="/appraise" replace />
              )
            ) : (
              <RedirectToLoginWithReturn />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;


