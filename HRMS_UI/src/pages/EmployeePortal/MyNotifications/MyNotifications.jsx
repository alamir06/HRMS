import React from 'react';
import '../EmployeePortal.css';
import './MyNotifications.css';;

const MyNotifications = () => {
  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>Notifications</h1>
        <p>Your recent system alerts.</p>
      </div>
      <div className="portal-recent-activity">
        <h2>Inbox</h2>
        <div className="activity-placeholder">
          <p>You have no new notifications.</p>
        </div>
      </div>
    </div>
  );
};

export default MyNotifications;
