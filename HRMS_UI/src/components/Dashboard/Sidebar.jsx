import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import injLogo from '../../assets/Landing images/logo.jpg';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  GraduationCap, 
  Clock, 
  Banknote, 
  CalendarOff, 
  Gift, 
  Briefcase, 
  Megaphone, 
  Bell, 
  UsersRound, 
  Component, 
  FileSearch,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FileBadge
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ onOpenProfile, mobileOpen = false, onCloseMobile }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(window.innerWidth <= 768);
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();

  useEffect(() => {
    try {
      const storedUser = (localStorage.getItem('user') || sessionStorage.getItem('user'));
      if (storedUser) {
        setAuthUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { t } = useTranslation();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

  const navItems = [
    { name: t('sidebar.dashboard', 'Dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: t('sidebar.employees', 'Employees'), path: '/dashboard/employees', icon: <Users size={20} /> },
    { name: t('sidebar.departments', 'Departments'), path: '/dashboard/departments', icon: <Building2 size={20} /> },
    { name: t('sidebar.colleges', 'Colleges'), path: '/dashboard/colleges', icon: <GraduationCap size={20} /> },
    { name: t('sidebar.attendance', 'Attendance'), path: '/dashboard/attendance', icon: <Clock size={20} /> },
    { name: t('sidebar.leave', 'Leave'), path: '/dashboard/leave', icon: <CalendarOff size={20} /> },
    // { name: t('sidebar.payroll', 'Payroll'), path: '/dashboard/payroll', icon: <Banknote size={20} /> },
    { 
      name: t('sidebar.benefits', 'Benefits'), 
      icon: <Gift size={20} />,
      subItems: [
        { name: t('sidebar.benefitList', 'Benefit List'), path: '/dashboard/benefit/list' },
        { name: t('sidebar.benefitAssignment', 'Benefit Assignment'), path: '/dashboard/benefit/assignment' }
      ]
    },
    { 
      name: t('sidebar.assets', 'Assets'), 
      icon: <Component size={20} />,
      subItems: [
        { name: t('sidebar.assetList', 'Asset List'), path: '/dashboard/asset/list' },
        { name: t('sidebar.assetAssignment', 'Asset Assignment'), path: '/dashboard/asset/assignment' }
      ]
    },
    { name: t('sidebar.recommendations', 'Recommendation Requests'), path: '/dashboard/recommendations', icon: <FileBadge size={20} /> },
    { name: t('sidebar.recruitment', 'Recruitment'), path: '/dashboard/recruitment', icon: <FileSearch size={20} /> },
    { name: t('sidebar.designations', 'Designations'), path: '/dashboard/designation', icon: <Briefcase size={20} /> },
    { name: t('sidebar.outsourcing', 'Outsourcing'), path: '/dashboard/outsourcing', icon: <UsersRound size={20} /> },
    { name: t('sidebar.noticeBoard', 'Notice Board'), path: '/dashboard/notices', icon: <Megaphone size={20} /> },
    { name: t('sidebar.notifications', 'Notifications'), path: '/dashboard/notifications', icon: <Bell size={20} /> },
  ];

  const shouldCollapse = isMobileViewport ? false : isCollapsed;

  return (
    <aside className={`dashboard-sidebar ${shouldCollapse ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-wrapper">
          <img src={injLogo} alt="INJ Logo" className="brand-logo-img" />
          {!shouldCollapse && <span className="brand-text">HRMS.</span>}
        </div>
        <button 
          className="collapse-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              {item.subItems ? (
                <>
                  <div 
                    className={`nav-link ${item.subItems.some(sub => location.pathname.startsWith(sub.path)) ? 'active' : ''}`}
                    onClick={() => {
                       setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }));
                       if (shouldCollapse) setIsCollapsed(false);
                    }}
                    title={shouldCollapse ? item.name : undefined}
                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="nav-icon-wrapper">{item.icon}</div>
                      {!shouldCollapse && <span className="nav-text">{item.name}</span>}
                    </div>
                    {!shouldCollapse && (
                      expandedMenus[item.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                    )}
                  </div>
                  {(!shouldCollapse && expandedMenus[item.name]) && (
                    <ul className="nav-sub-items">
                      {item.subItems.map((subItem, idx) => (
                        <li key={idx}>
                          <NavLink
                            to={subItem.path}
                            className={({ isActive }) => isActive ? 'nav-sub-link active' : 'nav-sub-link'}
                            onClick={() => onCloseMobile && onCloseMobile()}
                          >
                            {subItem.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NavLink 
                  to={item.path} 
                  end={item.path === '/dashboard'} 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  title={shouldCollapse ? item.name : undefined}
                  onClick={() => onCloseMobile && onCloseMobile()}
                >
                  <div className="nav-icon-wrapper">{item.icon}</div>
                  {!shouldCollapse && <span className="nav-text">{item.name}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Moved from top to bottom fixed footer space */}
      <div className="sidebar-footer">
        <div className="user-profile-widget" onClick={() => onOpenProfile && onOpenProfile()} style={{ cursor: 'pointer' }}>
          <div className="user-avatar" title={shouldCollapse ? authUser?.name || 'Admin User' : undefined}>
            <img 
              src={
                authUser?.profilePicture 
                    ? (authUser.profilePicture.startsWith('http') 
                      ? authUser.profilePicture 
                      : `${apiOrigin}/${authUser.profilePicture.replace(/^\//, '')}`)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || "Admin User")}&background=0B8255&color=fff`
              } 
              onError={(e) => { 
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || "Admin User")}&background=0B8255&color=fff`; 
              }}
              alt="User Profile" 
            />
          </div>
          {!shouldCollapse && (
            <div className="user-info">
              <span className="user-name">{authUser?.name || 'Admin User'}</span>
              <span className="user-role">
                {authUser?.role 
                  ? authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1).toLowerCase().replace('_', ' ') 
                  : 'Manager Access'
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
