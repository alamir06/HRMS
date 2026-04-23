import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, Check, XCircle, Download, FileText, X, ClipboardList, CheckCircle2, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { leaveService } from '../../../services/leaveService';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { formatEthiopianDate, formatEthiopianDateTime } from '../../../utils/dateTime';

// Ensure we import the sibling css + the generic Employees CSS for full layout styling

import './LeaveRequests.css';

const LeaveRequests = () => {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [period, setPeriod] = useState('DAILY');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef(null);

  // Modal State
  const [viewRequest, setViewRequest] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    action: null,
    request: null,
    reason: '',
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const displayEthDate = (ethValue, gregValue) => {
    if (ethValue) return ethValue;
    return formatEthiopianDate(gregValue);
  };

  // Search Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Data
  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: page,
        limit: limit,
        search: debouncedSearch,
        period: period
      };
      
      const res = await leaveService.getAllLeaveRequests(params);
      if (res.success) {
        setRequests(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
        setSummary(res.summary || { pending: 0, approved: 0, rejected: 0 });
      } else {
        toast.error("Failed to load leave requests");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, period]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target)) {
        setIsPeriodMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Action Handlers
  const handleApprove = async (id, comments) => {
    try {
      const resp = await leaveService.approveLeave(id, { comments });
      if (resp.success) {
        toast.success("Leave approved");
        loadRequests();
        setViewRequest(null);
        return true;
      } else {
        toast.error(resp.error || "Failed to approve leave");
        return false;
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Error approving leave");
      return false;
    }
  };

  const handleReject = async (id, comments) => {
    try {
      const resp = await leaveService.rejectLeave(id, { comments });
      if (resp.success) {
        toast.success("Leave rejected");
        loadRequests();
        setViewRequest(null);
        return true;
      } else {
        toast.error(resp.error || "Failed to reject leave");
        return false;
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Error rejecting leave");
      return false;
    }
  };

  const openActionModal = (request, action) => {
    setActionModal({
      isOpen: true,
      action,
      request,
      reason: '',
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      action: null,
      request: null,
      reason: '',
    });
  };

  const confirmAction = async () => {
    const reason = actionModal.reason.trim();
    if (!reason) {
      toast.error(i18n.language === 'am' ? 'እባክዎ ምክንያት ያስገቡ።' : 'Please enter a reason first.');
      return;
    }

    const requestId = actionModal.request?.id;
    if (!requestId) return;

    setIsSubmittingAction(true);
    let ok = false;
    try {
      if (actionModal.action === 'approve') {
        ok = await handleApprove(requestId, reason);
      } else {
        ok = await handleReject(requestId, reason);
      }
    } finally {
      setIsSubmittingAction(false);
    }

    if (ok) {
      closeActionModal();
    }
  };

  const handleExportPdf = () => {
    const printContent = document.getElementById('hr-leave-request-requests-table-container');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    
    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      styles += el.outerHTML;
    });

    const dateStr = formatEthiopianDateTime(new Date());

    printWindow.document.write(`
      <html>
        <head>
          <title>Leave Requests Report</title>
          ${styles}
          <style>
            body { padding: 40px; background: white; font-family: Inter, sans-serif; }
            .hr-leave-request-table-actions { display: none !important; }
            .hr-leave-request-pagination-controls, .hr-leave-request-page-limit-selector { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { border-bottom: 2px solid #cbd5e1; }
            h1 { font-family: Inter, sans-serif; color: #2d3748; margin-bottom: 10px; }
            .report-header { margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>Leave Requests Report</h1>
            <p>Generated on: ${dateStr}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const periodOptions = [
    { value: 'DAILY', label: i18n.language === 'am' ? 'ዕለታዊ' : 'Daily' },
    { value: 'WEEKLY', label: i18n.language === 'am' ? 'ሳምንታዊ' : 'Weekly' },
    { value: 'MONTHLY', label: i18n.language === 'am' ? 'ወርሃዊ' : 'Monthly' },
    { value: 'YEARLY', label: i18n.language === 'am' ? 'አመታዊ' : 'Yearly' },
  ];

  const selectedPeriodLabel = periodOptions.find((item) => item.value === period)?.label || (i18n.language === 'am' ? 'ዕለታዊ' : 'Daily');

  return (
    <div className="hr-leave-request-container">
      <div className="hr-leave-request-summary-header">
        <div className="hr-leave-request-summary-spacer" />
        <div className="hr-leave-request-period-filter-wrap" ref={periodMenuRef}>
          <button
            type="button"
            className={`hr-leave-request-period-filter-trigger ${isPeriodMenuOpen ? 'open' : ''}`}
            onClick={() => setIsPeriodMenuOpen((prev) => !prev)}
          >
            <span>{selectedPeriodLabel}</span>
            <ChevronDown size={16} className="hr-leave-request-period-filter-chevron" />
          </button>

          {isPeriodMenuOpen && (
            <div className="hr-leave-request-period-filter-menu">
              {periodOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`hr-leave-request-period-filter-option ${period === item.value ? 'active' : ''}`}
                  onClick={() => {
                    setPeriod(item.value);
                    setPage(1);
                    setIsPeriodMenuOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hr-leave-request-summary-grid">
        <div className="hr-leave-request-summary-card pending">
          <div className="hr-leave-request-summary-icon"><ClipboardList size={16} /></div>
          <div>
            <span className="hr-leave-request-summary-label">{i18n.language === 'am' ? 'ጠቅላላ በመጠባበቅ ላይ' : 'Total Pending'}</span>
            <div className="hr-leave-request-summary-value">{summary.pending}</div>
          </div>
        </div>

        <div className="hr-leave-request-summary-card approved">
          <div className="hr-leave-request-summary-icon"><CheckCircle2 size={16} /></div>
          <div>
            <span className="hr-leave-request-summary-label">{i18n.language === 'am' ? 'ጠቅላላ የጸደቁ' : 'Total Approved'}</span>
            <div className="hr-leave-request-summary-value">{summary.approved}</div>
          </div>
        </div>

        <div className="hr-leave-request-summary-card rejected">
          <div className="hr-leave-request-summary-icon"><XCircle size={16} /></div>
          <div>
            <span className="hr-leave-request-summary-label">{i18n.language === 'am' ? 'ጠቅላላ ውድቅ የተደረጉ' : 'Total Rejected'}</span>
            <div className="hr-leave-request-summary-value">{summary.rejected}</div>
          </div>
        </div>
      </div>

      <div className="hr-leave-request-top-toolbar">
        <label className="hr-leave-request-search-wrapper" htmlFor="searchLeave">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchLeave" 
            type="text" 
            placeholder={i18n.language === 'am' ? 'በስም ወይም ዓይነት ይፈልጉ...' : 'Search by employee name or leave type...'} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="hr-leave-request-export-btn" onClick={handleExportPdf}>
          <Download size={18} style={{ marginRight: '6px' }} /> 
          {i18n.language === 'am' ? 'ወደ ፒዲኤፍ ላክ' : 'Export as PDF'}
        </button>
      </div>

      <div className="hr-leave-request-table-card" id="hr-leave-request-requests-table-container">
        <div className="hr-leave-request-responsive-wrapper">
          <table className="hr-leave-request-data-table">
            <thead>
              <tr>
                <th>{i18n.language === 'am' ? 'ሰራተኛ' : 'Employee'}</th>
                <th>{i18n.language === 'am' ? 'የዕረፍት ዓይነት' : 'Leave Type'}</th>
                <th>{i18n.language === 'am' ? 'የቆይታ ጊዜ' : 'Duration'}</th>
                <th>{i18n.language === 'am' ? 'ቀናት' : 'Dates'}</th>
                <th>{i18n.language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                <th className="hr-leave-request-table-actions-header">{i18n.language === 'am' ? 'ድርጊቶች' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>
                    {i18n.language === 'am' ? 'ጥያቄዎችን በመጫን ላይ...' : 'Loading requests...'}
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>
                    {i18n.language === 'am' ? 'ምንም ጥያቄዎች አልተገኙም.' : 'No leave requests found.'}
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                   let statusClass = 'hr-leave-request-badge-pending';
                   if (req.status === 'APPROVED') statusClass = 'hr-leave-request-badge-approved';
                   else if (req.status === 'REJECTED') statusClass = 'hr-leave-request-badge-rejected';
                   
                   return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="hr-leave-request-avatar">
                           <img 
                              src={req.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((req.firstName || "") + ' ' + (req.lastName || ""))}&background=0B8255&color=fff`} 
                              alt="avatar" 
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((req.firstName || "") + ' ' + (req.lastName || ""))}&background=0B8255&color=fff` }}
                           />
                        </div>
                        <div className="hr-leave-request-col-primary-text">
                           {req.firstName} {req.lastName}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="hr-leave-request-type-badge">
                        {req.leaveType ? req.leaveType.replace(/_/g, ' ') : 'N/A'}
                      </span>
                    </td>
                    <td>{req.totalDays} {req.totalDays === 1 ? 'Day' : 'Days'}</td>
                    <td>
                      {displayEthDate(req.startDateEth, req.startDate)} - {displayEthDate(req.endDateEth, req.endDate)}
                    </td>
                    <td>
                      <span className={`hr-leave-request-badge ${statusClass}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <div className="hr-leave-request-table-actions">
                        <button className="hr-leave-request-action-btn-light" onClick={() => setViewRequest(req)} title={i18n.language === 'am' ? 'ዝርዝሮችን ይመልከቱ' : "View Details"}>
                          <Eye size={14} />
                        </button>
                        {req.status === 'PENDING' && (
                          <>
                            <button className="hr-leave-request-action-btn-light hr-leave-request-action-btn-success" onClick={() => openActionModal(req, 'approve')} title={i18n.language === 'am' ? 'አጽድቅ' : "Approve"}>
                              <Check size={14} />
                            </button>
                            <button className="hr-leave-request-action-btn-light hr-leave-request-action-btn-danger" onClick={() => openActionModal(req, 'reject')} title={i18n.language === 'am' ? 'ውድቅ አድርግ' : "Reject"}>
                              <XCircle size={14} />
                            </button>
                          </>
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

        <div className="hr-leave-request-table-footer">
          <div className="hr-leave-request-page-limit-selector">
            <span>{i18n.language === 'am' ? 'አሳይ' : 'Show'}</span>
            <select className="hr-leave-request-limit-dropdown" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>{i18n.language === 'am' ? 'ገፆች' : 'entries'}</span>
          </div>

          <div className="hr-leave-request-pagination-controls">
            <span>
              {i18n.language === 'am' 
                 ? `ከ ${(page - 1) * limit + 1} እስከ ${Math.min(page * limit, pagination.total)} ከ ${pagination.total} ይታያል`
                 : `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, pagination.total)} of ${pagination.total}`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="hr-leave-request-page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button>
               <button className="hr-leave-request-page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {viewRequest && (
        <div className="hr-leave-request-modal-overlay" onClick={() => setViewRequest(null)}>
           <div className="hr-leave-request-modal" onClick={e => e.stopPropagation()}>
              <div className="hr-leave-request-modal-header">
                 <h2>{i18n.language === 'am' ? 'የእረፍት ጥያቄ ዝርዝሮች' : 'Leave Request Details'}</h2>
                 <button className="hr-leave-request-modal-close" onClick={() => setViewRequest(null)}>
                    <X size={20} />
                 </button>
              </div>
              
              <div className="hr-leave-request-modal-body">
                 <div className="hr-leave-request-detail-grid">
                    <div className="hr-leave-request-detail-item">
                       <label>{i18n.language === 'am' ? 'የሰራተኛ ስም' : 'Employee Name'}</label>
                       <p>{viewRequest.firstName} {viewRequest.lastName}</p>
                    </div>
                    <div className="hr-leave-request-detail-item">
                       <label>{i18n.language === 'am' ? 'የዕረፍት ዓይነት' : 'Leave Type'}</label>
                       <p>{viewRequest.leaveType ? viewRequest.leaveType.replace(/_/g, ' ') : 'N/A'}</p>
                    </div>
                    <div className="hr-leave-request-detail-item">
                       <label>{i18n.language === 'am' ? 'ቀናት' : 'Dates'}</label>
                       <p>
                          {displayEthDate(viewRequest.startDateEth, viewRequest.startDate)} to {displayEthDate(viewRequest.endDateEth, viewRequest.endDate)}
                       </p>
                    </div>
                    <div className="hr-leave-request-detail-item">
                       <label>{i18n.language === 'am' ? 'ሁኔታ' : 'Status'}</label>
                       <p>
                          <span className={`hr-leave-request-badge ${viewRequest.status === 'APPROVED' ? 'hr-leave-request-badge-approved' : viewRequest.status === 'REJECTED' ? 'hr-leave-request-badge-rejected' : 'hr-leave-request-badge-pending'}`}>
                             {viewRequest.status}
                          </span>
                       </p>
                    </div>
                      <div className="hr-leave-request-detail-item">
                        <label>{i18n.language === 'am' ? 'የተጠየቀበት ጊዜ' : 'Requested At'}</label>
                        <p>{formatEthiopianDateTime(viewRequest.createdAt) || 'N/A'}</p>
                      </div>
                      {viewRequest.approvedAt && (
                       <div className="hr-leave-request-detail-item">
                         <label>{i18n.language === 'am' ? 'የጸደቀበት ጊዜ' : 'Approved At'}</label>
                         <p>{formatEthiopianDateTime(viewRequest.approvedAt) || 'N/A'}</p>
                       </div>
                      )}
                 </div>

                 <div className="hr-leave-request-detail-item" style={{ marginBottom: '0.5rem' }}>
                    <label>{i18n.language === 'am' ? 'ምክንያት' : 'Reason'}</label>
                 </div>
                 <div className="hr-leave-request-detail-reason">
                    <p>{viewRequest.reason || viewRequest.reasonAmharic || 'No reason provided.'}</p>
                 </div>

                 {viewRequest.supportDocument && (
                    <div className="hr-leave-request-detail-document">
                       <div className="hr-leave-request-detail-item" style={{ marginBottom: '12px' }}>
                          <label>{i18n.language === 'am' ? 'ደጋፊ ሰነድ' : 'Supporting Document'}</label>
                       </div>
                       <div 
                          className="hr-leave-request-doc-card" 
                          onClick={() => setPreviewDoc(viewRequest.supportDocument.startsWith('http') ? viewRequest.supportDocument : `http://localhost:5000/${viewRequest.supportDocument.replace(/^\//, '')}`)}
                       >
                          <div className="hr-leave-request-doc-card-icon">
                             <FileText size={24} />
                          </div>
                          <div className="hr-leave-request-doc-card-info">
                             <span className="hr-leave-request-doc-title">{i18n.language === 'am' ? 'አባሪ ሰነድ' : 'Attached Document'}</span>
                             <span className="hr-leave-request-doc-action">{i18n.language === 'am' ? 'ለማየት ጠቅ ያድርጉ' : 'Click to preview'}</span>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
              
              <div className="hr-leave-request-modal-footer">
                 <button 
                    style={{ padding: '8px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                    onClick={() => setViewRequest(null)}
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Full-screen Document Preview Modal */}
      {previewDoc && (
        <div className="hr-leave-request-doc-preview-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="hr-leave-request-doc-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-leave-request-doc-preview-header">
              <h3>{i18n.language === 'am' ? 'የሰነድ ቅድመ እይታ' : 'Document Preview'}</h3>
              <button className="hr-leave-request-modal-close" onClick={() => setPreviewDoc(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="hr-leave-request-doc-preview-body">
              {previewDoc.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                <img src={previewDoc} alt="Document Preview" />
              ) : (
                <iframe src={previewDoc} title="Document Preview"></iframe>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={actionModal.isOpen}
        title={
          actionModal.action === 'approve'
            ? (i18n.language === 'am' ? 'የማጽደቅ ማረጋገጫ' : 'Confirm Approval')
            : (i18n.language === 'am' ? 'የመቀበል ማረጋገጫ' : 'Confirm Rejection')
        }
        content={
          <div className="hr-leave-request-action-modal-content">
            <p className="hr-leave-request-action-modal-message">
              {actionModal.action === 'approve'
                ? (i18n.language === 'am'
                    ? `የ ${actionModal.request?.firstName || ''} ${actionModal.request?.lastName || ''} የእረፍት ጥያቄን ማጽደቅ እርግጠኛ ነዎት?`
                    : `Are you sure you want to approve the leave request for ${actionModal.request?.firstName || ''} ${actionModal.request?.lastName || ''}?`)
                : (i18n.language === 'am'
                    ? `የ ${actionModal.request?.firstName || ''} ${actionModal.request?.lastName || ''} የእረፍት ጥያቄን መቀበል እርግጠኛ ነዎት?`
                    : `Are you sure you want to reject the leave request for ${actionModal.request?.firstName || ''} ${actionModal.request?.lastName || ''}?`)}
            </p>

            <label className="hr-leave-request-action-modal-label" htmlFor="leaveActionReason">
              {i18n.language === 'am' ? 'ምክንያት' : 'Reason'} <span className="req">*</span>
            </label>
            <textarea
              id="leaveActionReason"
              className="hr-leave-request-action-modal-input"
              value={actionModal.reason}
              onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={
                actionModal.action === 'approve'
                  ? (i18n.language === 'am' ? 'የማጽደቅ ምክንያት ያስገቡ...' : 'Enter approval reason...')
                  : (i18n.language === 'am' ? 'የመቀበል ምክንያት ያስገቡ...' : 'Enter rejection reason...')
              }
              rows={4}
            />
          </div>
        }
        confirmText={actionModal.action === 'approve' ? (i18n.language === 'am' ? 'አጽድቅ' : 'Approve') : (i18n.language === 'am' ? 'ውድቅ አድርግ' : 'Reject')}
        cancelText={i18n.language === 'am' ? 'ሰርዝ' : 'Cancel'}
        isDestructive={actionModal.action === 'reject'}
        confirmDisabled={!actionModal.reason.trim()}
        onConfirm={confirmAction}
        onCancel={closeActionModal}
        isSubmitting={isSubmittingAction}
      />

    </div>
  );
};

export default LeaveRequests;
