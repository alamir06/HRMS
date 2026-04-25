import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, User, Globe, LogOut, Menu, X, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import './Header.css';

const Header = ({ onOpenProfile, onToggleSidebar, isSidebarOpen = false }) => {
  const location = useLocation();
  const [isDarkTheme, setIsDarkTheme] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const user = JSON.parse((localStorage.getItem('user') || sessionStorage.getItem('user')) || '{}');

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const result = await notificationService.getUserNotifications(user.id);
      if (result.success) {
        setUnreadNotifications((result.data || []).filter(n => !n.isRead));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
    setUnreadNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'am' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
  };

  const generateBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    
    let rootName = 'Dashboard';
    if (user?.role === 'EMPLOYEE') rootName = 'Employee Portal';
    if (user?.role === 'HEAD') rootName = 'Head Portal';
    if (user?.role === 'DEAN') rootName = 'Dean Portal';
    
    return pathParts.map((part, index) => {
      const path = `/${pathParts.slice(0, index + 1).join('/')}`;
      let text = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      
      if (index === 0) text = rootName;
      
      return { text, path };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

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
    localStorage.removeItem('user');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Close dropdown on outside clicks
  useEffect(() => {
    const closeMenu = (e) => {
      if (dropdownOpen && !e.target.closest('.settings-dropdown-wrapper')) {
        setDropdownOpen(false);
      }
      if (notifDropdownOpen && !e.target.closest('.notif-dropdown-wrapper')) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [dropdownOpen, notifDropdownOpen]);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="header-breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <span 
                className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                onClick={() => navigate(crumb.path)}
              >
                {crumb.text}
              </span>
              {index < breadcrumbs.length - 1 && <span className="breadcrumb-separator">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="header-right">
        {/* Dark/Light Mode Config */}
        <button className="icon-action-btn" onClick={toggleTheme} aria-label="Toggle Theme">
          {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Global Notifications */}
        <div className="notif-dropdown-wrapper" style={{ position: 'relative' }}>
          <button 
            className={`icon-action-btn notification-btn ${notifDropdownOpen ? 'active' : ''}`} 
            title="View Notifications"
            onClick={(e) => { e.stopPropagation(); setNotifDropdownOpen(!notifDropdownOpen); setDropdownOpen(false); }}
          >
            <Bell size={20} />
            {unreadNotifications.length > 0 && (
              <span className="notification-badge">{unreadNotifications.length}</span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="settings-dropdown-menu notif-dropdown-menu" style={{ width: '320px', right: 0, padding: 0 }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Notifications</h3>
                <span style={{ fontSize: '0.8rem', color: '#0B8255', cursor: 'pointer' }} onClick={() => {
                  setNotifDropdownOpen(false);
                  const prefix = user?.role === 'HRMANAGER' ? '/dashboard' : 
                                 user?.role === 'EMPLOYEE' ? '/employee-portal' :
                                 user?.role === 'HEAD' ? '/head-portal' : '/dean-portal';
                  navigate(`${prefix}/notifications`);
                }}>View All</span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {unreadNotifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    No new notifications
                  </div>
                ) : (
                  unreadNotifications.slice(0, 5).map(notif => (
                    <div key={notif.id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#0f172a' }}>{notif.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        style={{ background: 'transparent', border: 'none', color: '#0B8255', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', alignSelf: 'flex-start', padding: '0.2rem' }}
                        title="Mark as Read"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); onOpenProfile && onOpenProfile(); }}>
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
