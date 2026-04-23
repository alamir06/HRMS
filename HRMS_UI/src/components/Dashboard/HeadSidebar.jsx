import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import injLogo from '../../assets/inj-logo.jpg';
import { 
  LayoutDashboard, 
  Megaphone,
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const HeadSidebar = ({ onOpenProfile, mobileOpen = false, onCloseMobile }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(window.innerWidth <= 768);

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

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { t } = useTranslation();

  const navItems = [
    { name: t('sidebar.overview', 'Overview'), path: '/head-portal', icon: <LayoutDashboard size={20} /> },
    { name: t('sidebar.companyNotices', 'Notices'), path: '/head-portal/notices', icon: <Megaphone size={20} /> },
    { name: t('sidebar.notifications', 'Notifications'), path: '/head-portal/notifications', icon: <Bell size={20} /> },
  ];

  const shouldCollapse = isMobileViewport ? false : isCollapsed;

  return (
    <aside className={`dashboard-sidebar ${shouldCollapse ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-wrapper">
          <img src={injLogo} alt="INJ Logo" className="brand-logo-img" />
          {!shouldCollapse && <span className="brand-text">Head Portal</span>}
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
                end={item.path === '/head-portal'} 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                title={shouldCollapse ? item.name : undefined}
                onClick={() => onCloseMobile && onCloseMobile()}
              >
                <div className="nav-icon-wrapper">{item.icon}</div>
                {!shouldCollapse && <span className="nav-text">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-widget" onClick={() => onOpenProfile && onOpenProfile()} style={{ cursor: 'pointer' }}>
          <div className="user-avatar" title={shouldCollapse ? authUser?.name || 'Department Head' : undefined}>
            <img 
              src={
                authUser?.profilePicture 
                  ? (authUser.profilePicture.startsWith('http') 
                      ? authUser.profilePicture 
                      : `http://localhost:5000/${authUser.profilePicture.replace(/^\//, '')}`)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || "Head")}&background=0B8255&color=fff`
              } 
              onError={(e) => { 
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || "Head")}&background=0B8255&color=fff`; 
              }}
              alt="User Profile" 
            />
          </div>
          {!shouldCollapse && (
            <div className="user-info">
              <span className="user-name">{authUser?.name || 'Department Head'}</span>
              <span className="user-role">Dept Head</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default HeadSidebar;
