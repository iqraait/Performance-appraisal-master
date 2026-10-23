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
  BookOpen,
  Award,
  MapPin
} from 'lucide-react';
import iqraaLogo from '../assets/iqraa-logo.png';
import iqraaLogoWhite from '../assets/iqraa-logo-white.png';

export default function Sidebar({ user, onLogout, selectedBranch, setSelectedBranch, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperOrStaff = user && (user.is_superuser || (user.is_staff && user.role !== 'department_admin'));
  const isDeptAdmin = user && user.role === 'department_admin';
  const isAdmin = isSuperOrStaff || isDeptAdmin;
  const canSeeReports = isSuperOrStaff || isDeptAdmin;

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
      visible: isSuperOrStaff,
      children: [
        {
          name: 'Employee Master',
          to: '/employees',
          icon: <Users size={18} />,
          isActive: () => location.pathname === '/employees',
          visible: isSuperOrStaff,
        },
        {
          name: 'Location Master',
          to: '/locations',
          icon: <MapPin size={18} />,
          isActive: () => location.pathname === '/locations',
          visible: isSuperOrStaff,
        },
        {
          name: 'Incentive Master',
          to: '/incentives',
          icon: <Award size={18} />,
          isActive: () => location.pathname === '/incentives',
          visible: isSuperOrStaff,
        }
      ]
    },
    {
      type: 'module',
      id: 'trainingMaster',
      name: 'Training Master',
      icon: <BookOpen size={18} />,
      visible: isSuperOrStaff,
      children: [
        {
          name: 'Training Directory',
          to: '/training',
          icon: <BookOpen size={18} />,
          isActive: () => location.pathname === '/training',
          visible: isSuperOrStaff,
        },
        {
          name: 'Trainee Assessment',
          to: '/trainee-assessment',
          icon: <FileText size={18} />,
          isActive: () => location.pathname === '/trainee-assessment',
          visible: isSuperOrStaff,
        }
      ]
    },
    {
      type: 'module',
      id: 'reports',
      name: 'Reports',
      icon: <BarChart3 size={18} />,
      visible: canSeeReports,
      children: [
        {
          name: 'Appraisal Report',
          to: '/reports',
          icon: <FileText size={18} />,
          isActive: () => location.pathname === '/reports' && currentTab !== 'incentives',
          visible: canSeeReports,
        },
        {
          name: 'Incentive Report',
          to: '/reports?tab=incentives',
          icon: <Award size={18} />,
          isActive: () => location.pathname === '/reports' && currentTab === 'incentives',
          visible: canSeeReports,
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
        {/* Sidebar Official Brand Logo (Light Background Box) */}
        <div className="sidebar-brand-container">
          <div className="sidebar-brand-header">
            <img 
              src={iqraaLogo} 
              alt="IQRAA International Hospital and Research Centre" 
              className="sidebar-brand-logo-img"
              onError={(e) => { e.currentTarget.src = iqraaLogoWhite; }}
            />
          </div>
          {isOpen && (
            <button onClick={onClose} className="sidebar-mobile-close" title="Close Menu">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Common Search Bar */}
        <div className="sidebar-search-container">
          <Search size={15} className="sidebar-search-icon" />
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
              <X size={13} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {filteredMenu.map(item => {
              if (item.type === 'link') {
                return (
                  <li key={item.name} className="sidebar-menu-item">
                    <NavLink 
                      to={item.to} 
                      onClick={onClose} 
                      className={({ isActive }) => (item.isActive ? item.isActive() : isActive) ? 'sidebar-link active' : 'sidebar-link'}
                    >
                      <span className="sidebar-link-icon">{item.icon}</span>
                      <span className="sidebar-link-text">{item.name}</span>
                    </NavLink>
                  </li>
                );
              } else if (item.type === 'module') {
                const expanded = isModuleExpanded(item.id);
                return (
                  <li key={item.id} className="sidebar-module-group">
                    <div 
                      className={`sidebar-module-header ${expanded ? 'expanded' : ''}`}
                      onClick={() => toggleModule(item.id)}
                    >
                      <div className="sidebar-module-header-title">
                        <span className="sidebar-link-icon">{item.icon}</span>
                        <span className="sidebar-link-text">{item.name}</span>
                      </div>
                      <div className="sidebar-module-toggle">
                        {expanded ? <Minus size={13} /> : <Plus size={13} />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="sidebar-module-children">
                        {item.children.map(child => (
                          <NavLink 
                            key={child.name}
                            to={child.to} 
                            onClick={onClose}
                            className={() => (child.isActive ? child.isActive() : location.pathname === child.to) ? 'sidebar-sublink active' : 'sidebar-sublink'}
                          >
                            <span className="sidebar-sublink-icon">{child.icon}</span>
                            <span className="sidebar-sublink-text">{child.name}</span>
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

          {/* Bottom Active Branch Widget & Decorative Wave */}
          <div className="sidebar-footer">
            <div className="sidebar-branch-card">
              <div className="sidebar-branch-header">
                <div className="sidebar-branch-status">
                  <span className="sidebar-status-dot"></span>
                  <span>ACTIVE BRANCH</span>
                </div>
                <button
                  onClick={handleSwitchBranch}
                  title="Switch Branch"
                  className="sidebar-branch-switch-btn"
                >
                  Switch
                </button>
              </div>
              <div className="sidebar-branch-body">
                <Building2 size={16} className="sidebar-branch-icon" />
                <span className="sidebar-branch-name" title={selectedBranch || 'IQRAA INTERNATIONAL HOSPITAL'}>
                  {selectedBranch || 'IQRAA INTERNATIONAL HO...'}
                </span>
              </div>
            </div>

            {/* Decorative Wavy Curve in Sidebar Bottom */}
            <div className="sidebar-waves-bg" aria-hidden="true">
              <svg viewBox="0 0 260 120" preserveAspectRatio="none" className="sidebar-wave-svg">
                <path d="M0,45 C75,15 160,85 260,35 L260,120 L0,120 Z" fill="#0b245c" opacity="0.45" />
                <path d="M0,75 C90,40 180,105 260,65 L260,120 L0,120 Z" fill="#0e327f" opacity="0.35" />
              </svg>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}


