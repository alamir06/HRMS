import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './pages/LandingPage';
import Attendance from './pages/HRManager/Attendance/Attendance.jsx';
import AdminLogin from './pages/Admin/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/Admin/DashboardOverview';
import BenefitList from './pages/HRManager/Benefits/BenefitList/BenefitList';
import BenefitAssignment from './pages/HRManager/Benefits/BenefitAssignment/BenefitAssignment';
import Colleges from './pages/HRManager/Colleges/Colleges';
import Departments from './pages/HRManager/Departments/Departments';
import Employees from './pages/HRManager/Employees/EmployeeList/Employees';
import EmployeeProfile from './pages/HRManager/Employees/EmployeeProfile/EmployeeProfile';
import OutsourcingCompanies from './pages/HRManager/OutsourcingCompanies/OutsourcingCompanies';
import EmployeeDashboardLayout from './layouts/EmployeeDashboardLayout';
import EmployeeOverview from './pages/EmployeePortal/EmployeeOverview/EmployeeOverview';
import MyLeaves from './pages/EmployeePortal/MyLeaves/MyLeaves';
import MyAttendance from './pages/EmployeePortal/MyAttendance/MyAttendance';
import MyAssetsAndBenefits from './pages/EmployeePortal/MyAssetsAndBenefits/MyAssetsAndBenefits';
import MyNotices from './pages/EmployeePortal/MyNotices/MyNotices';
import MyNotifications from './pages/EmployeePortal/MyNotifications/MyNotifications';
import LeaveRequests from './pages/HRManager/Leaves/LeaveRequests';
import Designations from './pages/HRManager/Designation/Designations';
import AssetList from './pages/HRManager/Assets/AssetList/AssetList';
import AssetAssignment from './pages/HRManager/Assets/AssetAssignment/AssetAssignment';
import Recruitment from './pages/HRManager/Recruitment/Recruitment';
import HeadDashboardLayout from './layouts/HeadDashboardLayout';
import DeanDashboardLayout from './layouts/DeanDashboardLayout';
import HRManagerNotices from './pages/HRManager/Notices/HRManagerNotices';
import HeadNotices from './pages/HeadPortal/Notices/HeadNotices';
import DeanNotices from './pages/DeanPortal/Notices/DeanNotices';
import './index.css';

// Admin Protected Route Component
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('user');
  let isAuthorized = false;
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'HRMANAGER' || user.role === 'ADMIN' || user.role === 'SUPERADMIN' || !user.role) {
        isAuthorized = true;
      }
    } catch(e) {}
  }
  
  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Employee Protected Route Component
const EmployeeProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('user');
  let isAuthorized = false;
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'EMPLOYEE') {
        isAuthorized = true;
      }
    } catch(e) {}
  }
  
  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Head Protected Route Component
const HeadProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('user');
  let isAuthorized = false;
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'HEAD') {
        isAuthorized = true;
      }
    } catch(e) {}
  }
  
  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Dean Protected Route Component
const DeanProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('user');
  let isAuthorized = false;
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'DEAN') {
        isAuthorized = true;
      }
    } catch(e) {}
  }
  
  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'EMPLOYEE') return <Navigate to="/employee-portal" replace />;
      if (user.role === 'HEAD') return <Navigate to="/head-portal" replace />;
      if (user.role === 'DEAN') return <Navigate to="/dean-portal" replace />;
      return <Navigate to="/dashboard" replace />;
    } catch(e) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          } 
        />

        {/* Admin Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <AdminProtectedRoute>
              <DashboardLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="benefit/list" element={<BenefitList />} />
          <Route path="benefit/assignment" element={<BenefitAssignment />} />
          <Route path="colleges" element={<Colleges />} />
          <Route path="departments" element={<Departments />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="outsourcing" element={<OutsourcingCompanies />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<LeaveRequests />} />
          <Route path="designation" element={<Designations />} />
          <Route path="asset/list" element={<AssetList />} />
          <Route path="asset/assignment" element={<AssetAssignment />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="notices" element={<HRManagerNotices />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Employee Portal Routes */}
        <Route 
          path="/employee-portal" 
          element={
            <EmployeeProtectedRoute>
              <EmployeeDashboardLayout />
            </EmployeeProtectedRoute>
          }
        >
          <Route index element={<EmployeeOverview />} />
          <Route path="leaves" element={<MyLeaves />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="assets" element={<MyAssetsAndBenefits />} />
          <Route path="benefits" element={<MyAssetsAndBenefits />} />
          <Route path="notices" element={<MyNotices />} />
          <Route path="notifications" element={<MyNotifications />} />
        </Route>

        {/* Head Portal Routes */}
        <Route 
          path="/head-portal" 
          element={
            <HeadProtectedRoute>
              <HeadDashboardLayout />
            </HeadProtectedRoute>
          }
        >
          <Route index element={<EmployeeOverview />} />
          <Route path="notices" element={<HeadNotices />} />
          <Route path="notifications" element={<MyNotifications />} />
        </Route>

        {/* Dean Portal Routes */}
        <Route 
          path="/dean-portal" 
          element={
            <DeanProtectedRoute>
              <DeanDashboardLayout />
            </DeanProtectedRoute>
          }
        >
          <Route index element={<EmployeeOverview />} />
          <Route path="notices" element={<DeanNotices />} />
          <Route path="notifications" element={<MyNotifications />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;