import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import AppraisalForm from './pages/AppraisalForm';
import AppraisalReports from './pages/AppraisalReports';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });

  const handleLoginSuccess = (authData) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify({
      username: authData.username,
      is_staff: authData.is_staff
    }));
    setToken(authData.token);
    setUser({
      username: authData.username,
      is_staff: authData.is_staff
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  const isAuthenticated = !!token;
  const isAdmin = user && user.is_staff;

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

        {/* Public / Shared Appraisal Route */}
        <Route 
          path="/appraise" 
          element={
            isAuthenticated ? (
              <div className="app-container">
                <Sidebar user={user} onLogout={handleLogout} />
                <main className="main-content">
                  <AppraisalForm token={token} user={user} />
                </main>
              </div>
            ) : (
              <div style={{ padding: '40px', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
                <AppraisalForm token="" user={null} />
              </div>
            )
          } 
        />

        {/* Protected Administrative Routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              isAdmin ? (
                <div className="app-container">
                  <Sidebar user={user} onLogout={handleLogout} />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Dashboard token={token} />} />
                      <Route path="/employees" element={<EmployeeMaster token={token} />} />
                      <Route path="/reports" element={<AppraisalReports token={token} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              ) : (
                <Navigate to="/appraise" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
