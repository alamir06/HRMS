import React from 'react';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';
import injLogo from '../../assets/inj-logo.jpg';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="container footer-container">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src={injLogo} alt="Injibara Logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <span>Injibara University HRMS</span>
          </div>
          <p className="brand-desc">
            Empowering university administration with advanced HR management tools and analytics.
          </p>
        </div>
        
        <div className="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/login">Admin Portal</a></li>
            <li><a href="#notices">Notice Board</a></li>
          </ul>
        </div>
        
        <div className="footer-contact">
          <h4>Contact Us</h4>
          <ul>
            <li><MapPin size={16} /> Injibara, Ethiopia</li>
            <li><Phone size={16} /> +251 911 234 567</li>
            <li><Mail size={16} /> info@injibara.edu.et</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Injibara University. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
