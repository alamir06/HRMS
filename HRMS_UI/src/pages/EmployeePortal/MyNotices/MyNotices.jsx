import React from 'react';
import '../EmployeePortal.css';
import './MyNotices.css';;

const MyNotices = () => {
  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>Company Notices</h1>
        <p>Stay updated with the latest announcements.</p>
      </div>
      <div className="portal-recent-activity">
        <h2>Notice Board</h2>
        <div className="activity-placeholder">
          <p>No new notices at this time.</p>
        </div>
      </div>
    </div>
  );
};

export default MyNotices;
