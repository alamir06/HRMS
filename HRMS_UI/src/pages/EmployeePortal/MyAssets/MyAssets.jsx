import React, { useState, useEffect } from 'react';
import { Package, Box } from 'lucide-react';
import { assetService } from '../../../services/assetService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../EmployeePortal.css';

const MyAssets = () => {
  const [assets, setAssets] = useState([]);
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
      const assetsRes = await assetService.getEmployeeAssets(employeeId);
      if (assetsRes.success) setAssets(assetsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      setErrorMsg("Failed to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeAssetsCount = assets.filter(a => String(a.status).toUpperCase() === 'ASSIGNED').length;

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Assets</h1>
        <p>Review the assets provided to you by the company.</p>
      </div>
      
      <div className="my-attendance-summary-grid">
        <div className="my-attendance-summary-card approved" style={{ maxWidth: '300px' }}>
          <div className="my-attendance-summary-icon"><Package size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">ACTIVE ASSETS</span>
            <div className="my-attendance-summary-value">{activeAssetsCount}</div>
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
    </div>
  );
};

export default MyAssets;
