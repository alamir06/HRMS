import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { recommendationService } from '../../../services/recommendationService';
import { FileText, Plus, CheckCircle, XCircle, Clock, GraduationCap, Stethoscope, Building, FileBadge, Check, X } from 'lucide-react';
import './MyRecommendations.css';

const REC_TYPES = [
  { id: 'EDUCATION', icon: <GraduationCap size={24} />, labelEn: 'Education', labelAm: 'ትምህርት' },
  { id: 'PROFESSIONAL_LICENSE', icon: <Stethoscope size={24} />, labelEn: 'Professional License', labelAm: 'የሙያ ፈቃድ' },
  { id: 'MAYOR_OFFICE', icon: <Building size={24} />, labelEn: 'Mayor Office', labelAm: 'ከንቲባ ጽ/ቤት' },
  { id: 'MINISTRY_OF_EDUCATION', icon: <Building size={24} />, labelEn: 'Ministry of Education', labelAm: 'ትምህርት ሚኒስቴር' },
  { id: 'WORK_EXPERIENCE', icon: <FileBadge size={24} />, labelEn: 'Work Experience', labelAm: 'የስራ ልምድ' }
];

const MyRecommendations = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    degreeProgram: '',
    institutionName: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await recommendationService.getAllRequests({});
      setRequests(res.data || []);
    } catch (error) {
      toast.error('Failed to load recommendation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      toast.error('Please select a recommendation type');
      return;
    }
    
    setSubmitting(true);
    try {
      await recommendationService.createRequest({
        recommendationType: selectedType,
        ...formData
      });
      toast.success('Recommendation request submitted successfully');
      setIsModalOpen(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setFormData({ degreeProgram: '', institutionName: '', reason: '' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="my-recommendations-badge approved"><CheckCircle size={14} /> Approved</span>;
      case 'REJECTED':
        return <span className="my-recommendations-badge rejected"><XCircle size={14} /> Rejected</span>;
      default:
        return <span className="my-recommendations-badge pending"><Clock size={14} /> Pending</span>;
    }
  };

  const downloadApprovedLetter = async (reqId) => {
    toast.info('Generating document... Please check your email for the official stamped letter.');
  };

  return (
    <div className="my-recommendations-container">
      <div className="my-recommendations-header">
        <div className="my-recommendations-title">
          <h1>{isAmharic ? 'የምስክር ወረቀቶች' : 'My Recommendations'}</h1>
          <p>{isAmharic ? 'የምስክር ወረቀት ጥያቄዎችዎን ያስተዳድሩ' : 'Manage your recommendation letter requests'}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="my-recommendations-new-btn">
          <Plus size={20} />
          {isAmharic ? 'አዲስ ጥያቄ' : 'New Request'}
        </button>
      </div>

      <div className="my-recommendations-card">
        <div className="my-recommendations-table-wrapper">
          <table className="my-recommendations-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="my-recommendations-empty">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="4" className="my-recommendations-empty">
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                      <FileText size={48} color="#d1d5db" />
                      <p>{isAmharic ? 'ምንም የተጠየቀ የምስክር ወረቀት የለም' : 'No recommendation requests found'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const typeInfo = REC_TYPES.find(t => t.id === req.recommendationType) || REC_TYPES[4];
                  return (
                    <tr key={req.id}>
                      <td>
                        <div className="my-recommendations-type-col">
                          <div className="my-recommendations-icon-box">{typeInfo.icon}</div>
                          <div className="my-recommendations-type-info">
                            <p>{isAmharic ? typeInfo.labelAm : typeInfo.labelEn}</p>
                            {(req.degreeProgram || req.institutionName) && (
                              <span>{req.degreeProgram} {req.institutionName && `at ${req.institutionName}`}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="my-recommendations-date-col">
                        {new Date(req.requestDate).toLocaleDateString()}
                      </td>
                      <td>
                        {getStatusBadge(req.status)}
                        {req.status === 'REJECTED' && req.rejectionReason && (
                          <div className="my-recommendations-reject-reason" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => downloadApprovedLetter(req.id)}
                            style={{color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '500'}}
                          >
                            {isAmharic ? 'አውርድ / Download' : 'Download Letter'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="my-recommendations-modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="my-recommendations-modal-content" onClick={e => e.stopPropagation()}>
            <div className="my-recommendations-modal-header">
              <div className="my-recommendations-modal-title-col">
                <h2>{isAmharic ? 'አዲስ የምስክር ወረቀት ጥያቄ' : 'New Recommendation Request'}</h2>
                <p>Please fill in the formal request details below.</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="my-recommendations-modal-close" title="Close Modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="my-recommendations-req-card">
                <div className="my-recommendations-req-section-title">
                  <FileBadge size={16} color="#059669" /> {isAmharic ? 'የምስክር ወረቀት አይነት ይምረጡ' : 'Select Letter Type'}
                </div>
                <div className="my-recommendations-type-grid">
                  {REC_TYPES.map(type => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`my-recommendations-type-btn ${selectedType === type.id ? 'selected' : ''}`}
                    >
                      <div className="my-recommendations-type-icon-box">{type.icon}</div>
                      <div className="my-recommendations-type-name">
                        {isAmharic ? type.labelAm : type.labelEn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedType === 'EDUCATION' && (
                <div className="my-recommendations-req-card">
                  <div className="my-recommendations-req-section-title">
                    <GraduationCap size={16} color="#059669" /> {isAmharic ? 'የትምህርት ዝርዝር መረጃ' : 'Education Details'}
                  </div>
                  <div className="my-recommendations-input-grid">
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የዲግሪ ፕሮግራም' : 'Degree Program'}</label>
                      <select
                        name="degreeProgram"
                        value={formData.degreeProgram}
                        onChange={handleInputChange}
                        required
                        className="my-recommendations-select"
                      >
                        <option value="">Select...</option>
                        <option value="1ኛ ዲግሪ (1st Degree)">1ኛ ዲግሪ (1st Degree)</option>
                        <option value="2ኛ ዲግሪ (2nd Degree)">2ኛ ዲግሪ (2nd Degree)</option>
                        <option value="3ኛ ዲግሪ (3rd Degree)">3ኛ ዲግሪ (3rd Degree)</option>
                      </select>
                    </div>
                    <div className="my-recommendations-input-group">
                      <label>{isAmharic ? 'የዩኒቨርሲቲው ስም' : 'University Name'}</label>
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Addis Ababa University"
                        className="my-recommendations-input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="my-recommendations-modal-footer">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="my-recommendations-btn-cancel"
                >
                  Cancel Request
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedType}
                  className="my-recommendations-btn-submit"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecommendations;
