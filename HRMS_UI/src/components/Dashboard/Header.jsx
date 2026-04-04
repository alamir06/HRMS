import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, User, Globe, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkTheme, setIsDarkTheme] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'am' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
  };

  const getPageTitle = (path) => {
    if (path === '/dashboard') return 'Dashboard Overview';
    const parts = path.split('/');
    const rawModule = parts[parts.length - 1];
    return rawModule.charAt(0).toUpperCase() + rawModule.slice(1);
  };

  const title = getPageTitle(location.pathname);

  // Toggle global theme exactly like in Login.jsx
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDarkTheme(newTheme === 'dark');
  };

  // Perform secure logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  // Close dropdown on outside clicks
  useEffect(() => {
    const closeMenu = (e) => {
      if (dropdownOpen && !e.target.closest('.settings-dropdown-wrapper')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [dropdownOpen]);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
        <p className="header-subtitle">Welcome back, here's what's happening today</p>
      </div>

      <div className="header-right">
        {/* Dark/Light Mode Config */}
        <button className="icon-action-btn" onClick={toggleTheme} aria-label="Toggle Theme">
          {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Global Notifications */}
        <button className="icon-action-btn notification-btn" title="View Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>

        {/* Account & Settings Dropdown */}
        <div className="settings-dropdown-wrapper">
          <button 
            className={`icon-action-btn ${dropdownOpen ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            title="Account Settings"
          >
            <Settings size={20} />
          </button>
          
          {dropdownOpen && (
            <div className="settings-dropdown-menu">
              <button className="dropdown-item">
                <User size={16} /> Profile
              </button>
              <button className="dropdown-item" onClick={toggleLanguage}>
                <Globe size={16} /> {i18n.language === 'en' ? 'አማርኛ (Amharic)' : 'English (U.S.)'}
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
