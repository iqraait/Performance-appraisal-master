import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import AppraisalForm from './pages/AppraisalForm';
import AppraisalReports from './pages/AppraisalReports';
import TrainingMaster from './pages/TrainingMaster';
import TraineeAssessmentForm from './pages/TraineeAssessmentForm';
import IncentiveMaster from './pages/IncentiveMaster';
import LocationMaster from './pages/LocationMaster';
import iqraaLogo from './assets/iqraa-logo.png';

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
      <div className="auth-card" style={{ maxWidth: '440px', width: '90%', padding: '32px 28px', borderRadius: '24px' }}>
        <div className="auth-header" style={{ marginBottom: '22px' }}>
          <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #0066ff, #003db3)', color: '#ffffff', boxShadow: '0 8px 24px rgba(0, 102, 255, 0.35)', marginBottom: '16px' }}>
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
          <h1 className="auth-logo" style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Select Hospital Branch</h1>
          <p className="auth-subtitle" style={{ marginTop: '4px', fontSize: '13px', color: '#64748b' }}>
            Choose an assigned branch to view staff and start appraisals.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <span className="spinner"></span>
            <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading branches...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hospital Branch</label>
              <select
                className="form-control"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  padding: '11px 14px',
                  color: '#0f172a',
                  backgroundColor: '#f1f4f9',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  width: '100%',
                  outline: 'none',
                  cursor: 'pointer'
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
                padding: '13px 18px',
                fontSize: '14.5px',
                fontWeight: '700',
                borderRadius: '12px',
                marginTop: '4px',
                background: 'linear-gradient(135deg, #0e3d8f 0%, #092c6c 100%)',
                boxShadow: '0 8px 22px rgba(14, 61, 143, 0.35)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Proceed to Dashboard →
            </button>

            {branches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', fontSize: '12px' }}>
                No branches assigned to your login account. Contact administrator.
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}


function TopHeader({ user, onLogout, onToggleSidebar }) {
  const navigate = useNavigate();
  const isAdmin = user && user.is_staff;

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="top-header">
      <div className="top-header-left">
        <button 
          className="top-header-menu-btn" 
          onClick={onToggleSidebar}
          title="Toggle Navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="top-header-right">
        <div className="top-header-user-info">
          <div className="top-header-user-avatar">
            <User size={15} color="#0066ff" />
          </div>
          <div className="top-header-user-text">
            <span className="user-label">User Logged in:</span>
            <div className="user-value" title={user ? user.username : ''}>
              <span>{user ? user.username : 'admin'} {user && user.role === 'department_admin' ? `(${user.departments ? user.departments.join(', ') : ''})` : isAdmin ? '(Admin)' : '(Staff)'}</span>
              <ChevronDown size={13} className="user-dropdown-icon" />
            </div>
          </div>
        </div>
        <button className="top-header-logout-btn" onClick={handleLogoutClick} title="Logout Account">
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
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

  // Live synchronization of user permissions and scope on load/refresh
  useEffect(() => {
    if (!token) return;
    const syncProfile = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:8000/api/auth/me/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (response.ok) {
          const freshData = await response.json();
          setUser(prev => {
            const updated = {
              ...(prev || {}),
              ...freshData
            };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
          });

          // Ensure selected branch remains valid or auto-selects
          if (freshData.branches && freshData.branches.length > 0) {
            const currentSelected = localStorage.getItem('selectedBranch');
            if (!currentSelected || !freshData.branches.includes(currentSelected)) {
              localStorage.setItem('selectedBranch', freshData.branches[0]);
              setSelectedBranch(freshData.branches[0]);
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      } catch (err) {
        console.error("Failed to sync current user profile", err);
      }
    };
    syncProfile();
  }, [token]);

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
  const isDeptAdmin = user && user.role === 'department_admin';
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
                      <TopHeader user={user} onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
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
                      <div style={{ background: '#ffffff', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                        <img src={iqraaLogo} alt="IQRAA" style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
                      </div>
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
                        <TopHeader user={user} onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
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
                        <div style={{ background: '#ffffff', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                          <img src={iqraaLogo} alt="IQRAA" style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
                        </div>
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
                        <TopHeader user={user} onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
                        <Routes>
                          <Route path="/" element={<Dashboard token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/employees" element={isDeptAdmin ? <Navigate to="/appraise" replace /> : <EmployeeMaster token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/locations" element={isDeptAdmin ? <Navigate to="/appraise" replace /> : <LocationMaster token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/reports" element={<AppraisalReports token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/incentives" element={isDeptAdmin ? <Navigate to="/appraise" replace /> : <IncentiveMaster token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/training" element={isDeptAdmin ? <Navigate to="/appraise" replace /> : <TrainingMaster token={token} user={user} selectedBranch={selectedBranch} />} />
                          <Route path="/trainee-assessment" element={isDeptAdmin ? <Navigate to="/appraise" replace /> : <TraineeAssessmentForm token={token} user={user} selectedBranch={selectedBranch} />} />
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


