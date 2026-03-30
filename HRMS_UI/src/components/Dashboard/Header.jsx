import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Plus } from 'lucide-react';
import './Header.css';

const Header = () => {
  const location = useLocation();

  // Simple dynamic title generator based on route
  const getPageTitle = (path) => {
    if (path === '/dashboard') return 'Dashboard Overview';
    const parts = path.split('/');
    const rawModule = parts[parts.length - 1];
    return rawModule.charAt(0).toUpperCase() + rawModule.slice(1);
  };

  const title = getPageTitle(location.pathname);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
        <p className="header-subtitle">Welcome back, here's what's happening today</p>
      </div>

      <div className="header-right">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search employee..." className="search-input" />
        </div>

        <button className="notification-btn">
          <Bell size={22} color="var(--text-secondary)" />
          <span className="notification-badge"></span>
        </button>

        <button className="btn-new-task">
          <Plus size={18} /> New Task
        </button>
      </div>
    </header>
  );
};

export default Header;
