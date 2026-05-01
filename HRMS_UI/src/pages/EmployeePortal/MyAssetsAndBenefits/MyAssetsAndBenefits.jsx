import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, Box, CalendarDays } from 'lucide-react';
import { assetService } from '../../../services/assetService';
import { benefitService } from '../../../services/benefitService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../EmployeePortal.css';
import './MyAssetsAndBenefits.css';

const MyAssetsAndBenefits = () => {
  const [assets, setAssets] = useState([]);
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
      const [assetsRes, benefitsRes] = await Promise.all([
        assetService.getEmployeeAssets(employeeId),
        benefitService.getEmployeeBenefits(employeeId)
      ]);

      if (assetsRes.success) setAssets(assetsRes.data || []);
      if (benefitsRes.success) setBenefits(benefitsRes.data || []);
      
    } catch (error) {
      console.error("Failed to fetch assets and benefits:", error);
      setErrorMsg("Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeAssetsCount = assets.filter(a => String(a.status).toUpperCase() === 'ASSIGNED').length;
  const activeBenefitsCount = benefits.filter(b => String(b.status).toUpperCase() === 'ACTIVE').length;

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Assets & Benefits</h1>
        <p>Review the assets provided to you and your enrolled benefits.</p>
      </div>
      
      <div className="my-attendance-summary-grid">
        <div className="my-attendance-summary-card approved">
          <div className="my-attendance-summary-icon"><Package size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">ACTIVE ASSETS</span>
            <div className="my-attendance-summary-value">{activeAssetsCount}</div>
          </div>
        </div>
        <div className="my-attendance-summary-card total">
          <div className="my-attendance-summary-icon"><ShieldCheck size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">ACTIVE BENEFITS</span>
            <div className="my-attendance-summary-value">{activeBenefitsCount}</div>
          </div>
        </div>
      </div>

      <div className="portal-recent-activity">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Box size={20}/> Company Assets
        </h2>
        <div className="hr-attendance-table-card">
          <div className="hr-attendance-responsive-wrapper">
             <table className="hr-attendance-data-table">
                <thead>
                   <tr>
                      <th>ASSET NAME</th>
                      <th>SERIAL NUMBER</th>
                      <th>ASSIGNED DATE</th>
                      <th>STATUS</th>
                   </tr>
                </thead>
                <tbody>
               {isLoading ? (
                 <tr>
                   <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading assets...</td>
                 </tr>
               ) : assets.length === 0 ? (
                 <tr>
                   <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No company assets assigned to you.</td>
                 </tr>
               ) : (
                 assets.map((asset) => {
                   const isAssigned = String(asset.status).toUpperCase() === 'ASSIGNED';
                   return (
                     <tr key={asset.assignmentId}>
                        <td><strong>{asset.assetName}</strong></td>
                        <td>{asset.serialNumber || 'N/A'}</td>
                        <td>{asset.assignedDate ? formatEthiopianDate(asset.assignedDate) : 'N/A'}</td>
                        <td>
                           <span className={`hr-attendance-badge ${isAssigned ? 'hr-attendance-badge-approved' : 'hr-attendance-badge-rejected'}`}>
                              {asset.status}
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

      <div className="portal-recent-activity" style={{ marginTop: '30px' }}>
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

export default MyAssetsAndBenefits;
