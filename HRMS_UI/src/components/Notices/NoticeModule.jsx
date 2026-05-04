import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Megaphone, Send, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { noticeService } from '../../services/noticeService';
import { departmentService } from '../../services/departmentService';
import { collegeService } from '../../services/collegeService';
import { employeeService } from '../../services/employeeService';
import { formatEthiopianDate } from '../../utils/dateTime';
import SearchableSelect from '../common/SearchableSelect';
import './NoticeModule.css';

const NoticeModule = ({ allowedAudiences, isEmployeeView = false }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  
  // Get logged in user data to auto-assign department/college context
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  
  const [formData, setFormData] = useState({
    title: '',
    titleAmharic: '',
    content: '',
    contentAmharic: '',
    noticeType: 'GENERAL',
    targetAudience: allowedAudiences?.[0] || 'ALL',
    targetDepartmentId: '',
    targetCollegeId: '',
    targetEmployeeId: '',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    isPublished: !isEmployeeView // If employee request, maybe auto-publish or leave draft. Let's make it true for requests.
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await noticeService.listNotices(isEmployeeView ? { activeOnly: true } : {});
      if (res.success) {
        setNotices(res.data || []);
      }
      
      const deptRes = await departmentService.getAllDepartments(1, 500);
      if (deptRes.success) setDepartments(deptRes.data || []);

      const collRes = await collegeService.getAllColleges();
      if (collRes.success) setColleges(collRes.data || []);

      const empRes = await employeeService.getAllEmployees(1, 1000);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load notices");
    } finally {
      setIsLoading(false);
    }
  }, [isEmployeeView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = () => {
    setFormData({
      title: '',
      titleAmharic: '',
      content: '',
      contentAmharic: '',
      noticeType: 'GENERAL',
      targetAudience: allowedAudiences?.[0] || 'ALL',
      targetDepartmentId: '',
      targetCollegeId: '',
      targetEmployeeId: '',
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      isPublished: true // Auto publish for simplicity, or make it a toggle for HR
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isAdmin = !allowedAudiences || allowedAudiences.includes('ALL');

  const handleSubmit = async () => {
    const payload = { ...formData };

    if (isAmharic) {
      if (!payload.titleAmharic || !payload.contentAmharic) {
        toast.error('እባክዎ ርዕስ እና ይዘት ያስገቡ');
        return;
      }
      if (!payload.title) payload.title = payload.titleAmharic;
      if (!payload.content) payload.content = payload.contentAmharic;
    } else {
      if (!payload.title || !payload.content) {
        toast.error('Please provide title and content');
        return;
      }
      if (!payload.titleAmharic) payload.titleAmharic = payload.title;
      if (!payload.contentAmharic) payload.contentAmharic = payload.content;
    }

    // Auto-attach department and college logic based on user's role
    if (payload.targetAudience === 'DEPARTMENT') {
      if (isAdmin) {
        if (!payload.targetDepartmentId) {
          toast.error(isAmharic ? 'እባክዎ ክፍል ይምረጡ' : 'Please select a department');
          return;
        }
      } else {
        if (!currentUser.departmentId) {
          toast.error('You do not belong to a department. Cannot send departmental notice.');
          return;
        }
        payload.targetDepartmentId = currentUser.departmentId;
      }
    }

    if (payload.targetAudience === 'COLLEGE_HEADS') {
      if (!currentUser.collegeId) {
        // Find the collegeId if the user has a department that maps to one, or grab from current user object
        toast.error('You do not belong to a college. Cannot send college notice.');
        return;
      }
      payload.targetCollegeId = currentUser.collegeId;
    }

    if (payload.targetAudience === 'COLLEGE') {
      if (isAdmin) {
        if (!payload.targetCollegeId) {
           toast.error(isAmharic ? 'እባክዎ ኮሌጅ ይምረጡ' : 'Please select a college');
           return;
        }
      } else {
        if (!currentUser.collegeId) {
           toast.error('You do not belong to a college. Cannot send college notice.');
           return;
        }
        payload.targetCollegeId = currentUser.collegeId;
      }
    }

    if (payload.targetAudience === 'INDIVIDUAL' && !payload.targetEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Clean up empty strings for Zod
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      const res = await noticeService.createNotice(payload);
      if (res.success) {
        toast.success(i18n.language === 'am' ? 'በተሳካ ሁኔታ ተልኳል' : 'Successfully submitted!');
        handleCloseModal();
        loadData();
      } else {
        toast.error(res.message || "Failed to submit");
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotices = notices.filter(n => 
    (n.title?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (n.titleAmharic?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="notice-container">
      <div className="notice-top-toolbar">
        <label className="notice-search-wrapper" htmlFor="searchNotice">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchNotice" 
            type="text" 
            placeholder={i18n.language === 'am' ? "ፈልግ..." : "Search notices..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn-add-notice" onClick={handleOpenModal}>
          {isEmployeeView ? <><Send size={18} /> {i18n.language === 'am' ? "ጥያቄ ይላኩ" : "Send Request"}</> : <><Plus size={18} /> {i18n.language === 'am' ? "ማስታወቂያ አክል" : "Create Notice"}</>}
        </button>
      </div>

      <div className="notice-table-card">
        <div className="notice-table-responsive-wrapper">
          <table className="notice-modern-data-table">
            <thead>
              <tr>
                <th>{i18n.language === 'am' ? "ዓይነት" : "Type"}</th>
                <th>{i18n.language === 'am' ? "ርዕስ" : "Title"}</th>
                <th>{i18n.language === 'am' ? "ተደራሲያን" : "Audience"}</th>
                <th>{i18n.language === 'am' ? "የላኪ ስም" : "Created By"}</th>
                <th>{i18n.language === 'am' ? "የወጣበት ቀን" : "Date"}</th>
                {!isEmployeeView && <th>{i18n.language === 'am' ? "ሁኔታ" : "Status"}</th>}
                <th>{i18n.language === 'am' ? "ድርጊት" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isEmployeeView ? "5" : "6"} style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "በመጫን ላይ..." : "Loading..."}</td>
                </tr>
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={isEmployeeView ? "6" : "7"} style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "ምንም መረጃ አልተገኘም" : "No records found."}</td>
                </tr>
              ) : (
                filteredNotices.map(n => (
                  <tr key={n.id}>
                    <td>
                      <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                        {n.noticeType}
                      </span>
                    </td>
                    <td className="notice-primary-text">
                      {n.title} {n.titleAmharic && <span style={{fontSize:'0.8em', color:'#64748b', display:'block'}}>{n.titleAmharic}</span>}
                    </td>
                    <td>
                      <span className="audience-badge">
                        {n.targetAudience === 'DEPARTMENT' ? (isAdmin ? 'Specific Department' : 'My Department Employees') : 
                         n.targetAudience === 'COLLEGE_HEADS' ? 'College Department Heads' : 
                         n.targetAudience === 'HR_MANAGER' ? 'HR Manager' : 
                         n.targetAudience === 'INDIVIDUAL' ? 'Specific Employee' : n.targetAudience}
                        {n.targetDepartmentName && n.targetAudience !== 'DEPARTMENT' && ` - ${n.targetDepartmentName}`}
                        {n.targetDepartmentName && n.targetAudience === 'DEPARTMENT' && isAdmin && ` - ${n.targetDepartmentName}`}
                        {n.targetCollegeName && n.targetAudience !== 'COLLEGE_HEADS' && n.targetAudience !== 'COLLEGE' && ` - ${n.targetCollegeName}`}
                        {n.targetEmployeeName && n.targetAudience === 'INDIVIDUAL' && ` - ${n.targetEmployeeName}`}
                      </span>
                    </td>
                    <td>{n.createdByUsername}</td>
                    <td>{formatEthiopianDate(n.createdAt)}</td>
                    {!isEmployeeView && (
                      <td>
                        {n.isPublished ? <span className="status-badge published">Published</span> : <span className="status-badge draft">Draft</span>}
                      </td>
                    )}
                    <td>
                      <button 
                        onClick={() => setSelectedNotice(n)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '4px', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: '500' }}
                      >
                        {isAmharic ? 'ዝርዝር እይ' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="notice-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="notice-modal-header">
              <h3>{isEmployeeView ? (i18n.language === 'am' ? 'ጥያቄ ወይም መረጃ ይላኩ' : 'Send Request / Message') : (i18n.language === 'am' ? 'አዲስ ማስታወቂያ' : 'Create New Notice')}</h3>
              <button className="notice-close-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <div className="notice-modal-body">
              <div className="notice-form-group">
                <label className="notice-form-label">{isAmharic ? 'ርዕስ' : 'Title'} <span className="common-required-star">*</span></label>
                <input 
                  className="notice-form-input" 
                  type="text" 
                  placeholder={isAmharic ? "ርዕስ..." : "e.g. Weekly Meeting"} 
                  value={isAmharic ? formData.titleAmharic : formData.title} 
                  onChange={e => handleChange(isAmharic ? 'titleAmharic' : 'title', e.target.value)} 
                />
              </div>

              <div className="notice-split-layout">
                <div className="notice-form-group">
                  <label className="notice-form-label">{isAmharic ? 'ተደራሲያን' : 'Target Audience'} <span className="common-required-star">*</span></label>
                  <select className="notice-form-select" value={formData.targetAudience} onChange={e => handleChange('targetAudience', e.target.value)}>
                    {(allowedAudiences || ["ALL", "DEPARTMENT", "COLLEGE", "INDIVIDUAL"]).map(aud => {
                      let label = aud;
                      if (aud === 'DEPARTMENT') label = isAdmin ? 'Specific Department' : 'My Department Employees';
                      if (aud === 'COLLEGE') label = 'Specific College';
                      if (aud === 'INDIVIDUAL') label = 'Specific Employee';
                      if (aud === 'HR_MANAGER') label = 'HR Manager';
                      if (aud === 'COLLEGE_HEADS') label = 'College Department Heads';
                      return <option key={aud} value={aud}>{label}</option>
                    })}
                  </select>
                </div>
                <div className="notice-form-group">
                  <label className="notice-form-label">{isAmharic ? 'የማስታወቂያ ዓይነት' : 'Notice Type'}</label>
                  <select className="notice-form-select" value={formData.noticeType} onChange={e => handleChange('noticeType', e.target.value)}>
                    <option value="GENERAL">{isAmharic ? 'አጠቃላይ' : 'General'}</option>
                    <option value="POLICY">{isAmharic ? 'ደንብ' : 'Policy'}</option>
                    <option value="EVENT">{isAmharic ? 'ክስተት' : 'Event'}</option>
                    <option value="URGENT">{isAmharic ? 'አስቸኳይ' : 'Urgent'}</option>
                  </select>
                </div>
              </div>

              {/* If HR Manager selects DEPARTMENT or COLLEGE, we still need manual selection. But Heads don't. */}
              {formData.targetAudience === 'DEPARTMENT' && isAdmin && (
                <div className="notice-form-group">
                  <label className="notice-form-label">{isAmharic ? 'ክፍል ይምረጡ' : 'Select Department'} <span className="common-required-star">*</span></label>
                  <SearchableSelect 
                    field={{ name: 'targetDepartmentId', label: isAmharic ? 'ክፍል' : 'Department', options: departments.map(d => ({ value: d.id, label: d.departmentName })) }}
                    value={formData.targetDepartmentId}
                    onChange={(e) => handleChange(e.target.name, e.target.value)}
                  />
                </div>
              )}

              {formData.targetAudience === 'COLLEGE' && isAdmin && (
                <div className="notice-form-group">
                  <label className="notice-form-label">{isAmharic ? 'ኮሌጅ ይምረጡ' : 'Select College'} <span className="common-required-star">*</span></label>
                  <SearchableSelect 
                    field={{ name: 'targetCollegeId', label: isAmharic ? 'ኮሌጅ' : 'College', options: colleges.map(c => ({ value: c.id, label: c.collegeName })) }}
                    value={formData.targetCollegeId}
                    onChange={(e) => handleChange(e.target.name, e.target.value)}
                  />
                </div>
              )}

              {formData.targetAudience === 'INDIVIDUAL' && (
                <div className="notice-form-group">
                  <label className="notice-form-label">{isAmharic ? 'ሰራተኛ ይምረጡ' : 'Select Employee'} <span className="common-required-star">*</span></label>
                  <SearchableSelect 
                    field={{ name: 'targetEmployeeId', label: isAmharic ? 'ሰራተኛ' : 'Employee', options: employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName} ${e.departmentName ? `(${e.departmentName})` : ''}` })) }}
                    value={formData.targetEmployeeId}
                    onChange={(e) => handleChange(e.target.name, e.target.value)}
                  />
                </div>
              )}

              <div className="notice-split-layout">
                <div className="notice-form-group" style={{ flex: 2 }}>
                  <label className="notice-form-label">{isAmharic ? 'መልእክት' : 'Content'} <span className="common-required-star">*</span></label>
                  <textarea 
                    className="notice-form-textarea" 
                    placeholder={isAmharic ? "መልእክትዎን እዚህ ይፃፉ..." : "Write your message here..."} 
                    value={isAmharic ? formData.contentAmharic : formData.content} 
                    onChange={e => handleChange(isAmharic ? 'contentAmharic' : 'content', e.target.value)}
                  ></textarea>
                </div>
              </div>

              {!isEmployeeView && (
                <div className="notice-split-layout">
                  <div className="notice-form-group">
                    <label className="notice-form-label">Publish Date</label>
                    <input className="notice-form-input" type="date" value={formData.publishDate} onChange={e => handleChange('publishDate', e.target.value)} />
                  </div>
                  <div className="notice-form-group">
                    <label className="notice-form-label">Expiry Date (Optional)</label>
                    <input className="notice-form-input" type="date" value={formData.expiryDate} onChange={e => handleChange('expiryDate', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer-actions">
              <button className="btn-cancel" onClick={handleCloseModal} disabled={isSubmitting}>
                {i18n.language === 'am' ? "ሰርዝ" : "Cancel"}
              </button>
              <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : (isEmployeeView ? "Send Request" : "Publish Notice")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNotice && (
        <div className="modal-overlay" onClick={() => setSelectedNotice(null)}>
          <div className="notice-modal-wrapper" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="notice-modal-header">
              <h3>{isAmharic ? 'የማስታወቂያ ዝርዝር' : 'Notice Details'}</h3>
              <button className="notice-close-btn" onClick={() => setSelectedNotice(null)}><X size={20} /></button>
            </div>
            <div className="notice-modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569', marginBottom: '12px', display: 'inline-block' }}>
                  {selectedNotice.noticeType}
                </span>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>
                  {isAmharic ? (selectedNotice.titleAmharic || selectedNotice.title) : selectedNotice.title}
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                  <span><strong>{isAmharic ? 'የላኪ ስም:' : 'From:'}</strong> {selectedNotice.createdByUsername}</span>
                  <span><strong>{isAmharic ? 'የወጣበት ቀን:' : 'Date:'}</strong> {formatEthiopianDate(selectedNotice.createdAt)}</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '120px', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '1rem' }}>
                {isAmharic ? (selectedNotice.contentAmharic || selectedNotice.content) : selectedNotice.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeModule;
