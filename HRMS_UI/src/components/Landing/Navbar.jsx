import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Sun, Moon } from 'lucide-react';
import injLogo from '../../assets/inj-logo.jpg';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setIsDark(currentTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDark(!isDark);
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <div className="nav-logo">
          <div className="logo-icon-wrapper" style={{ overflow: 'hidden', padding: 0, width: 50, height: 50, borderRadius: '50%' }}>
            <img src={injLogo} alt="Injibara Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="nav-brand-text">
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Injibara University</span>
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>ኢንጂባራ ዩኒቨርሲቲ</span>
            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.9 }}>Explore your creativity potential</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="btn-signin" onClick={() => navigate('/login')}>
            SIGN IN
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
