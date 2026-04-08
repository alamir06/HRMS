import React, { useState, useEffect } from 'react';
import { CalendarOff, Clock, LayoutDashboard, Megaphone } from 'lucide-react';
import '../EmployeePortal.css';
import './EmployeeOverview.css';;
import { toast } from 'react-toastify';

const EmployeeOverview = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>Welcome back, {user?.firstName || 'Employee'}!</h1>
        <p>Here is your overview for today.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <CalendarOff size={24} />
          </div>
          <div className="stat-details">
            <h3>Leaves Remaining</h3>
            <p className="stat-value">20 Days</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h3>Recent Attendance</h3>
            <p className="stat-value">On Time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Megaphone size={24} />
          </div>
          <div className="stat-details">
            <h3>Unread Notices</h3>
            <p className="stat-value">2</p>
          </div>
        </div>
      </div>
      
      <div className="portal-recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-placeholder">
          <p>No recent activity tracking yet.</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeOverview;
