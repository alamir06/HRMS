import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { recommendationService } from '../../../services/recommendationService';
import { 
  FileText, CheckCircle, XCircle, Clock, Eye, 
  Search, Filter, X, ChevronLeft, ChevronRight, GraduationCap, Stethoscope, Building, FileBadge, Check 
} from 'lucide-react';
import '../Leaves/LeaveRequests.css';
import ConfirmModal from '../../../components/common/ConfirmModal';
import injLogo from '../../../assets/inj-logo.jpg';

const REC_TYPES = [
  { id: 'EDUCATION', icon: <GraduationCap size={20} />, labelEn: 'Education' },
  { id: 'PROFESSIONAL_LICENSE', icon: <Stethoscope size={20} />, labelEn: 'Professional License' },
  { id: 'MAYOR_OFFICE', icon: <Building size={20} />, labelEn: 'Mayor Office' },
  { id: 'MINISTRY_OF_EDUCATION', icon: <Building size={20} />, labelEn: 'Ministry of Education' },
  { id: 'WORK_EXPERIENCE', icon: <FileBadge size={20} />, labelEn: 'Work Experience' }
];

const Recommendations = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Action Modal State (for table buttons)
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    action: null,
    request: null,
    reason: '',
  });

  const getPaperContent = (req) => {
    if (!req) return { title: '', content: '' };
    const fullName = `${req.firstName || ''} ${req.lastName || ''}`.trim();
    const departmentName = req.departmentName || '__________';
    const hireDate = req.hireDate ? new Date(req.hireDate).getFullYear() : '__________';

    switch (req.recommendationType) {
      case 'EDUCATION':
        return {
          title: 'የምስክር ወረቀት እንዲሰጠኝ ስለመጠየቅ',
          content: `ጉዳዩ የትምህርት ማስረጃን ለማምጣት ስለመፈለግ ማስረጃ እንዲሰጠኝ፤ <br/><br/>
            እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${fullName}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${departmentName}</strong> ክፍል ሰራተኛ ስሆን፣ 
            በ <strong>${req.institutionName || '_________________'}</strong> ገብቼ የ <strong>${req.degreeProgram || '_________________'}</strong> ትምህርቴን 
            ለመከታተል እንድችል ይህ የሥራ ልምድ እና የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።`
        };
      case 'PROFESSIONAL_LICENSE':
        return {
          title: 'ማስረጃ እንዲሰጠኝ ስለመጠየቅ',
          content: `ጉዳዩ፡- ለሙያ ፈቃድ ለማውጣት ማስረጃ እንዲሰጠኝ፤ <br/><br/>
            እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${fullName}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${departmentName}</strong> ክፍል ውስጥ 
            ከ <strong>${hireDate}</strong> ዓ.ም ጀምሮ በመስራት ላይ እገኛለሁ። ከጤና ሚኒስቴር / ከሚመለከተው የሙያ ፈቃድ ሰጪ አካል 
            የሙያ ፈቃዴን ለማውጣት / ለማሳደስ ስለምፈልግ ይህ የምስክር ወረቀት እንዲሰጠኝ እጠይቃለሁ።`
        };
      case 'MAYOR_OFFICE':
        return {
          title: 'ማስረጃ እንዲሰጠኝ ስለመጠየቅ',
          content: `ጉዳዩ፡- ለእንግዲህ ከተማ አስተዳደር ከንቲባ ጽ/ቤት ማስረጃ እንዲሰጠኝ፤ <br/><br/>
            እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${fullName}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${departmentName}</strong> ክፍል ሰራተኛ ስሆን፣ 
            ከ <strong>${hireDate}</strong> ዓ.ም ጀምሮ እያገለገልኩ እገኛለሁ። ለእንግዲህ ከተማ አስተዳደር ከንቲባ ጽ/ቤት 
            የምሰራበትን ሁኔታ የሚገልጽ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።`
        };
      case 'MINISTRY_OF_EDUCATION':
        return {
          title: 'ማስረጃ እንዲሰጠኝ ስለመጠየቅ',
          content: `ጉዳዩ፡- ለትምህርት ሚኒስቴር ማስረጃ እንዲሰጠኝ፤ <br/><br/>
            እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${fullName}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${departmentName}</strong> ክፍል ሰራተኛ ስሆን፣ 
            ለትምህርት ሚኒስቴር ጉዳይ ለማስፈፀም እንዲረዳኝ ይህ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።`
        };
      case 'WORK_EXPERIENCE':
      default:
        return {
          title: 'የሥራ ልምድ ማስረጃ እንዲሰጠኝ ስለመጠየቅ',
          content: `ጉዳዩ፡- የሥራ ልምድ ማስረጃ እንዲሰጠኝ፤ <br/><br/>
            እኔ አቶ/ወ/ሮ/ወ/ሪት/ዶ/ር <strong>${fullName}</strong> በእንጅባራ ዩኒቨርሲቲ የ <strong>${departmentName}</strong> ክፍል ሰራተኛ ስሆን፣ 
            ከ <strong>${hireDate}</strong> ዓ.ም ጀምሮ እስከ አሁን ድረስ በተለያዩ የሥራ መደቦች ላይ እያገለገልኩ እገኛለሁ። 
            ስለሆነም ይህንኑ የሥራ ልምዴን የሚገልጽ ህጋዊ የምስክር ወረቀት እንዲሰጠኝ ስል አመለክታለሁ።`
        };
    }
  };

  const handleDownloadPdf = () => {
    const printContent = document.getElementById('recommendation-paper-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>Recommendation Letter - ${selectedReq?.firstName} ${selectedReq?.lastName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#fff;">
          ${printContent.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await recommendationService.getAllRequests({
        page: currentPage,
        limit: 10,
        search,
        status: statusFilter,
        type: typeFilter
      });
      setRequests(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to load recommendation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, search, statusFilter, typeFilter]);

  const handleStatusUpdate = async (status, reqId, reasonStr = '') => {
    if (status === 'REJECTED' && !reasonStr.trim()) {
      toast.error('Please provide a rejection reason');
      return false;
    }

    setIsSubmitting(true);
    try {
      await recommendationService.updateStatus(reqId, status, reasonStr);
      toast.success(`Recommendation ${status.toLowerCase()} successfully`);
      setSelectedReq(null);
      setRejectionReason('');
      fetchRequests();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request');
      return false;
    } finally {
      setIsSubmitting(false);
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
    const success = await handleStatusUpdate(
      actionModal.action === 'approve' ? 'APPROVED' : 'REJECTED',
      actionModal.request.id,
      actionModal.reason
    );
    if (success) {
      closeActionModal();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="recommendations-badge approved"><CheckCircle size={12} /> Approved</span>;
      case 'REJECTED':
        return <span className="recommendations-badge rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="recommendations-badge pending"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <div className="hr-leave-request-container">
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem 0' }}>Recommendations</h1>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>Review and manage employee recommendation letters</p>
      </div>

      {/* Filters */}
      <div className="hr-leave-request-top-toolbar">
        <label className="hr-leave-request-search-wrapper" htmlFor="searchRec">
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="searchRec"
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        
        <div style={{ display: 'flex', gap: '0.5rem', flex: '0 0 auto' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="hr-leave-request-period-filter-trigger"
            style={{ minWidth: '160px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">All Types</option>
            {REC_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.labelEn}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="hr-leave-request-period-filter-trigger"
            style={{ minWidth: '140px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="hr-leave-request-table-card">
        <div className="hr-leave-request-responsive-wrapper">
          <table className="hr-leave-request-data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>No requests found.</td></tr>
              ) : (
                requests.map((req) => {
                  const typeInfo = REC_TYPES.find(t => t.id === req.recommendationType) || REC_TYPES[4];
                  let statusClass = 'hr-leave-request-badge-pending';
                  if (req.status === 'APPROVED') statusClass = 'hr-leave-request-badge-approved';
                  else if (req.status === 'REJECTED') statusClass = 'hr-leave-request-badge-rejected';

                  return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="hr-leave-request-avatar">
                            <img 
                              src={req.profilePicture ? `http://localhost:5000${req.profilePicture}` : `https://ui-avatars.com/api/?name=${encodeURIComponent((req.firstName || "") + ' ' + (req.lastName || ""))}&background=0B8255&color=fff`} 
                              alt="Profile"
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((req.firstName || "") + ' ' + (req.lastName || ""))}&background=0B8255&color=fff` }}
                            />
                          </div>
                          <div className="hr-leave-request-col-primary-text">
                            {req.firstName} {req.lastName}
                          </div>
                        </div>
                      </td>
                      <td>{req.departmentName}</td>
                      <td>
                        <span className="hr-leave-request-type-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}>
                          <span style={{ display: 'inline-flex', color: '#059669' }}>{typeInfo.icon}</span>
                          {typeInfo.labelEn}
                        </span>
                      </td>
                      <td>
                        {new Date(req.requestDate).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`hr-leave-request-badge ${statusClass}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <div className="hr-leave-request-table-actions" style={{ justifyContent: 'flex-start' }}>
                          <button
                            onClick={() => setSelectedReq(req)}
                            className="hr-leave-request-action-btn-light"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {req.status === 'PENDING' && (
                            <>
                              <button 
                                className="hr-leave-request-action-btn-light hr-leave-request-action-btn-success" 
                                onClick={() => openActionModal(req, 'approve')} 
                                title="Approve"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                className="hr-leave-request-action-btn-light hr-leave-request-action-btn-danger" 
                                onClick={() => openActionModal(req, 'reject')} 
                                title="Reject"
                              >
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
        {/* Pagination */}
        <div className="hr-leave-request-table-footer">
          <div className="hr-leave-request-page-limit-selector">
            <span>Show</span>
            <select className="hr-leave-request-limit-dropdown" disabled>
              <option value="10">10</option>
            </select>
            <span>entries</span>
          </div>

          <div className="hr-leave-request-pagination-controls">
            <span>Page {currentPage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="hr-leave-request-page-btn"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="hr-leave-request-page-btn"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReq && (
        <div className="hr-leave-request-modal-overlay" onClick={() => setSelectedReq(null)}>
          <div className="hr-leave-request-modal" onClick={e => e.stopPropagation()}>
            <div className="hr-leave-request-modal-header">
              <h2>Recommendation Request Details</h2>
              <button 
                onClick={() => setSelectedReq(null)}
                className="hr-leave-request-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="hr-leave-request-modal-body" style={{ background: '#f3f4f6', padding: '20px' }}>
               <div id="recommendation-paper-preview" style={{ 
                 maxWidth: '800px', 
                 margin: '0 auto', 
                 padding: '40px', 
                 background: '#fff', 
                 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                 borderRadius: '8px', 
                 fontFamily: "'Arial', sans-serif", 
                 color: '#111', 
                 lineHeight: '1.6', 
                 fontSize: '14px' 
               }}>
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ marginBottom: '10px' }}><img src={injLogo} alt="Logo" style={{ maxWidth: '100px', height: 'auto' }} /></div>
                    <h2 style={{ margin: '5px 0', fontSize: '22px' }}>እንጅባራ ዩኒቨርሲቲ</h2>
                    <h3 style={{ margin: '5px 0', fontSize: '18px' }}>INJIBARA UNIVERSITY</h3>
                    <h4 style={{ margin: '5px 0', fontSize: '16px' }}>የብቃትና የሰው ሀብት አስተዳደር ሥራ አስፈፃሚ</h4>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                    <div>ቁጥር፡ <u> {selectedReq.id.slice(0,8).toUpperCase()} </u></div>
                    <div>ቀን፡ <u> {new Date().toLocaleDateString('am-ET')} </u></div>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '30px 0', textDecoration: 'underline' }}>
                    {getPaperContent(selectedReq).title}
                  </div>

                  <div style={{ textAlign: 'justify', marginBottom: '40px', textIndent: '40px' }} dangerouslySetInnerHTML={{ __html: getPaperContent(selectedReq).content }} />

                  <div style={{ marginTop: '50px', textAlign: 'right' }}>
                    <p style={{ margin: '0 0 40px 0' }}>ከሠላምታ ጋር፣</p>
                    <p style={{ margin: 0 }}>___________________________</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>የሰው ሀብት አስተዳደር</p>
                  </div>
               </div>
            </div>
            
            <div className="hr-leave-request-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {selectedReq.status === 'APPROVED' && (
                <button 
                  style={{ padding: '8px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleDownloadPdf}
                >
                  <FileText size={16} /> Download PDF
                </button>
              )}
              <button 
                style={{ padding: '8px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => setSelectedReq(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={actionModal.isOpen}
        title={actionModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        content={
          <div className="hr-leave-request-action-modal-content">
            <p className="hr-leave-request-action-modal-message">
              Are you sure you want to {actionModal.action} this recommendation request?
            </p>
            <label className="hr-leave-request-action-modal-label" htmlFor="recActionReason">
              Reason {actionModal.action === 'reject' ? '<span class="req">*</span>' : ''}
            </label>
            <textarea
              id="recActionReason"
              className="hr-leave-request-action-modal-input"
              value={actionModal.reason}
              onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={`Enter ${actionModal.action} reason...`}
              rows={4}
            />
          </div>
        }
        confirmText={actionModal.action === 'approve' ? 'Approve' : 'Reject'}
        cancelText="Cancel"
        isDestructive={actionModal.action === 'reject'}
        confirmDisabled={actionModal.action === 'reject' && !actionModal.reason.trim()}
        onConfirm={confirmAction}
        onCancel={closeActionModal}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Recommendations;
