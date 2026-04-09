import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Eye, Edit2, XCircle, Info, Umbrella, BriefcaseMedical, Heart, ChevronLeft, ChevronRight, UserCircle, Grid, Calendar as CalendarIcon, AlignLeft, X, CloudUpload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { leaveService } from '../../../services/leaveService';
import { toast } from 'react-toastify';
import '../EmployeePortal.css';
import './MyLeaves.css';

const MyLeaves = () => {
  const { t } = useTranslation();
  const [leaveData, setLeaveData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // New Request Form State
  const [newRequest, setNewRequest] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
    supportDocument: null 
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchMyLeaves();
  }, []);

  const fetchMyLeaves = async () => {
    try {
      setIsLoading(true);
      const currentYear = new Date().getFullYear();
      const res = await leaveService.getMyLeaves({ year: currentYear });
      if (res.success) {
        setLeaveData(res.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to fetch leave data");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!newRequest.startDate || !newRequest.endDate) return 0;
    const start = new Date(newRequest.startDate);
    const end = new Date(newRequest.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const handleApplyLeave = async () => {
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      let payload;
      if (newRequest.supportDocument) {
        payload = new FormData();
        payload.append("leaveType", newRequest.leaveType);
        payload.append("startDate", newRequest.startDate);
        payload.append("endDate", newRequest.endDate);
        payload.append("reason", newRequest.reason);
        payload.append("employeeId", user.employeeId);
        payload.append("supportDocument", newRequest.supportDocument);
      } else {
        payload = {
          leaveType: newRequest.leaveType,
          startDate: newRequest.startDate,
          endDate: newRequest.endDate,
          reason: newRequest.reason,
          employeeId: user.employeeId
        };
      }

      const res = await leaveService.requestLeave(payload);
      if (res.success) {
        toast.success("Leave request submitted successfully");
        setIsFormOpen(false);
        setNewRequest({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '', supportDocument: null });
        fetchMyLeaves(); 
      }
    } catch (error) {
      const msgs = error?.response?.data?.details || error?.response?.data?.error || "Failed to request leave";
      toast.error(typeof msgs === 'string' ? msgs : "Validation Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLeaveCardStyle = (type) => {
    const tStr = type.toLowerCase();
    if (tStr.includes('annual')) return { color: '#059669', Icon: Umbrella, subtitle: 'Accruing at 2.0 days/month' };
    if (tStr.includes('medical') || tStr.includes('sick')) return { color: '#14b8a6', Icon: BriefcaseMedical, subtitle: 'Full balance available until Dec' };
    if (tStr.includes('personal')) return { color: '#dc2626', Icon: Heart, subtitle: 'Use by Q4 Performance Review' };
    if (tStr.includes('organization')) return { color: '#fb923c', Icon: BriefcaseMedical, subtitle: 'HR managed assignment' };
    if (tStr.includes('maternity') || tStr.includes('paternity')) return { color: '#7c3aed', Icon: Heart, subtitle: 'Pre/Post natal leave allowance' };
    return { color: '#6b7280', Icon: Info, subtitle: 'Standard allocation' };
  };

  // Compute pagination
  const allRequests = leaveData?.requests || [];
  const totalRequests = allRequests.length;
  const totalPages = Math.ceil(totalRequests / limit) || 1;
  const paginatedRequests = allRequests.slice((page - 1) * limit, page * limit);

  // Dynamic header computation
  const headerTitle = newRequest.leaveType 
    ? `Create ${newRequest.leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} Request`
    : 'Create Request';

  return (
    <div className="leave-ledger-container">
      <div className="leave-ledger-header">
        <div className="leave-title-sec">
          <h1>Leave Overview</h1>
          <p>Manage your professional time off and track your ledger balances.</p>
        </div>
        <div className="leave-action-sec">
          <button className="leave-btn-new-request" onClick={() => setIsFormOpen(true)}>
            <Plus size={18} strokeWidth={2.5} /> New Request
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading leave data...</div>
      ) : (
        <>
          <div className="leave-cards-grid">
            {leaveData?.balances?.map(balance => {
              const { color, Icon, subtitle } = getLeaveCardStyle(balance.leaveType);
              const percent = balance.totalAllocatedDays > 0 
                ? (balance.remainingDays / balance.totalAllocatedDays) * 100 
                : 0;

              return (
                <div key={balance.id} className="leave-card">
                  <div className="leave-card-watermark"><Icon size={56} opacity={0.15} strokeWidth={1} /></div>
                  <div className="leave-card-header">
                    <span className="leave-card-title" style={{ color }}>{balance.leaveType.replace('_', ' ')}</span>
                  </div>
                  <div className="leave-card-body">
                    <span className="leave-card-remaining" style={{ color }}>{String(balance.remainingDays).padStart(2, '0')}</span>
                    <span className="leave-card-total">/ {String(balance.totalAllocatedDays).padStart(2, '0')} days</span>
                  </div>
                  <div className="leave-progress-track">
                    <div className="leave-progress-fill" style={{ width: `${percent}%`, backgroundColor: color }}></div>
                  </div>
                  <div className="leave-card-footer-note">{subtitle}</div>
                </div>
              );
            })}
          </div>

          <div className="leave-transactions-section">
            <div className="leave-trans-header-row">
              <h2 className="leave-trans-title">Recent Transactions</h2>
              <div className="leave-trans-actions">
                <button className="leave-btn-secondary"><Filter size={14} /> Filter</button>
                <button className="leave-btn-secondary"><Download size={14} /> Export</button>
              </div>
            </div>

            <div className="leave-table-card">
              <div className="leave-table-responsive-wrapper">
                <table className="leave-modern-data-table">
                  <thead>
                    <tr>
                      <th><div className="leave-th-content">Date Range</div></th>
                      <th><div className="leave-th-content">Leave Type</div></th>
                      <th><div className="leave-th-content">Duration</div></th>
                      <th><div className="leave-th-content">Status</div></th>
                      <th><div className="leave-th-content">Actions</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                          You have no recent transactions on record.
                        </td>
                      </tr>
                    ) : (
                      paginatedRequests.map(req => {
                        const { color } = getLeaveCardStyle(req.leaveType);
                        let statusClass = 'leave-pill-pending';
                        let statusLabel = 'Pending Review';
                        if (req.status === 'APPROVED') { statusClass = 'leave-pill-approved'; statusLabel = 'Approved'; }
                        else if (req.status === 'REJECTED') { statusClass = 'leave-pill-declined'; statusLabel = 'Declined'; }

                        const sDate = new Date(req.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const eDate = new Date(req.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                        return (
                          <tr key={req.id}>
                            <td>{sDate} – {eDate}</td>
                            <td>
                              <div className="leave-type-indicator">
                                <span className="leave-dot" style={{ backgroundColor: color }}></span>
                                {req.leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                              </div>
                            </td>
                            <td>{req.requestedDays} {req.requestedDays === 1 ? 'Day' : 'Days'}</td>
                            <td><span className={statusClass}>{statusLabel}</span></td>
                            <td>
                              <div className="leave-table-actions">
                                {req.status === 'PENDING' ? (
                                  <>
                                    <button className="leave-action-btn-light" title="Edit">
                                      <Edit2 size={14} />
                                    </button>
                                    <button className="leave-action-btn-light leave-action-btn-danger" title="Cancel">
                                      <XCircle size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <button className="leave-action-btn-light" title="Details">
                                    {req.status === 'REJECTED' ? <Info size={14} /> : <Eye size={14} />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="leave-table-footer">
                <div className="leave-page-limit-selector">
                  <span>Show</span>
                  <select
                    className="leave-limit-dropdown"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="leave-pagination-controls">
                  <span>
                    Showing {totalRequests === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalRequests)} of {totalRequests}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="leave-page-btn"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className="leave-page-btn"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL VIEW */}
      {isFormOpen && (
        <div className="leave-modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="leave-modal-container" onClick={e => e.stopPropagation()}>
            
            <div className="leave-req-header-row">
              <div className="leave-req-title-col">
                <h1>{headerTitle}</h1>
                <p>Please fill in the formal request details below. All fields marked with an asterisk are required for processing.</p>
              </div>
              <button className="leave-req-return-btn" onClick={() => setIsFormOpen(false)} title="Close Modal">
                <X size={16} />
              </button>
            </div>

            {/* Employee Info */}
            <div className="leave-req-card">
              <div className="leave-req-section-title">
                <UserCircle size={16} color="#059669" /> Employee Information
              </div>
              <div className="leave-req-info-grid">
                <div className="leave-info-item">
                  <label>Full Name</label>
                  <span>{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="leave-info-item">
                  <label>Employee Code</label>
                  <span>{user?.employeeCode || 'N/A'}</span>
                </div>
                <div className="leave-info-item">
                  <label>Department</label>
                  <span>{user?.department || 'Faculty of Humanities'}</span>
                </div>
                <div className="leave-info-item">
                  <label>Position</label>
                  <span>{user?.position || 'Senior Lecturer'}</span>
                </div>
              </div>
            </div>

            {/* Leave Type Selection dynamically mapped from balance records */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="leave-req-section-title">
                <Grid size={16} color="#059669" /> Leave Type Selection
              </div>
              <div className="leave-type-grid">
                {leaveData?.balances && leaveData.balances.length > 0 ? leaveData.balances.map(balance => {
                  const { color, Icon, subtitle } = getLeaveCardStyle(balance.leaveType);
                  const typeId = balance.leaveType;
                  const typeTitle = balance.leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

                  return (
                    <div 
                      key={balance.id} 
                      className={`leave-type-box ${newRequest.leaveType === typeId ? 'selected' : ''}`}
                      onClick={() => setNewRequest({...newRequest, leaveType: typeId})}
                    >
                      <div className="leave-type-icon" style={{ backgroundColor: `${color}15`, color: color }}>
                        <Icon size={16} />
                      </div>
                      <h4>{typeTitle}</h4>
                      <p>{subtitle}</p>
                    </div>
                  );
                }) : (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>No leave balances available for selection.</div>
                )}
              </div>
            </div>

            {/* Schedule & Duration */}
            <div className="leave-schedule-wrapper">
              <div className="leave-schedule-card">
                <div className="leave-req-section-title">
                  <CalendarIcon size={16} color="#059669" /> Schedule
                </div>
                <div className="leave-form-inputs">
                  <div className="leave-input-group">
                    <label>Start Date *</label>
                    <input 
                      type="date" 
                      value={newRequest.startDate} 
                      onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} 
                    />
                  </div>
                  <div className="leave-input-group">
                    <label>End Date *</label>
                    <input 
                      type="date" 
                      value={newRequest.endDate} 
                      onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="leave-duration-card">
                <div className="leave-duration-label">Calculated Duration</div>
                <div className="leave-duration-val">
                  {calculateDuration()} <span>Days</span>
                </div>
                <div className="leave-duration-note">
                  Excludes Weekends & Holidays
                </div>
              </div>
            </div>

            {/* Reasons & Remarks */}
            <div className="leave-req-card">
              <div className="leave-req-section-title">
                <AlignLeft size={16} color="#059669" /> Reasons & Remarks
              </div>
              <textarea 
                className="leave-textarea"
                placeholder="State the reason for your leave request in detail..."
                value={newRequest.reason}
                onChange={e => setNewRequest({...newRequest, reason: e.target.value})}
              ></textarea>
            </div>

            {/* Supporting Documents */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div className="leave-upload-instructions">
                <div className="leave-req-section-title" style={{marginBottom: '0.3rem'}}>Supporting Documents</div>
                <p>Optional: Upload relevant certificates or medical reports. (JPG, PNG - Max 5MB)</p>
              </div>
              <div className="leave-upload-box">
                <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e5e7eb', marginBottom: '0.75rem' }}>
                   <CloudUpload size={18} color="#059669" />
                </div>
                <h4 style={{ fontSize: '0.75rem', color: '#111827', marginBottom: '0.2rem' }}>
                  {newRequest.supportDocument ? newRequest.supportDocument.name : 'Click to upload or drop file'}
                </h4>
                <p style={{ fontSize: '0.6rem', color: '#9ca3af' }}>Academic, medical or legal documentation</p>
                <input 
                  type="file" 
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                  onClick={(e) => { e.target.value = null }}
                  onChange={(e) => {
                     if (e.target.files.length > 0) {
                        setNewRequest({...newRequest, supportDocument: e.target.files[0] });
                     }
                  }} 
                />
              </div>
            </div>

            {/* Footer */}
            <div className="leave-form-footer">
              <button className="leave-draft-btn" onClick={() => setIsFormOpen(false)}>Cancel Request</button>
              <button className="leave-submit-btn" onClick={handleApplyLeave} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MyLeaves;
