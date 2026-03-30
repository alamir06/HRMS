import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import injLogo from '../../assets/inj-logo.jpg';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <div className="nav-logo">
          <div className="logo-icon-wrapper" style={{ overflow: 'hidden', padding: 0, width: 40, height: 40, borderRadius: '50%' }}>
            <img src={injLogo} alt="Injibara Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <div className="nav-actions">
          <button className="btn-signin" onClick={() => navigate('/login')}>
            SIGN IN
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
