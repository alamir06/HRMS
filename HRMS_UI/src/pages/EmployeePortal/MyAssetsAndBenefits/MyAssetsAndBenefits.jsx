import React, { useEffect, useState } from 'react';
import '../EmployeePortal.css';
import './MyAssetsAndBenefits.css';
import { assetService } from '../../../services/assetService';
import { formatEthiopianDate } from '../../../utils/dateTime';

const MyAssetsAndBenefits = () => {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAssets = async () => {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const authUser = storedUser ? JSON.parse(storedUser) : null;
      const employeeId = authUser?.employeeId || authUser?.id;

      if (!employeeId) {
        setError('Unable to determine current employee. Please log in again.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await assetService.getEmployeeAssets(employeeId);
        if (res?.success) {
          setAssets(res.data || []);
        } else {
          setError(res?.error || 'Failed to load your assets.');
        }
      } catch (fetchError) {
        setError(fetchError?.message || 'Failed to load your assets.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, []);

  const activeAssetCount = assets.filter((asset) => asset.status === 'ASSIGNED').length;

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Assets & Benefits</h1>
        <p>Review the assets provided to you and your enrolled benefits.</p>
      </div>
      <div className="portal-stats-grid">
        <div className="stat-card">
          <div className="stat-details">
             <h3>Active Assets</h3>
             <p className="stat-value">{isLoading ? '-' : `${activeAssetCount} Assigned`}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-details">
             <h3>Active Benefits</h3>
             <p className="stat-value">0 Enrolled</p>
          </div>
        </div>
      </div>
      <div className="portal-recent-activity">
        <h2>Detailed Inventory</h2>
        {isLoading ? (
          <div className="activity-placeholder">
            <p>Loading your assets...</p>
          </div>
        ) : error ? (
          <div className="activity-placeholder">
            <p>{error}</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="activity-placeholder">
            <p>You have no recorded assets or benefits at this time.</p>
          </div>
        ) : (
          <div className="assets-table-wrapper">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Assigned Date</th>
                  <th>Expected Return</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.assignmentId}>
                    <td>{asset.assetName || '-'}</td>
                    <td>{asset.serialNumber || '-'}</td>
                    <td>{asset.status || '-'}</td>
                    <td>{asset.assignedDate ? formatEthiopianDate(asset.assignedDate) : '-'}</td>
                    <td>{asset.expectedReturnDate ? formatEthiopianDate(asset.expectedReturnDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAssetsAndBenefits;
