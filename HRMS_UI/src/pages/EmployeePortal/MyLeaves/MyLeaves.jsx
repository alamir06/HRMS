import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Eye, Edit2, XCircle, Info, Umbrella, BriefcaseMedical, Heart, ChevronLeft, ChevronRight, UserCircle, Grid, Calendar as CalendarIcon, AlignLeft, X, CloudUpload, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { leaveService } from '../../../services/leaveService';
import { toast } from 'react-toastify';
import EthiopianDateInput from '../../../components/common/EthiopianDateInput';
import injLogo from '../../../assets/inj-logo.jpg';
import stampImg from '../../../assets/stamp.svg';
import { formatEthiopianDate, formatEthiopianDateTime } from '../../../utils/dateTime';
import '../EmployeePortal.css';
import './MyLeaves.css';

const MyLeaves = () => {
  const { t, i18n } = useTranslation();
  const [leaveData, setLeaveData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewedRequest, setViewedRequest] = useState(null);
  const [supportDocPreviewUrl, setSupportDocPreviewUrl] = useState(null);

// New Request Form State
  const [newRequest, setNewRequest] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
    supportDocument: null 
  });

  // Calculate generic keys for documents
  const isAcademic = !!user?.collegeName;
  let jobProcessDisplay = user?.position || '';
  if (isAcademic && user?.role === 'EMPLOYEE') {
    jobProcessDisplay = 'Lecturer';
  } else if (!isAcademic) {
    jobProcessDisplay = user?.department ? user.department + ' Manager' : 'Manager';
  }
  const caseTeamDisplay = user?.department || 'N/A';

  const displayEthDate = (ethValue, gregValue) => {
    if (ethValue) return ethValue;
    return formatEthiopianDate(gregValue);
  };

  const clearSupportDocument = (event) => {
    event.stopPropagation();
    setNewRequest((prev) => ({ ...prev, supportDocument: null }));
    setSupportDocPreviewUrl(null);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchMyLeaves();
  }, []);

  useEffect(() => {
    if (!newRequest.supportDocument || !newRequest.supportDocument.type?.startsWith('image/')) {
      setSupportDocPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(newRequest.supportDocument);
    setSupportDocPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [newRequest.supportDocument]);

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
    if (!newRequest.startDate || (!newRequest.endDate && newRequest.leaveType !== 'ORGANIZATION_LEAVE') || !newRequest.reason) {
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
        payload.append("endDate", newRequest.leaveType === 'ORGANIZATION_LEAVE' ? newRequest.startDate : newRequest.endDate);
        payload.append("reason", newRequest.reason);
        payload.append("employeeId", user.employeeId);
        payload.append("supportDocument", newRequest.supportDocument);
      } else {
        payload = {
          leaveType: newRequest.leaveType,
          startDate: newRequest.startDate,
          endDate: newRequest.leaveType === 'ORGANIZATION_LEAVE' ? newRequest.startDate : newRequest.endDate,
          reason: newRequest.reason,
          employeeId: user.employeeId
        };
      }

      const res = await leaveService.requestLeave(payload);
      if (res.success) {
        toast.success("Leave request submitted successfully");
        setIsFormOpen(false);
        setNewRequest({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '', supportDocument: null });
        setSupportDocPreviewUrl(null);
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

  // Computed Viewed Balance
  const viewedBalance = viewedRequest 
    ? leaveData?.balances?.find(b => b.leaveType === viewedRequest.leaveType)
    : null;

  // Dynamic header computation
  const headerTitle = newRequest.leaveType 
    ? `Create ${newRequest.leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} Request`
    : 'Create Request';

  return (
    <div className="my-leave-request-ledger-container">
      <div className="my-leave-request-ledger-header">
        <div className="my-leave-request-title-sec">
          <h1>Leave Overview</h1>
          <p>Manage your professional time off and track your ledger balances.</p>
        </div>
        <div className="my-leave-request-action-sec">
          <button className="my-leave-request-btn-new-request" onClick={() => setIsFormOpen(true)}>
            <Plus size={18} strokeWidth={2.5} /> New Request
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading leave data...</div>
      ) : (
        <>
          <div className="my-leave-request-cards-grid">
            {leaveData?.balances?.map(balance => {
              const { color, Icon, subtitle } = getLeaveCardStyle(balance.leaveType);
              const percent = balance.totalAllocatedDays > 0 
                ? (balance.remainingDays / balance.totalAllocatedDays) * 100 
                : 0;

              return (
                <div key={balance.id} className="my-leave-request-card">
                  <div className="my-leave-request-card-watermark"><Icon size={56} opacity={0.15} strokeWidth={1} /></div>
                  <div className="my-leave-request-card-header">
                    <span className="my-leave-request-card-title" style={{ color }}>{balance.leaveType.replace('_', ' ')}</span>
                  </div>
                  <div className="my-leave-request-card-body">
                    <span className="my-leave-request-card-remaining" style={{ color }}>{String(balance.remainingDays).padStart(2, '0')}</span>
                    <span className="my-leave-request-card-total">/ {String(balance.totalAllocatedDays).padStart(2, '0')} days</span>
                  </div>
                  <div className="my-leave-request-progress-track">
                    <div className="my-leave-request-progress-fill" style={{ width: `${percent}%`, backgroundColor: color }}></div>
                  </div>
                  <div className="my-leave-request-card-footer-note">{subtitle}</div>
                </div>
              );
            })}
          </div>

          <div className="my-leave-request-transactions-section">
            <div className="my-leave-request-trans-header-row">
              <h2 className="my-leave-request-trans-title">Recent Transactions</h2>
              <div className="my-leave-request-trans-actions">
                <button className="my-leave-request-btn-secondary"><Filter size={14} /> Filter</button>
                <button className="my-leave-request-btn-secondary"><Download size={14} /> Export</button>
              </div>
            </div>

            <div className="my-leave-request-table-card">
              <div className="my-leave-request-table-responsive-wrapper">
                <table className="my-leave-request-modern-data-table">
                  <thead>
                    <tr>
                      <th><div className="my-leave-request-th-content">Date Range</div></th>
                      <th><div className="my-leave-request-th-content">Leave Type</div></th>
                      <th><div className="my-leave-request-th-content">Duration</div></th>
                      <th><div className="my-leave-request-th-content">Status</div></th>
                      <th><div className="my-leave-request-th-content">Actions</div></th>
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
                        let statusClass = 'my-leave-request-pill-pending';
                        let statusLabel = 'Pending Review';
                        if (req.status === 'APPROVED') { statusClass = 'my-leave-request-pill-approved'; statusLabel = 'Approved'; }
                        else if (req.status === 'REJECTED') { statusClass = 'my-leave-request-pill-declined'; statusLabel = 'Declined'; }

                        const sDate = displayEthDate(req.startDateEth, req.startDate);
                        const eDate = displayEthDate(req.endDateEth, req.endDate);

                        return (
                          <tr key={req.id}>
                            <td>{sDate} – {eDate}</td>
                            <td>
                              <div className="my-leave-request-type-indicator">
                                <span className="my-leave-request-dot" style={{ backgroundColor: color }}></span>
                                {req.leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                              </div>
                            </td>
                            <td>{req.requestedDays} {req.requestedDays === 1 ? 'Day' : 'Days'}</td>
                            <td><span className={statusClass}>{statusLabel}</span></td>
                            <td>
                              <div className="my-leave-request-table-actions">
                                {req.status === 'PENDING' ? (
                                  <>
                                    <button className="my-leave-request-action-btn-light" title="Edit">
                                      <Edit2 size={14} />
                                    </button>
                                    <button className="my-leave-request-action-btn-light my-leave-request-action-btn-danger" title="Cancel">
                                      <XCircle size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <button className="my-leave-request-action-btn-light" title="Details" onClick={() => { if (req.status === 'APPROVED') setViewedRequest(req); }}>
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

              <div className="my-leave-request-table-footer">
                <div className="my-leave-request-page-limit-selector">
                  <span>Show</span>
                  <select
                    className="my-leave-request-limit-dropdown"
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

                <div className="my-leave-request-pagination-controls">
                  <span>
                    Showing {totalRequests === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalRequests)} of {totalRequests}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="my-leave-request-page-btn"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className="my-leave-request-page-btn"
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
        <div className="my-leave-request-modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="my-leave-request-modal-container" onClick={e => e.stopPropagation()}>
            
            <div className="my-leave-request-req-header-row">
              <div className="my-leave-request-req-title-col">
                <h1>{headerTitle}</h1>
                <p>Please fill in the formal request details below. All fields marked with an asterisk are required for processing.</p>
              </div>
              <button className="my-leave-request-req-return-btn" onClick={() => setIsFormOpen(false)} title="Close Modal">
                <X size={16} />
              </button>
            </div>

            {/* Employee Info */}
            <div className="my-leave-request-req-card">
              <div className="my-leave-request-req-section-title">
                <UserCircle size={16} color="#059669" /> Employee Information
              </div>
              <div className="my-leave-request-req-info-grid">
                <div className="my-leave-request-info-item">
                  <label>Full Name</label>
                  <span>{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="my-leave-request-info-item">
                  <label>Employee Code</label>
                  <span>{user?.employeeCode || 'N/A'}</span>
                </div>
                <div className="my-leave-request-info-item">
                  <label>Department</label>
                  <span>{user?.department || 'Faculty of Humanities'}</span>
                </div>
                <div className="my-leave-request-info-item">
                  <label>Position</label>
                  <span>{user?.position || 'Senior Lecturer'}</span>
                </div>
              </div>
            </div>

            {/* Leave Type Selection dynamically mapped from balance records */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="my-leave-request-req-section-title">
                <Grid size={16} color="#059669" /> Leave Type Selection
              </div>
              <div className="my-leave-request-type-grid">
                {leaveData?.balances && leaveData.balances.length > 0 ? leaveData.balances.map(balance => {
                  const { color, Icon, subtitle } = getLeaveCardStyle(balance.leaveType);
                  const typeId = balance.leaveType;
                  const typeTitle = balance.leaveType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

                  return (
                    <div 
                      key={balance.id} 
                      className={`my-leave-request-type-box ${newRequest.leaveType === typeId ? 'selected' : ''}`}
                      onClick={() => setNewRequest({...newRequest, leaveType: typeId})}
                    >
                      <div className="my-leave-request-type-icon" style={{ backgroundColor: `${color}15`, color: color }}>
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
            <div className="my-leave-request-schedule-wrapper">
              <div className="my-leave-request-schedule-card" style={newRequest.leaveType === 'ORGANIZATION_LEAVE' ? { flex: 1 } : {}}>
                <div className="my-leave-request-req-section-title">
                  <CalendarIcon size={16} color="#059669" /> Schedule
                </div>
                <div className="my-leave-request-form-inputs">
                  <div className="my-leave-request-input-group">
                    <label>{newRequest.leaveType === 'ORGANIZATION_LEAVE' ? 'Effective Date *' : 'Start Date *'}</label>
                    <EthiopianDateInput
                      value={newRequest.startDate}
                      onChange={(gregDate) => setNewRequest({ ...newRequest, startDate: gregDate })}
                      language={i18n.language}
                      required
                    />
                  </div>
                  {newRequest.leaveType !== 'ORGANIZATION_LEAVE' && (
                    <div className="my-leave-request-input-group">
                      <label>End Date *</label>
                      <EthiopianDateInput
                        value={newRequest.endDate}
                        onChange={(gregDate) => setNewRequest({ ...newRequest, endDate: gregDate })}
                        language={i18n.language}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {newRequest.leaveType !== 'ORGANIZATION_LEAVE' && (
                <div className="my-leave-request-duration-card">
                  <div className="my-leave-request-duration-label">Calculated Duration</div>
                  <div className="my-leave-request-duration-val">
                    {calculateDuration()} <span>Days</span>
                  </div>
                  <div className="my-leave-request-duration-note">
                    Excludes Weekends & Holidays
                  </div>
                </div>
              )}
            </div>

            {/* Reasons & Remarks */}
            <div className="my-leave-request-req-card">
              <div className="my-leave-request-req-section-title">
                <AlignLeft size={16} color="#059669" /> Reasons & Remarks
              </div>
              <textarea 
                className="my-leave-request-textarea"
                placeholder="State the reason for your leave request in detail..."
                value={newRequest.reason}
                onChange={e => setNewRequest({...newRequest, reason: e.target.value})}
              ></textarea>
            </div>

            {/* Supporting Documents */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div className="my-leave-request-upload-instructions">
                <div className="my-leave-request-req-section-title" style={{marginBottom: '0.3rem'}}>Supporting Documents</div>
                <p>Optional: Upload relevant certificates or medical reports. (JPG, PNG - Max 5MB)</p>
              </div>
              <div className={`my-leave-request-upload-box ${supportDocPreviewUrl ? 'has-image-preview' : ''}`}>
                {supportDocPreviewUrl ? (
                  <img src={supportDocPreviewUrl} alt="Selected support document" className="my-leave-request-upload-preview-image" />
                ) : (
                  <>
                    <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e5e7eb', marginBottom: '0.75rem' }}>
                       <CloudUpload size={18} color="#059669" />
                    </div>
                    <h4 style={{ fontSize: '0.75rem', color: '#111827', marginBottom: '0.2rem' }}>
                      {newRequest.supportDocument ? newRequest.supportDocument.name : 'Click to upload or drop file'}
                    </h4>
                    <p style={{ fontSize: '0.6rem', color: '#9ca3af' }}>Academic, medical or legal documentation</p>
                  </>
                )}

                {newRequest.supportDocument && (
                  <>
                    <button
                      type="button"
                      className="my-leave-request-upload-remove-btn"
                      onClick={clearSupportDocument}
                      title="Remove selected file"
                    >
                      <X size={14} />
                    </button>
                    <div className="my-leave-request-upload-preview-meta">
                      <span>{newRequest.supportDocument.name}</span>
                    </div>
                  </>
                )}

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
            <div className="my-leave-request-form-footer">
              <button className="my-leave-request-draft-btn" onClick={() => setIsFormOpen(false)}>Cancel Request</button>
              <button className="my-leave-request-submit-btn" onClick={handleApplyLeave} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DOCUMENT VIEW MODAL */}
      {viewedRequest && (
        <div className="my-leave-request-modal-overlay" onClick={() => setViewedRequest(null)}>
          <div className="my-leave-request-modal-container" style={{maxWidth: '800px'}} onClick={e => e.stopPropagation()}>
            <div className="my-leave-request-req-header-row" style={{borderBottom: 'none', paddingBottom: 0}}>
              <button style={{marginLeft: 'auto'}} className="my-leave-request-req-return-btn" onClick={() => setViewedRequest(null)}>
                <X size={16} />
              </button>
              <button style={{marginLeft: '10px', backgroundColor: '#004488', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}} onClick={() => {
                const printContent = document.getElementById('print-area').innerHTML;
                const originalContent = document.body.innerHTML;
                document.body.innerHTML = printContent;
                window.print();
                document.body.innerHTML = originalContent;
                window.location.reload(); 
              }}>
                <Printer size={16} /> Print
              </button>
            </div>
            
            <div id="print-area" style={{padding: '30px', fontFamily: 'Arial, sans-serif', color: '#111', lineHeight: '1.5', fontSize: '13px', background: '#fff', border: '1px solid #ddd', maxWidth: '800px', margin: '0 auto'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #000', padding: '10px', marginBottom: '20px'}}>
                  <div style={{flex: 1, fontWeight: 'bold', fontSize: '12px'}}>
                    <div style={{marginBottom: '3px'}}>በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ</div>
                    <div style={{marginBottom: '3px'}}>የትምህርት ሚኒስቴር</div>
                    <div style={{marginBottom: '3px'}}>የእንጅባራ ዩኒቨርሲቲ</div>
                    <div>የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</div>
                  </div>
                  <div style={{flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '12px'}}>
                    <div style={{marginBottom: '3px'}}>እንጅባራ ዩኒቨርሲቲ</div>
                    <div style={{marginBottom: '3px'}}>INJIBARA UNIVERSITY</div>
                    <div style={{textAlign: 'center', margin: '5px 0'}}>
                       <img src={injLogo} alt="Injibara University Logo" style={{maxWidth: '80px', height: 'auto'}} onError={(e) => e.target.style.display='none'} />
                    </div>
                    <div style={{border: '1px solid #000', padding: '4px 10px', display: 'inline-block', fontFamily: 'serif', borderRadius: '15px', fontSize: '14px', fontStyle: 'italic'}}>Leave form</div>
                  </div>
                  <div style={{flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: '12px'}}>
                    <div style={{marginBottom: '3px'}}>The Federal Democratic Republic of Ethiopia</div>
                    <div style={{marginBottom: '3px'}}>Ministry of Education</div>
                    <div style={{marginBottom: '3px'}}>Injibara University</div>
                    <div>Competency & Human Resource Management Executive</div>
                  </div>
                </div>

                {viewedRequest.leaveType === 'ORGANIZATION_LEAVE' ? (
                  <>
                    <div style={{textAlign: 'right', fontWeight: 'bold'}}>
                      ቀን: {formatEthiopianDate(new Date())}
                    </div>
                    <div style={{textAlign: 'center', fontSize: '20px', fontWeight: 'bold', margin: '30px 0', textDecoration: 'underline'}}>የመለቀቂያ ቅፅ</div>
                    
                    <div style={{marginBottom: '20px', lineHeight: '1.8'}}>
                      <strong>ለአቶ/ወይዘሮ/ዶ/ር: <u>{user?.firstName} {user?.lastName}</u></strong><br/>
                      <strong>እንጅባራ ዩኒቨርሲቲ!</strong>
                    </div>

                    <div style={{marginTop: '20px', marginBottom: '20px'}}>
                      <strong>ጉዳዩ:- <u>የሥራ መልቀቂያ ማረጋገጫ ስለመስጠት</u></strong>
                    </div>

                    <p style={{textIndent: '40px', marginTop: '20px', textAlign: 'justify'}}>
                       በእንጅባራ ዩኒቨርሲቲ በ <strong>{user?.collegeName || '_______________'}</strong> ኮሌጅ ስር በሚገኘው የ <strong>{user?.department || '_______________'}</strong> ት/ክፍል ወስጥ በ <strong>{user?.position || '_______________'}</strong> የሥራ መደብ ላይ በ <strong>{user?.salary || '_______________'}</strong> ደመወዝ ተቀጥረው ሲያገለግሉ የነበረ ሲሆን እስከ <strong>{displayEthDate(viewedRequest.startDateEth, viewedRequest.startDate)}</strong> ድረስ በማገልገል በገዛ ፈቃዳቸው የለቀቁ ስለሆነ የሥራ መልቀቂያ ማረጋገጫ ተሰጥቷቸዋል።
                    </p>
                    
                    <ol style={{lineHeight: 2.2, marginTop: '20px'}}>
                      <li>የሠራተኛው ስም: <strong>{user?.firstName} {user?.lastName}</strong></li>
                      <li>የመታወቂያ ቁጥር: <strong>{user?.employeeCode || '_______________'}</strong></li>
                      <li>የቅጥር ሁኔታ: <strong>Full Time</strong></li>
                      <li>የስራ ክፍል: <strong>{user?.department || '_______________'}</strong></li>
                      <li>የስራ መደቡ: <strong>{user?.position || '_______________'}</strong></li>
                      <li>የወርሃዊ ደመወዝ: <strong>{user?.salary ? user.salary + ' ETB' : '_______________'}</strong></li>
                      <li>የተቀጠሩበት ቀን: <strong>{user?.hireDate ? formatEthiopianDate(user.hireDate) : '_______________'}</strong></li>
                      <li>ለመጨረሻ ጊዜ የተከፈለዎ የወርሃዊ ደመወዝ እስከ: <strong>{displayEthDate(viewedRequest.startDateEth, viewedRequest.startDate)}</strong></li>
                      <li>ምክንያት: <strong>{viewedRequest.reason || 'በገዛ ፈቃዳቸው (Resignation)'}</strong></li>
                    </ol>

                    <p style={{marginTop: '20px'}}>የዩኒቨርሲቲውን ንብረት አስረክበው እና ከእዳ ነፃ መሆናቸውን አረጋግጠናል።</p>

                    <div style={{textAlign: 'center', fontWeight: 'bold', marginTop: '40px', fontSize: '18px'}}>ከሠላምታ ጋር</div>
                    <div style={{textAlign: 'center', marginTop: '10px'}}>
                      <img src={stampImg} alt="HR Stamp" style={{maxWidth: '150px', opacity: 0.8}} onError={(e) => e.target.style.display='none'} />
                    </div>

                    <div style={{marginTop: '40px', fontSize: '14px'}}>
                      <p><strong><u>ግልባጭ (CC):</u></strong></p>
                      <ul style={{listStyleType: 'none', paddingLeft: '20px', lineHeight: 1.8}}>
                        <li>ለፕሬዚዳንት ጽ/ቤት</li>
                        <li>ለአካዳሚክ ጉዳዮች ም/ፕሬዚዳንት</li>
                        <li>ለአስተዳደር እና ልማት ም/ፕሬዚዳንት</li>
                        <li>ለብቃትና የሰው ሀብት አስተዳደር ሥራ ክፍል</li>
                        <li>ለ <strong>{user?.collegeName || '_______________'}</strong> ኮሌጅ / <strong>{user?.department || '_______________'}</strong> ት/ክፍል</li>
                        <li>እንጅባራ ዩኒቨርሲቲ</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px'}}>
                      <div style={{flex: 1}}>
                        <div style={{marginBottom: '10px'}}>
                          <strong>ለአቶ/ወ/ሮ/ወ/ሪት:</strong> <u>{user?.firstName} {user?.lastName}</u> &nbsp;&nbsp;&nbsp;&nbsp;
                          <strong>የመታወቂያ ቁጥር:</strong> <u>{user?.employeeCode || '____________'}</u>
                        </div>
                        <div style={{fontWeight: 'bold', marginTop: '20px'}}>
                          <u style={{fontSize: '16px'}}>እንጅባራ ዩኒቨርሲቲ//</u>
                        </div>
                      </div>
                      <div style={{textAlign: 'right', flex: '0 0 200px'}}>
                         <div style={{marginBottom: '10px'}}><strong>ቁጥር:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
                         <div><strong>ቀን:</strong> <u>{formatEthiopianDate(new Date())}</u></div>
                      </div>
                    </div>

                    <div style={{textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '30px 0', textDecoration: 'underline'}}>
                      የሠራተኞች ፈቃድ መጠየቂያ ፎርም
                    </div>
                    
                    <ol style={{lineHeight: 2.2, fontSize: '14px', marginBottom: '20px', paddingLeft: '20px'}}>
                      <li style={{marginBottom: '10px'}}> 
                        <strong>የሚሰሩበት የስራ ሂደት:</strong> <span style={{marginRight: '20px'}}><u>{jobProcessDisplay}</u></span>
                        <strong>ኬዝ/ቲም ቡድን:</strong> <span><u>{caseTeamDisplay}</u></span>
                      </li>
                      <li style={{marginBottom: '15px'}}> 
                        <strong>ፈቃድ የተሰጠበት ምክንያት:</strong>
                        <div style={{marginTop: '5px', padding: '10px', border: '1px dashed #777', background: '#fafafa', borderRadius: '4px', display: 'block', maxWidth: '100%', wordWrap: 'break-word', overflowWrap: 'break-word'}}>
                          {viewedRequest.reason || 'N/A'}
                        </div>
                      </li>
                      <li style={{marginBottom: '10px'}}> 
                        <strong>የጠየቁት ፈቃድ አይነት:</strong> <u>{viewedRequest.leaveType.replace('_', ' ')}</u>
                      </li>
                      <li style={{marginBottom: '10px'}}>
                        <strong>ፈቃድ የተጠየቀበት ጊዜ፡</strong> ከ <u>{displayEthDate(viewedRequest.startDateEth, viewedRequest.startDate)}</u> እስከ <u>{displayEthDate(viewedRequest.endDateEth, viewedRequest.endDate)}</u> 
                        የ <u>{viewedRequest.requestedDays || viewedRequest.totalDays || 0}</u> የስራ ቀናት እንዲፈቀድልኝ እጠይቃለሁ:: <br/>
                        <div style={{marginLeft: '20px', marginTop: '5px'}}>
                          <strong>ፊርማ:</strong> <u>(Electronic Request)</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                          <strong>ቀን:</strong> <u>{formatEthiopianDateTime(viewedRequest.createdAt)}</u>
                        </div>
                      </li>
                      <li style={{marginBottom: '10px'}}> 
                        <strong>ፈቃድ ይዘው የሚሄዱበት ቦታ:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                        <strong>ስ.ቁጥር:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
                      </li>
                      <li style={{marginBottom: '10px'}}> 
                        <strong>የፈቃድ ጠያቂው የቅርብ ሀላፊ አስተያየት:</strong> <u>{viewedRequest.comments || 'System Approved'}</u><br/>
                        <div style={{marginLeft: '20px', marginTop: '5px'}}>
                          <strong>ስም:</strong> <u>HR Manager</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                          <strong>ፊርማ:</strong> <u>(Approved)</u> &nbsp;&nbsp;&nbsp;&nbsp; 
                          <strong>ቀን:</strong> <u>{formatEthiopianDateTime(viewedRequest.approvedAt || new Date())}</u>
                        </div>
                      </li>
                    </ol>

                    <div style={{fontWeight: 'bold', marginBottom: '10px', marginTop: '30px', fontSize: '14px', textDecoration: 'underline'}}>በሰው ሀብት ልማት የሚሞላ</div>
                    <div style={{marginLeft: '20px', lineHeight: 2.0, fontSize: '14px'}}>
                      <strong>7. የእስካሁን የአመት ፈቃድ:</strong><br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; የ2015 ዓ/ም: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; የ2016 ዓ/ም: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; የ2017 ዓ/ም: <u>&nbsp;&nbsp;&nbsp;&nbsp;{viewedBalance ? viewedBalance.totalAllocatedDays : ''}&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>የተፈቀደ:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;{viewedRequest.requestedDays || viewedRequest.totalDays || 0}&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀናት<br/>
                    </div>
                    
                    <div style={{marginTop: '20px', lineHeight: 2.0, fontSize: '14px', textAlign: 'justify'}}>
                      <strong>ቀሪ ፈቃድ:</strong> <u>&nbsp;&nbsp;&nbsp;&nbsp;{viewedBalance ? viewedBalance.remainingDays : ''}&nbsp;&nbsp;&nbsp;&nbsp;</u> ቀን ያለዎት ሲሆን 
                      ከ <u>{displayEthDate(viewedRequest.startDateEth, viewedRequest.startDate)}</u> ጀምሮ 
                      እስከ <u>{displayEthDate(viewedRequest.endDateEth, viewedRequest.endDate)}</u> ድረስ 
                      <u>{viewedRequest.requestedDays || viewedRequest.totalDays || 0}</u> የስራ ቀናት ፈቃድ የተሰጠዎት መሆኑን አውቀዉ 
                      ከ <u>{displayEthDate(viewedRequest.endDateEth, viewedRequest.endDate)}</u> ጀምሮ በመደበኛ ስራ ቦታዎ ላይ እንዲገኙ እናሳስባለን::
                    </div>

                    <div style={{textAlign: 'right', fontWeight: 'bold', fontSize: '16px', marginTop: '30px'}}>
                      "ከሰላምታ ጋር"
                    </div>

                    <div style={{textAlign: 'center', marginTop: '10px'}}>
                      <img src={stampImg} alt="HR Stamp" style={{maxWidth: '150px', opacity: 0.8}} onError={(e) => e.target.style.display='none'} />
                    </div>

                    <div style={{marginTop: '30px', fontSize: '14px'}}>
                      <div style={{fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline'}}>ግልባጭ//</div>
                      <ul style={{listStyleType: 'none', paddingLeft: '20px', lineHeight: 2.0, fontWeight: 'bold', marginTop: '10px'}}>
                        <li>➢ ለብቃትና የሰው ሀብት አስተዳደር ሥራ ክፍል</li>
                        <li>➢ <span style={{borderBottom: '1px dashed black', display: 'inline-block', textAlign: 'left', width: '300px'}}>{user?.department ? 'ለ ' + user.department + ' ት/ክፍል' : ''}</span></li>
                        <li>➢ ለብቃትና የሰው ሀብት ልማት ቡድን</li>
                        <li style={{marginLeft: '25px', textDecoration: 'underline', marginTop: '10px'}}>እንጅባራ ዩኒቨርሲቲ//</li>
                      </ul>
                      <div style={{marginTop: '20px', textDecoration: 'underline'}}>
                        <strong>ማሳሰቢያ:-</strong> ፈቃድዎን አንድ ቀን ቀድመው ማሳወቂያ ይጠበቅብዎታል:: በእጅጉን ጊዜ ተሰርቶ ይላካል::
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyLeaves;
