import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { User, Filter, AlertCircle } from 'lucide-react';
import { employeeService } from '../../../services/employeeService';
import { departmentService } from '../../../services/departmentService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../../EmployeePortal/EmployeePortal.css';

const OnLeaveStaff = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  useEffect(() => {
    if (currentUserProfile) {
      fetchOnLeaveStaff();
    }
  }, [selectedDeptId, currentUserProfile]);

  const fetchProfileAndData = async () => {
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!userStr) throw new Error("No user found");
      const userObj = JSON.parse(userStr);

      const res = await employeeService.getEmployeeById(userObj.employeeId, ['department', 'college']);
      if (res.success && res.data) {
        setCurrentUserProfile(res.data);
        
        // If the user is a DEAN, fetch all departments in their college for the filter
        if (userObj.role === 'DEAN' && res.data.collegeId) {
           const deptRes = await departmentService.getAllDepartments(1, 500);
           if (deptRes.success) {
             const collegeDepts = deptRes.data.filter(d => d.collegeId === res.data.collegeId);
             setDepartments(collegeDepts);
           }
        }
      } else {
         toast.error("Failed to load user profile");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOnLeaveStaff = async () => {
    if (!currentUserProfile) return;
    
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      const role = userStr ? JSON.parse(userStr).role : '';

      let filters = { employmentStatus: 'ONLEAVE' };

      if (role === 'HEAD' || role === 'HROFFICER') {
        // Head or Admin Dept Manager only sees their own department
        if (currentUserProfile.departmentId) {
           filters.departmentId = currentUserProfile.departmentId;
        }
      } else if (role === 'DEAN') {
        // Dean sees entire college, or a specific filtered department
        if (selectedDeptId) {
           filters.departmentId = selectedDeptId;
        } else if (currentUserProfile.collegeId) {
           filters.collegeId = currentUserProfile.collegeId;
        }
      }

      const res = await employeeService.getAllEmployees(1, 100, '', 'createdAt', 'DESC', filters);
      
      if (res.success) {
         setEmployees(res.data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch on-leave staff");
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalizedText = (en, am) => {
    if (isAmharic && am) return am;
    return en || am || '';
  };

  const getFullName = (emp) => {
    const enName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
    const amName = `${emp.firstNameAmharic || ''} ${emp.middleNameAmharic || ''} ${emp.lastNameAmharic || ''}`.trim();
    return getLocalizedText(enName, amName) || 'Employee';
  };

  return (
    <div className="employee-portal-container">
      <div className="portal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{isAmharic ? 'በፈቃድ ላይ ያሉ ሰራተኞች' : 'On-Leave Staff'}</h1>
          <p>{isAmharic ? 'በአሁኑ ሰዓት ፈቃድ ላይ ያሉ ሰራተኞች ዝርዝር' : 'List of employees currently on leave under your supervision.'}</p>
        </div>
        
        {currentUserProfile && currentUserProfile.employeeRole === 'DEAN' && (
          <div className="department-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Filter size={18} color="var(--text-secondary)" />
             <select 
               className="portal-select" 
               value={selectedDeptId} 
               onChange={(e) => setSelectedDeptId(e.target.value)}
               style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
             >
               <option value="">{isAmharic ? 'ሁሉም ዲፓርትመንቶች (ኮሌጅ)' : 'All Departments (College)'}</option>
               {departments.map(d => (
                 <option key={d.id} value={d.id}>{d.departmentName}</option>
               ))}
             </select>
          </div>
        )}
      </div>

      <div className="portal-table-wrapper">
        <table className="portal-data-table">
          <thead>
            <tr>
              <th>{isAmharic ? 'ስም' : 'Employee Name'}</th>
              <th>{isAmharic ? 'መለያ ቁጥር' : 'Code'}</th>
              <th>{isAmharic ? 'ዲፓርትመንት' : 'Department'}</th>
              <th>{isAmharic ? 'ቀን' : 'Hire Date'}</th>
              <th>{isAmharic ? 'ሁኔታ' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                  {isAmharic ? 'በመጫን ላይ...' : 'Loading...'}
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 10px', display: 'block' }} />
                  {isAmharic ? 'በአሁኑ ሰዓት ፈቃድ ላይ ያለ ሰራተኛ የለም።' : 'No staff members are currently on leave.'}
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {emp.profilePicture ? (
                           <img src={emp.profilePicture.startsWith('http') ? emp.profilePicture : `http://localhost:5000/${emp.profilePicture.replace(/^\//, '')}`} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                           <User size={16} color="#a0aec0" />
                        )}
                      </div>
                      <span style={{ fontWeight: 500 }}>{getFullName(emp)}</span>
                    </div>
                  </td>
                  <td>{emp.employeeCode}</td>
                  <td>{getLocalizedText(emp.departmentName, emp.departmentNameAmharic) || '-'}</td>
                  <td>{formatEthiopianDate(emp.hireDate)}</td>
                  <td>
                    <span className="status-badge pending">
                      {isAmharic ? 'በፈቃድ' : 'On Leave'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OnLeaveStaff;
