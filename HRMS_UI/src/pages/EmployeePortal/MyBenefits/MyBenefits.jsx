import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { benefitService } from '../../../services/benefitService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../EmployeePortal.css';

const MyBenefits = () => {
  const [benefits, setBenefits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const user = JSON.parse((localStorage.getItem('user') || sessionStorage.getItem('user')) || '{}');
  const employeeId = user?.employeeId;

  useEffect(() => {
    if (employeeId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [employeeId]);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const benefitsRes = await benefitService.getEmployeeBenefits(employeeId);
      if (benefitsRes.success) setBenefits(benefitsRes.data || []);
      
    } catch (error) {
      console.error("Failed to fetch benefits:", error);
      setErrorMsg("Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeBenefitsCount = benefits.filter(b => String(b.status).toUpperCase() === 'ACTIVE').length;

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Benefits</h1>
        <p>Review the benefits you are enrolled in.</p>
      </div>
      
      <div className="my-attendance-summary-grid">
        <div className="my-attendance-summary-card total" style={{ maxWidth: '300px' }}>
          <div className="my-attendance-summary-icon"><ShieldCheck size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">ACTIVE BENEFITS</span>
            <div className="my-attendance-summary-value">{activeBenefitsCount}</div>
          </div>
        </div>
      </div>

      <div className="portal-recent-activity">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ShieldCheck size={20}/> Employee Benefits
        </h2>
        <div className="hr-attendance-table-card">
          <div className="hr-attendance-responsive-wrapper">
             <table className="hr-attendance-data-table">
                <thead>
                   <tr>
                      <th>BENEFIT NAME</th>
                      <th>TYPE</th>
                      <th>ENROLLMENT DATE</th>
                      <th>STATUS</th>
                   </tr>
                </thead>
                <tbody>
               {isLoading ? (
                 <tr>
                   <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading benefits...</td>
                 </tr>
               ) : benefits.length === 0 ? (
                 <tr>
                   <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>You are not enrolled in any benefits.</td>
                 </tr>
               ) : (
                 benefits.map((benefit) => {
                   const isActive = String(benefit.status).toUpperCase() === 'ACTIVE';
                   return (
                     <tr key={benefit.enrollmentId || benefit.benefitId}>
                        <td><strong>{benefit.benefitName}</strong></td>
                        <td>{benefit.benefitType || 'General'}</td>
                        <td>{benefit.enrollmentDate ? formatEthiopianDate(benefit.enrollmentDate) : 'N/A'}</td>
                        <td>
                           <span className={`hr-attendance-badge ${isActive ? 'hr-attendance-badge-approved' : 'hr-attendance-badge-rejected'}`}>
                              {benefit.status}
                           </span>
                        </td>
                     </tr>
                   );
                 })
               )}
             </tbody>
          </table>
         </div>
        </div>
      </div>

    </div>
  );
};

export default MyBenefits;
