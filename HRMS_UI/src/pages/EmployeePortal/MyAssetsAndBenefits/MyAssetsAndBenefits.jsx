import React from 'react';
import '../EmployeePortal.css';
import './MyAssetsAndBenefits.css';;

const MyAssetsAndBenefits = () => {
  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Assets & Benefits</h1>
        <p>Review the assets provided to you and your enrolled benefits.</p>
      </div>
      <div className="portal-stats-grid">
        <div className="stat-card">
          <div className="stat-details">
             <h3>Active Assets</h3>
             <p className="stat-value">0 Assigned</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-details">
             <h3>Active Benefits</h3>
             <p className="stat-value">0 Enrolled</p>
          </div>
        </div>
      </div>
      <div className="portal-recent-activity">
        <h2>Detailed Inventory</h2>
        <div className="activity-placeholder">
          <p>You have no recorded assets or benefits at this time.</p>
        </div>
      </div>
    </div>
  );
};

export default MyAssetsAndBenefits;
