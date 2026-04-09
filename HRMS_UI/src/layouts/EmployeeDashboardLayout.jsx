import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EmployeeSidebar from '../components/Dashboard/EmployeeSidebar';
import Header from '../components/Dashboard/Header';
import EmployeeProfileModal from '../pages/HRManager/Employees/EmployeeProfile/EmployeeProfile';
import { toast } from 'react-toastify';
import './DashboardLayout.css';

const EmployeeDashboardLayout = () => {
  const [profileOpenId, setProfileOpenId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

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
    <div className={`dashboard-layout-container ${isMobileSidebarOpen ? 'sidebar-open' : ''}`}>
      <EmployeeSidebar
        onOpenProfile={handleOpenProfile}
        mobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <button
        type="button"
        className="dashboard-sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      <div className="dashboard-main-content">
        <Header
          onOpenProfile={handleOpenProfile}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          isSidebarOpen={isMobileSidebarOpen}
        />
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

export default EmployeeDashboardLayout;
