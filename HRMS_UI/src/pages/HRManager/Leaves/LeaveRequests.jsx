import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { leaveService } from '../../../services/leaveService';
import { toast } from 'react-toastify';
import { ArrowRight, ChevronLeft, ChevronRight, Check, X, Eye, RefreshCw, Search, Download } from 'lucide-react';
import './LeaveRequests.css';

const LeaveRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDispersed, setIsDispersed] = useState(false);
  const [storyModal, setStoryModal] = useState({ isOpen: false, imageUrl: null, name: null });
  const [storyTimer, setStoryTimer] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await leaveService.getAllLeaveRequests({
        limit: 100
      });
      if (response.success) {
        setRequests(response.data);
      } else {
        toast.error(response.error || "Failed to fetch requests");
      }
    } catch (error) {
      toast.error("Error fetching requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      const resp = await leaveService.approveLeave(id, { comments: "Approved by HR" });
      if (resp.success) {
        toast.success("Leave approved");
        fetchRequests();
      } else {
        toast.error(resp.error || "Failed to approve");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Error approving");
    }
  };

  const handleReject = async (id) => {
    try {
      const resp = await leaveService.rejectLeave(id, { comments: "Rejected by HR" });
      if (resp.success) {
        toast.success("Leave rejected");
        fetchRequests();
      } else {
        toast.error(resp.error || "Failed to reject");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Error rejecting");
    }
  };

  const openStory = (imageUrl, name) => {
    if (storyTimer) clearTimeout(storyTimer);
    setStoryModal({
      isOpen: true,
      imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`,
      name: name
    });
    
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      closeStory();
    }, 5000);
    setStoryTimer(timer);
  };

  const closeStory = () => {
    if (storyTimer) clearTimeout(storyTimer);
    setStoryModal({ isOpen: false, imageUrl: null, name: null });
  };

  const displayedRequests = requests.filter(req => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    const fullName = `${req.firstName || ''} ${req.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(lower) ||
      (req.leaveType || '').toLowerCase().includes(lower) ||
      (req.status || '').toLowerCase().includes(lower) ||
      (req.department_id || '').toLowerCase().includes(lower)
    );
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDateShort = (dateString) => {
    const d = new Date(dateString);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  const getLeaveTypeClass = (type) => {
    if (!type) return 'type-other';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('annual')) return 'type-annual';
    if (lowerType.includes('sick') || lowerType.includes('medical')) return 'type-medical';
    if (lowerType.includes('compensatory')) return 'type-compensatory';
    return 'type-other';
  };

  const handleExportPdf = () => {
    const printContent = document.getElementById('leave-requests-table-container');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    
    // Get all stylesheets from parent
    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      styles += el.outerHTML;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Leave Requests Report</title>
          ${styles}
          <style>
            body { padding: 20px; background: white; }
            .th-actions, .hr-leave-reqeust-actions-col { display: none !important; }
            .pagination-controls, .page-btn { display: none !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; }
            h1 { font-family: Inter, sans-serif; color: #2d3748; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Leave Requests Report</h1>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Allow time for styles to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="employees-container" style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div className="employees-top-toolbar">
        <label className="search-wrapper-emp" htmlFor="searchLeave">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchLeave" 
            type="text" 
            placeholder="Search by name, type, or status..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <button className="btn-add-employee" onClick={handleExportPdf}>
          <Download size={18} /> Export as PDF
        </button>
      </div>

      <div id="leave-requests-table-container">
        <div className="employees-table-card">
          <div className="table-responsive-wrapper">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th><div className="th-content">STAFF NAME</div></th>
                <th><div className="th-content">LEAVE TYPE</div></th>
                <th><div className="th-content">DATE RANGE</div></th>
                <th><div className="th-content">STATUS</div></th>
                <th className="th-actions"><div className="th-content" style={{justifyContent: 'flex-end'}}>ACTIONS</div></th>
              </tr>
            </thead>
            <tbody>
              {displayedRequests.length > 0 ? displayedRequests.map(req => {
                let statusBg = '#fffff0', statusColor = '#b7791f', statusDot = '#ecc94b';
                if (req.status === 'APPROVED') { statusBg = '#e6fffa'; statusColor = '#047481'; statusDot = '#38b2ac'; }
                else if (req.status === 'REJECTED') { statusBg = '#fff5f5'; statusColor = '#c53030'; statusDot = '#e53e3e'; }

                return (
                <tr key={req.id}>
                  <td>
                    <div className="hr-leave-reqeust-staff-col">
                      <div className="hr-leave-reqeust-avatar-initials" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {getInitials(req.firstName, req.lastName)}
                      </div>
                      <div className="hr-leave-reqeust-staff-info">
                        <span className="hr-leave-reqeust-staff-name" style={{ fontSize: '0.85rem' }}>{req.firstName} {req.lastName}</span>
                        <span className="hr-leave-reqeust-staff-role" style={{ fontSize: '0.75rem' }}>{req.department_id || 'Employee'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`hr-leave-reqeust-type-pill ${getLeaveTypeClass(req.leaveType)}`} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>
                      {req.leaveType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="hr-leave-reqeust-date-col" style={{ fontSize: '0.8rem' }}>
                      <span>{formatDateShort(req.startDate)} </span>
                      <ArrowRight size={10} className="hr-leave-reqeust-date-arrow" />
                      <span>{formatDateShort(req.endDate)}</span>
                      <span className="hr-leave-reqeust-days-count" style={{ fontSize: '0.75rem' }}>({req.totalDays} Day{req.totalDays > 1 ? 's' : ''})</span>
                    </div>
                  </td>
                  <td>
                    <div className="hr-leave-reqeust-status-col" style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusDot, marginRight: '6px' }}></div>
                      <span style={{ fontSize: '0.7rem' }}>{req.status || 'PENDING'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="hr-leave-reqeust-actions-col">
                      <button className="hr-leave-reqeust-btn-outline" onClick={() => setSelectedRequest(req)} title="View Details" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                        View Details
                      </button>
                      {req.status === 'PENDING' && (
                        <>
                          <button className="hr-leave-reqeust-btn-ghost" onClick={() => handleReject(req.id)} style={{ color: '#e53e3e', fontSize: '0.75rem' }}>
                            Reject
                          </button>
                          <button className="hr-leave-reqeust-btn-solid" onClick={() => handleApprove(req.id)} style={{ fontSize: '0.75rem', padding: '4px 14px' }}>
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}) : (
                <tr>
                  <td colSpan="5" className="hr-leave-reqeust-empty-state" style={{ fontSize: '0.85rem' }}>No leave requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <div className="table-footer">
            <span style={{ fontSize: '0.8rem', color: '#718096' }}>Showing {displayedRequests.length} requests</span>
            <div className="pagination-controls" style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="page-btn" disabled><ChevronLeft size={16} /></button>
              <button className="page-btn" disabled><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Story-style Modal */}
      {storyModal.isOpen && (
        <div className="story-modal-overlay" onClick={closeStory}>
          <button className="story-close-btn" onClick={closeStory}>
            <X size={24} />
          </button>
          <div className="story-modal-content" onClick={e => e.stopPropagation()}>
            <div className="story-progress-bar">
              <div className="story-progress-fill"></div>
            </div>
            <div className="story-user-header">
              <img src={storyModal.imageUrl} alt="Avatar" className="story-small-avatar" />
              <span>{storyModal.name}</span>
            </div>
            <img src={storyModal.imageUrl} alt="Full View" className="story-main-image" />
          </div>
        </div>
      )}
      {/* View Details Modal */}
      {selectedRequest && (
        <div className="leave-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="leave-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', backgroundColor: '#fff', borderRadius: '12px', padding: '24px' }}>
            <div className="leave-req-header-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Leave Request Details</h2>
                <p style={{ fontSize: '0.85rem', color: '#718096' }}>Submission ID: {selectedRequest.id}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: '700' }}>Employee</span>
                <p style={{ fontWeight: '600', color: '#2d3748', margin: '4px 0' }}>{selectedRequest.firstName} {selectedRequest.lastName}</p>
              </div>
              <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: '700' }}>Leave Type</span>
                <p style={{ fontWeight: '600', color: '#2d3748', margin: '4px 0' }}>{selectedRequest.leaveType.replace(/_/g, ' ')}</p>
              </div>
              <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: '700' }}>Dates</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2d3748', marginTop: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                  <span>{new Date(selectedRequest.startDate).toLocaleDateString()}</span>
                  <ArrowRight size={12} color="#a0aec0" />
                  <span>{new Date(selectedRequest.endDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: '700' }}>Status</span>
                <p style={{ fontWeight: '700', margin: '4px 0', color: selectedRequest.status === 'APPROVED' ? '#0B8255' : selectedRequest.status === 'REJECTED' ? '#e53e3e' : '#d69e2e' }}>
                  {selectedRequest.status}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: '700' }}>Reason for Leave</span>
              <p style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px', color: '#4a5568', fontSize: '0.9rem', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                {selectedRequest.reason || 'No reason provided.'}
              </p>
            </div>

            {selectedRequest.documentPath && (
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: '700' }}>Supporting Document</span>
                <div style={{ marginTop: '8px' }}>
                  <a href={selectedRequest.documentPath.startsWith('http') ? selectedRequest.documentPath : `http://localhost:5000/${selectedRequest.documentPath.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'underline', fontSize: '0.9rem' }}>
                    View Attached Document
                  </a>
                </div>
              </div>
            )}

            {selectedRequest.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                 <button onClick={() => { handleReject(selectedRequest.id); setSelectedRequest(null); }} style={{ padding: '8px 24px', borderRadius: '8px', border: '1px solid #fc8181', backgroundColor: '#fff5f5', color: '#c53030', fontWeight: '600', cursor: 'pointer' }}>
                   Reject Request
                 </button>
                 <button onClick={() => { handleApprove(selectedRequest.id); setSelectedRequest(null); }} style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#0B8255', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
                   Approve Request
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
