import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut, 
  UserCheck 
} from 'lucide-react';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const isAdmin = user && user.is_staff;

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <UserCheck size={28} />
        <span>AppraisalPro</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ul className="sidebar-menu">
          {isAdmin && (
            <>
              <li>
                <NavLink to="/" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/employees" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                  <Users size={18} />
                  <span>Employee Master</span>
                </NavLink>
              </li>
            </>
          )}
          
          <li>
            <NavLink to="/appraise" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
              <FileText size={18} />
              <span>Appraisal Form</span>
            </NavLink>
          </li>

          {isAdmin && (
            <li>
              <NavLink to="/reports" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                <FileText size={18} />
                <span>Appraisal Reports</span>
              </NavLink>
            </li>
          )}
        </ul>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logged in as:</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
              {user ? user.username : ''} {isAdmin ? '(Admin)' : '(Staff)'}
            </span>
          </div>
          <button className="logout-btn" onClick={handleLogoutClick}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
