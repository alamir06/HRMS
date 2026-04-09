import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Dashboard/Sidebar';
import Header from '../components/Dashboard/Header';
import EmployeeProfileModal from '../pages/HRManager/Employees/EmployeeProfile/EmployeeProfile';
import { toast } from 'react-toastify';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const [profileOpenId, setProfileOpenId] = useState(null);

  const handleOpenProfile = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.employeeId) {
        setProfileOpenId(user.employeeId);
      } else {
        toast.info("No employee record linked to this account.");
      }
    } catch(e) {}
  };
  return (
    <div className="dashboard-layout-container">
      <Sidebar onOpenProfile={handleOpenProfile} />
      <div className="dashboard-main-content">
        <Header onOpenProfile={handleOpenProfile} />
        <main className="dashboard-outlet-wrapper">
          <Outlet />
        </main>
      </div>
      
      {profileOpenId && (
         <EmployeeProfileModal 
            employeeId={profileOpenId} 
            onClose={() => setProfileOpenId(null)} 
         />
      )}
    </div>
  );
};

export default DashboardLayout;
