import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import injLogo from '../../assets/inj-logo.jpg';
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ onOpenProfile }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setAuthUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }
  }, []);

  const { t } = useTranslation();

  const navItems = [
    { name: t('sidebar.dashboard', 'Dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: t('sidebar.employees', 'Employees'), path: '/dashboard/employees', icon: <Users size={20} /> },
    { name: t('sidebar.departments', 'Departments'), path: '/dashboard/departments', icon: <Building2 size={20} /> },
    { name: t('sidebar.colleges', 'Colleges'), path: '/dashboard/colleges', icon: <GraduationCap size={20} /> },
    { name: t('sidebar.attendance', 'Attendance'), path: '/dashboard/attendance', icon: <Clock size={20} /> },
    { name: t('sidebar.payroll', 'Payroll'), path: '/dashboard/payroll', icon: <Banknote size={20} /> },
    { name: t('sidebar.leave', 'Leave'), path: '/dashboard/leave', icon: <CalendarOff size={20} /> },
    { name: t('sidebar.benefits', 'Benefits'), path: '/dashboard/benefits', icon: <Gift size={20} /> },
    { name: t('sidebar.assets', 'Assets'), path: '/dashboard/asset', icon: <Component size={20} /> },
    { name: t('sidebar.recruitment', 'Recruitment'), path: '/dashboard/recruitment', icon: <FileSearch size={20} /> },
    { name: t('sidebar.designations', 'Designations'), path: '/dashboard/designation', icon: <Briefcase size={20} /> },
    { name: t('sidebar.outsourcing', 'Outsourcing'), path: '/dashboard/outsourcing', icon: <UsersRound size={20} /> },
    { name: t('sidebar.noticeBoard', 'Notice Board'), path: '/dashboard/notice', icon: <Megaphone size={20} /> },
    { name: t('sidebar.notifications', 'Notifications'), path: '/dashboard/notification', icon: <Bell size={20} /> },
  ];

  return (
    <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-wrapper">
          <img src={injLogo} alt="INJ Logo" className="brand-logo-img" />
          {!isCollapsed && <span className="brand-text">HRMS.</span>}
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
              <NavLink 
                to={item.path} 
                end={item.path === '/dashboard'} 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="nav-icon-wrapper">{item.icon}</div>
                {!isCollapsed && <span className="nav-text">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Moved from top to bottom fixed footer space */}
      <div className="sidebar-footer">
        <div className="user-profile-widget" onClick={() => onOpenProfile && onOpenProfile()} style={{ cursor: 'pointer' }}>
          <div className="user-avatar" title={isCollapsed ? authUser?.name || 'Admin User' : undefined}>
            <img 
              src={
                authUser?.profilePicture 
                  ? (authUser.profilePicture.startsWith('http') 
                      ? authUser.profilePicture 
                      : `http://localhost:5000/${authUser.profilePicture.replace(/^\//, '')}`)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || "Admin User")}&background=0B8255&color=fff`
              } 
              onError={(e) => { 
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || "Admin User")}&background=0B8255&color=fff`; 
              }}
              alt="User Profile" 
            />
          </div>
          {!isCollapsed && (
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
