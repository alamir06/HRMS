import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Moon } from 'lucide-react';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';
import './Login.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate phone number format matching Ethiopian +251 9...
    const phoneRegex = /^9\d{8}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Please enter a valid phone number starting with 9 (9 digits total)");
      return;
    }

    try {
      setIsLoading(true);
      // Construct the identifier expected by the backend logic (+251 is fixed in UI)
      const identifier = `+251${phone}`;
      const response = await authService.login({ identifier, password });
      
      if (response.success && response.data?.token) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success("Login successful!");
        navigate('/dashboard');
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Session validation error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="login-master-container">
      <div className="login-split-card">
        {/* Left Side: SVG Illustration Panel */}
        <div className="login-left-panel">
          <div className="illustration-wrapper">
             {/* Creating the vector art with SVG to perfectly match the mockup's shapes */}
            <svg width="340" height="420" viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Phone Body */}
              <rect x="50" y="20" width="180" height="380" rx="35" fill="white" filter="url(#drop-shadow)" />
              {/* Phone Top Notch */}
              <rect x="110" y="30" width="60" height="8" rx="4" fill="#E5E7EB" />
              
              {/* Top 3 UI Circles */}
              <circle cx="95" cy="80" r="16" fill="#D1D5DB" />
              <circle cx="120" cy="80" r="16" fill="#9CA3AF" />
              <circle cx="145" cy="80" r="18" fill="#10B981" />
              
              {/* Lines representing UI text */}
              <rect x="90" y="140" width="100" height="4" rx="2" fill="#E5E7EB" />
              <rect x="75" y="155" width="130" height="4" rx="2" fill="#E5E7EB" />
              <rect x="75" y="170" width="130" height="4" rx="2" fill="#E5E7EB" />
              
              {/* Bottom Green Module Block inside Phone */}
              <rect x="140" y="220" width="60" height="30" rx="8" fill="#A7F3D0" />
              
              {/* The Abstract Geometric Character Next to Phone */}
              {/* Head */}
              <circle cx="230" cy="235" r="16" fill="#FBCFE8" />
              {/* Left Arm (pink) */}
              <rect x="200" y="260" width="10" height="30" rx="5" transform="rotate(-15 200 260)" fill="#FBCFE8" />
              {/* Right Arm (pink) */}
              <rect x="250" y="255" width="10" height="30" rx="5" transform="rotate(15 250 255)" fill="#FBCFE8" />
              {/* Main Body (Blue) */}
              <rect x="210" y="255" width="40" height="60" rx="8" fill="#3B82F6" />
              {/* Left Leg (Black) */}
              <rect x="215" y="320" width="8" height="50" rx="4" fill="#1F2937" />
              {/* Right Leg (Black) */}
              <rect x="235" y="320" width="8" height="50" rx="4" fill="#1F2937" />

              {/* Advanced native SVG shadow filter for the phone popup effect */}
              <defs>
                <filter id="drop-shadow" x="20" y="-10" width="240" height="440" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feDropShadow dx="-10" dy="15" stdDeviation="15" floodOpacity="0.1"/>
                </filter>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right Side: Login Form Panel */}
        <div className="login-right-panel">
          <div className="form-wrapper">
            <h1 className="login-heading">Sign in</h1>
            <p className="login-subtitle">
              Welcome back! Access your Injibara University HRMS Dashboard to manage registrations, customers, and security shifts.
            </p>

            <form onSubmit={handleLogin} className="pro-login-form">
              {/* Phone Input */}
              <div className="form-group">
                <label className="input-label">PHONE NUMBER</label>
                <div className="composite-input">
                  <div className="country-code">
                    <span className="flag-placeholder"></span>
                    
                    <span>+251</span>
                    <svg className="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <input 
                    id="username"
                    name="username"
                    type="tel" 
                    placeholder="Enter phone number" 
                    required 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength="9"
                    autoComplete="phone"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <div className="label-row">
                  <label className="input-label">PASSWORD <span className="star">*</span></label>
                  <a href="#" className="forgot-link">Forgot?</a>
                </div>
                <div className="composite-input password-input">
                  <input 
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={20} color="#9CA3AF" /> : <EyeOff size={20} color="#9CA3AF" />}
                  </button>
                </div>
              </div>

              {/* Checkbox */}
              <div className="form-group checkbox-group">
                <label className="checkbox-container">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  <span className="checkbox-label-text">Keep me signed in</span>
                </label>
              </div>

              {/* Submit */}
              <button type="submit" className="pro-btn-signin" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Dark Mode Toggle */}
      <button className="floating-theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
        <Moon size={22} color="#ffffff" />
      </button>
    </div>
  );
};

export default AdminLogin;
