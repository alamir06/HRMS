import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './pages/LandingPage';
import Attendance from './pages/Attendance/Attendance.jsx';
import AdminLogin from './pages/Admin/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/Admin/DashboardOverview';
import Benefits from './pages/Benefits/Benefits';
import Colleges from './pages/Colleges/Colleges';
import Departments from './pages/Departments/Departments';
import Employees from './pages/Employees/Employees';
import EmployeeProfile from './pages/Employees/EmployeeProfile';
import OutsourcingCompanies from './pages/OutsourcingCompanies/OutsourcingCompanies';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('adminToken') !== null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('adminToken') !== null;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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

        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="benefits" element={<Benefits />} />
          <Route path="benefit" element={<Benefits />} />
          <Route path="colleges" element={<Colleges />} />
          <Route path="departments" element={<Departments />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
<<<<<<< HEAD
          <Route path="outsourcing" element={<OutsourcingCompanies />} />
          
          {/* Future sub-routes like /dashboard/payroll will go here */}
          {/* Catch-all for unmatched dashboard routes */}
=======
          <Route path="attendance" element={<Attendance />} />
>>>>>>> 2ccae2f3c26c787288c336d7a82cb2f2e92c6ee8
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;