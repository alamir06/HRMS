import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Megaphone, Send, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { noticeService } from '../../services/noticeService';
import { departmentService } from '../../services/departmentService';
import { collegeService } from '../../services/collegeService';
import { formatEthiopianDate } from '../../utils/dateTime';
import SearchableSelect from '../common/SearchableSelect';
import './NoticeModule.css';

const NoticeModule = ({ allowedAudiences, isEmployeeView = false }) => {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error(i18n.language === 'am' ? 'እባክዎ ርዕስ እና ይዘት ያስገቡ' : 'Please provide title and content');
      return;
    }

    if (formData.targetAudience === 'DEPARTMENT' && !formData.targetDepartmentId) {
      toast.error('Please select a department');
      return;
    }

    if (formData.targetAudience === 'COLLEGE' && !formData.targetCollegeId) {
      toast.error('Please select a college');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = { ...formData };
      
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
          <input className="notice-form-input" 
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
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isEmployeeView ? "5" : "6"} style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "በመጫን ላይ..." : "Loading..."}</td>
                </tr>
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={isEmployeeView ? "5" : "6"} style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "ምንም መረጃ አልተገኘም" : "No records found."}</td>
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
                        {n.targetAudience}
                        {n.targetDepartmentName && ` - ${n.targetDepartmentName}`}
                        {n.targetCollegeName && ` - ${n.targetCollegeName}`}
                      </span>
                    </td>
                    <td>{n.createdByUsername}</td>
                    <td>{formatEthiopianDate(n.createdAt)}</td>
                    {!isEmployeeView && (
                      <td>
                        {n.isPublished ? <span className="status-badge published">Published</span> : <span className="status-badge draft">Draft</span>}
                      </td>
                    )}
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
              <div className="notice-split-layout">
                {/* Left Column */}
                <div className="notice-form-group">
                  <label className="notice-form-label">Title (English) <span className="common-required-star">*</span></label>
                  <input className="notice-form-input" type="text" placeholder="e.g. Weekly Meeting" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
                </div>
                <div className="notice-form-group">
                  <label className="notice-form-label">Title (Amharic)</label>
                  <input className="notice-form-input" type="text" placeholder="ርዕስ..." value={formData.titleAmharic} onChange={e => handleChange('titleAmharic', e.target.value)} />
                </div>
              </div>

              <div className="notice-split-layout">
                <div className="notice-form-group">
                  <label className="notice-form-label">Target Audience <span className="common-required-star">*</span></label>
                  <select className="notice-form-select" value={formData.targetAudience} onChange={e => handleChange('targetAudience', e.target.value)}>
                    {(allowedAudiences || ["ALL", "DEPARTMENT", "COLLEGE", "HR_MANAGER", "INDIVIDUAL"]).map(aud => (
                      <option key={aud} value={aud}>{aud}</option>
                    ))}
                  </select>
                </div>
                <div className="notice-form-group">
                  <label className="notice-form-label">Notice Type</label>
                  <select className="notice-form-select" value={formData.noticeType} onChange={e => handleChange('noticeType', e.target.value)}>
                    <option value="GENERAL">General</option>
                    <option value="POLICY">Policy</option>
                    <option value="EVENT">Event</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {formData.targetAudience === 'DEPARTMENT' && (
                <div className="notice-form-group">
                  <label className="notice-form-label">Select Department <span className="common-required-star">*</span></label>
                  <SearchableSelect 
                    field={{ name: 'targetDepartmentId', options: departments.map(d => ({ value: d.id, label: d.departmentName })) }}
                    value={formData.targetDepartmentId}
                    onChange={(e) => handleChange('targetDepartmentId', e.target.value)}
                  />
                </div>
              )}

              {formData.targetAudience === 'COLLEGE' && (
                <div className="notice-form-group">
                  <label className="notice-form-label">Select College <span className="common-required-star">*</span></label>
                  <select className="notice-form-select" value={formData.targetCollegeId} onChange={e => handleChange('targetCollegeId', e.target.value)}>
                    <option value="">-- Select College --</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.id}>{c.collegeName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="notice-split-layout">
                <div className="notice-form-group">
                  <label className="notice-form-label">Content (English) <span className="common-required-star">*</span></label>
                  <textarea className="notice-form-textarea" placeholder="Write the details here..." value={formData.content} onChange={e => handleChange('content', e.target.value)} />
                </div>
                <div className="notice-form-group">
                  <label className="notice-form-label">Content (Amharic)</label>
                  <textarea className="notice-form-textarea" placeholder="ዝርዝር መረጃ..." value={formData.contentAmharic} onChange={e => handleChange('contentAmharic', e.target.value)} />
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
    </div>
  );
};

export default NoticeModule;
