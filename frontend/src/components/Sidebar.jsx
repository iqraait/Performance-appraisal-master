import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut, 
  UserCheck,
  History,
  Building2,
  X,
  Search,
  Plus,
  Minus,
  Settings,
  BarChart3,
  BookOpen
} from 'lucide-react';

export default function Sidebar({ user, onLogout, selectedBranch, setSelectedBranch, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user && (user.is_staff || user.is_superuser || user.role === 'department_admin');

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const [expandedModules, setExpandedModules] = useState({
    employeeAppraisal: false,
    masterConfig: false,
    reports: false,
    trainingMaster: false,
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  const handleSwitchBranch = () => {
    localStorage.removeItem('selectedBranch');
    setSelectedBranch('');
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const isModuleExpanded = (moduleId) => {
    if (searchQuery.trim() !== '') {
      return true;
    }
    return !!expandedModules[moduleId];
  };

  const menuData = [
    {
      type: 'link',
      name: 'Dashboard',
      to: '/',
      icon: <LayoutDashboard size={18} />,
      visible: isAdmin,
      isActive: () => location.pathname === '/'
    },
    {
      type: 'module',
      id: 'employeeAppraisal',
      name: 'Employee Appraisal',
      icon: <UserCheck size={18} />,
      visible: true,
      children: [
        {
          name: 'Appraisal Form',
          to: '/appraise',
          icon: <FileText size={18} />,
          isActive: () => location.pathname === '/appraise' && currentTab !== 'list',
          visible: true,
        },
        {
          name: 'My Appraisals',
          to: '/appraise?tab=list',
          icon: <History size={18} />,
          isActive: () => location.pathname === '/appraise' && currentTab === 'list',
          visible: true,
        }
      ]
    },
    {
      type: 'module',
      id: 'masterConfig',
      name: 'Master Config',
      icon: <Settings size={18} />,
      visible: isAdmin,
      children: [
        {
          name: 'Employee Master',
          to: '/employees',
          icon: <Users size={18} />,
          isActive: () => location.pathname === '/employees',
          visible: isAdmin,
        }
      ]
    },
    {
      type: 'module',
      id: 'trainingMaster',
      name: 'Training Master',
      icon: <BookOpen size={18} />,
      visible: isAdmin,
      children: [
        {
          name: 'Training Directory',
          to: '/training',
          icon: <BookOpen size={18} />,
          isActive: () => location.pathname === '/training',
          visible: isAdmin,
        },
        {
          name: 'Trainee Assessment',
          to: '/trainee-assessment',
          icon: <FileText size={18} />,
          isActive: () => location.pathname === '/trainee-assessment',
          visible: isAdmin,
        }
      ]
    },
    {
      type: 'module',
      id: 'reports',
      name: 'Reports',
      icon: <BarChart3 size={18} />,
      visible: isAdmin,
      children: [
        {
          name: 'Appraisal Report',
          to: '/reports',
          icon: <FileText size={18} />,
          isActive: () => location.pathname === '/reports',
          visible: isAdmin,
        }
      ]
    }
  ];

  const filteredMenu = menuData
    .filter(item => item.visible)
    .map(item => {
      if (item.type === 'link') {
        const matches = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return { ...item, matches };
      } else if (item.type === 'module') {
        const visibleChildren = item.children.filter(child => child.visible);
        const childrenWithMatches = visibleChildren.map(child => {
          const matches = child.name.toLowerCase().includes(searchQuery.toLowerCase());
          return { ...child, matches };
        });
        const hasMatchingChild = childrenWithMatches.some(child => child.matches);
        const moduleNameMatches = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        const finalChildren = childrenWithMatches.filter(child => {
          if (searchQuery.trim() !== '') {
            return moduleNameMatches || child.matches;
          }
          return true;
        });

        const matches = moduleNameMatches || hasMatchingChild;
        return { ...item, children: finalChildren, matches };
      }
      return item;
    })
    .filter(item => {
      if (searchQuery.trim() !== '') {
        return item.matches;
      }
      return true;
    });

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {isOpen && (
          <div className="sidebar-logo" style={{ justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        )}

        {/* Sidebar Common Search Bar */}
        <div className="sidebar-search-container">
          <div className="sidebar-search-icon">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="sidebar-search-clear" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ul className="sidebar-menu">
            {filteredMenu.map(item => {
              if (item.type === 'link') {
                return (
                  <li key={item.name}>
                    <NavLink 
                      to={item.to} 
                      onClick={onClose} 
                      className={({ isActive }) => (item.isActive ? item.isActive() : isActive) ? 'sidebar-link active' : 'sidebar-link'}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                );
              } else if (item.type === 'module') {
                const expanded = isModuleExpanded(item.id);
                return (
                  <li key={item.id} className="sidebar-module-group">
                    <div 
                      className="sidebar-module-header"
                      onClick={() => toggleModule(item.id)}
                    >
                      <div className="sidebar-module-header-title">
                        {item.icon}
                        <span>{item.name}</span>
                      </div>
                      <div className="sidebar-module-toggle">
                        {expanded ? <Minus size={14} /> : <Plus size={14} />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="sidebar-module-children">
                        {item.children.map(child => (
                          <NavLink 
                            key={child.name}
                            to={child.to} 
                            onClick={onClose}
                            className={() => (child.isActive ? child.isActive() : location.pathname === child.to) ? 'sidebar-link active' : 'sidebar-link'}
                          >
                            {child.icon}
                            <span>{child.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </li>
                );
              }
              return null;
            })}
          </ul>

          <div className="sidebar-footer">
            {selectedBranch && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px', padding: '10px 12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: '700' }}>
                    <Building2 size={12} color="var(--accent)" />
                    <span>Active Branch</span>
                  </div>
                  <button
                    onClick={handleSwitchBranch}
                    title="Switch Branch"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Switch
                  </button>
                </div>
                <div 
                  title={selectedBranch}
                  style={{ 
                    fontSize: '12.5px', 
                    fontWeight: '600', 
                    color: '#ffffff',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {selectedBranch}
                </div>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}


