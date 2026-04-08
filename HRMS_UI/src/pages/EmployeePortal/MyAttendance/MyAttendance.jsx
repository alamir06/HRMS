import React from 'react';
import '../EmployeePortal.css';
import './MyAttendance.css';;

const MyAttendance = () => {
  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Attendance</h1>
        <p>View your clock-ins, clock-outs, and accumulated hours.</p>
      </div>
      <div className="portal-recent-activity">
        <h2>Attendance Log</h2>
        <div className="activity-placeholder">
          <p>No attendance records found for the current period.</p>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
