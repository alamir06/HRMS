import React from 'react';
import { NavLink } from 'react-router-dom';
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
  LogOut
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Employees', path: '/dashboard/employees', icon: <Users size={20} /> },
    { name: 'Departments', path: '/dashboard/departments', icon: <Building2 size={20} /> },
    { name: 'Colleges', path: '/dashboard/colleges', icon: <GraduationCap size={20} /> },
    { name: 'Attendance', path: '/dashboard/attendance', icon: <Clock size={20} /> },
    { name: 'Payroll', path: '/dashboard/payroll', icon: <Banknote size={20} /> },
    { name: 'Leave', path: '/dashboard/leave', icon: <CalendarOff size={20} /> },
    { name: 'Benefits', path: '/dashboard/benefit', icon: <Gift size={20} /> },
    { name: 'Assets', path: '/dashboard/asset', icon: <Component size={20} /> },
    { name: 'Recruitment', path: '/dashboard/recruitment', icon: <FileSearch size={20} /> },
    { name: 'Designations', path: '/dashboard/designation', icon: <Briefcase size={20} /> },
    { name: 'Outsourcing', path: '/dashboard/outsourcing', icon: <UsersRound size={20} /> },
    { name: 'Notice Board', path: '/dashboard/notice', icon: <Megaphone size={20} /> },
    { name: 'Notifications', path: '/dashboard/notification', icon: <Bell size={20} /> },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="user-profile-widget" style={{ backgroundColor: 'transparent', padding: 0 }}>
          <div className="user-avatar" style={{ overflow: 'hidden' }}>
            <img src="https://ui-avatars.com/api/?name=Admin+User&background=0D875A&color=fff" alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <span className="user-role">Manager Access</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <NavLink 
                to={item.path} 
                end={item.path === '/dashboard'} 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <div className="nav-icon-wrapper">{item.icon}</div>
                <span className="nav-text">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-button" onClick={() => {
          localStorage.removeItem('adminToken');
          window.location.href = '/login';
        }}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
