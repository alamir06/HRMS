import React from 'react';
import { Outlet } from 'react-router-dom';
import EmployeeSidebar from '../components/Dashboard/EmployeeSidebar';
import Header from '../components/Dashboard/Header';
import './DashboardLayout.css';

const EmployeeDashboardLayout = () => {
  return (
    <div className="dashboard-layout-container">
      <EmployeeSidebar />
      <div className="dashboard-main-content">
        <Header />
        <main className="dashboard-outlet-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboardLayout;
