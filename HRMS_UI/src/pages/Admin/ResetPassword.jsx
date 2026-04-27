import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';
import './Login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Extract token from URL query params
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');
    
    if (!tokenParam) {
      toast.error('Invalid or missing password reset token.');
      navigate('/login');
    } else {
      setToken(tokenParam);
    }
  }, [location, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error("Password must be at least 8 characters long and include upper, lower case letters, and a number.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.resetPassword({ 
        token, 
        newPassword, 
        confirmPassword 
      });

      if (response.success) {
        toast.success(response.message || "Password has been successfully reset!");
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reset password. The link might be expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-master-container">
      <div className="login-split-card">
        {/* Left Side: SVG Illustration Panel (Same as Login) */}
        <div className="login-left-panel">
          <div className="illustration-wrapper">
            <svg width="340" height="420" viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="20" width="180" height="380" rx="35" fill="white" filter="url(#drop-shadow)" />
              <rect x="110" y="30" width="60" height="8" rx="4" fill="#E5E7EB" />
              <circle cx="95" cy="80" r="16" fill="#D1D5DB" />
              <circle cx="120" cy="80" r="16" fill="#9CA3AF" />
              <circle cx="145" cy="80" r="18" fill="#10B981" />
              <rect x="90" y="140" width="100" height="4" rx="2" fill="#E5E7EB" />
              <rect x="75" y="155" width="130" height="4" rx="2" fill="#E5E7EB" />
              <rect x="75" y="170" width="130" height="4" rx="2" fill="#E5E7EB" />
              <rect x="140" y="220" width="60" height="30" rx="8" fill="#A7F3D0" />
              <circle cx="230" cy="235" r="16" fill="#FBCFE8" />
              <rect x="200" y="260" width="10" height="30" rx="5" transform="rotate(-15 200 260)" fill="#FBCFE8" />
              <rect x="250" y="255" width="10" height="30" rx="5" transform="rotate(15 250 255)" fill="#FBCFE8" />
              <rect x="210" y="255" width="40" height="60" rx="8" fill="#3B82F6" />
              <rect x="215" y="320" width="8" height="50" rx="4" fill="#1F2937" />
              <rect x="235" y="320" width="8" height="50" rx="4" fill="#1F2937" />
              <defs>
                <filter id="drop-shadow" x="20" y="-10" width="240" height="440" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feDropShadow dx="-10" dy="15" stdDeviation="15" floodOpacity="0.1" />
                </filter>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right Side: Reset Password Form Panel */}
        <div className="login-right-panel">
          <div className="form-wrapper">
            <h1 className="login-heading">Set New Password</h1>
            <p className="login-subtitle">
              Please enter your new password below. Make sure it's strong and secure.
            </p>

            <form onSubmit={handleResetPassword} className="pro-login-form">
              {/* New Password Input */}
              <div className="form-group">
                <div className="label-row">
                  <label className="input-label">NEW PASSWORD <span className="star">*</span></label>
                </div>
                <div className="composite-input password-input">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <Eye size={20} color="#9CA3AF" /> : <EyeOff size={20} color="#9CA3AF" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="form-group">
                <div className="label-row">
                  <label className="input-label">CONFIRM PASSWORD <span className="star">*</span></label>
                </div>
                <div className="composite-input password-input">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <Eye size={20} color="#9CA3AF" /> : <EyeOff size={20} color="#9CA3AF" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className="pro-btn-signin" disabled={isLoading} style={{ marginTop: '1rem' }}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
