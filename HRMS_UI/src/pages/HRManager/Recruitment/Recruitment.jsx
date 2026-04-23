import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, X, FileText, Check, ChevronLeft, ChevronRight, Briefcase, Building, Info, Users, Banknote, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { recruitmentService } from '../../../services/recruitmentService';
import { departmentService } from '../../../services/departmentService';
import SearchableSelect from '../../../components/common/SearchableSelect';
import '../../../components/common/CommonForm.css';
import './Recruitment.css';
import { formatEthiopianDate } from '../../../utils/dateTime';

const Recruitment = () => {
  const { t, i18n } = useTranslation();
  const [recruitments, setRecruitments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Bulk Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recruitmentType, setRecruitmentType] = useState('ADMINISTRATIVE');
  
  const getEmptyJob = (type) => {
    if (type === 'ADMINISTRATIVE') {
      return {
        jobTitle: '',
        jobTitleAmharic: '',
        departmentId: '',
        level: '',
        referenceNumber: '',
        vacancies: 1,
        salaryRange: '',
        educationLevel: '',
        requirements: '',
        requirementsAmharic: '',
        experienceRequired: ''
      };
    } else {
      return {
        departmentId: '',
        specialization: '',
        academicRank: '',
        educationLevel: '',
        vacancies: 1,
        requirements: '',
        remark: ''
      };
    }
  };

  const [jobs, setJobs] = useState([getEmptyJob('ADMINISTRATIVE')]);
  const [globalNotes, setGlobalNotes] = useState('');

  // Fetch Logic
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await recruitmentService.listRecruitment();
      if (res.success) {
        setRecruitments(res.data || []);
      }
      
      const deptRes = await departmentService.getAllDepartments(1, 500);
      if (deptRes.success) {
        setDepartments(deptRes.data || []);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal Handlers
  const handleOpenModal = () => {
    setRecruitmentType('ADMINISTRATIVE');
    setJobs([getEmptyJob('ADMINISTRATIVE')]);
    setGlobalNotes('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleTypeToggle = (type) => {
    setRecruitmentType(type);
    setJobs([getEmptyJob(type)]);
  };

  const handleAddRow = () => {
    setJobs([...jobs, getEmptyJob(recruitmentType)]);
  };

  const handleRemoveRow = (index) => {
    if (jobs.length > 1) {
      const newJobs = [...jobs];
      newJobs.splice(index, 1);
      setJobs(newJobs);
    }
  };

  const handleJobChange = (index, field, value) => {
    const newJobs = [...jobs];
    newJobs[index][field] = value;
    setJobs(newJobs);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Validation
      for (const job of jobs) {
        if (recruitmentType === 'ACADEMIC' && !job.departmentId) {
          toast.error(i18n.language === 'am' ? 'እባክዎ ለሁሉም ክፍት ቦታዎች የትምህርት ክፍል/ዲፓርትመንት ይምረጡ' : 'Please select a department for all jobs');
          setIsSubmitting(false);
          return;
        }
      }

      // Map payload strictly enforcing correct notes mapping into the array bundle
      const payload = jobs.map(job => {
        const base = {
          ...job,
          recruitmentType,
          status: 'OPEN'
        };

        if (recruitmentType === 'ADMINISTRATIVE') {
          base.notesAmharic = globalNotes || null;
          base.departmentId = null;
        } else {
          base.notes = globalNotes || null;
        }

        // Convert empty strings to null and handle NaN for numbers to satisfy Zod validation
        Object.keys(base).forEach(key => {
          if (base[key] === '') {
            base[key] = null;
          }
        });

        if (isNaN(base.vacancies) || base.vacancies < 1) {
          base.vacancies = 1;
        }

        return base;
      });

      const res = await recruitmentService.createRecruitment(payload);
      if (res.success) {
        toast.success(i18n.language === 'am' ? 'የስራ ማስታወቂያ በተሳካ ሁኔታ ተፈጥሯል' : 'Recruitment created successfully!');
        handleCloseModal();
        loadData();
      } else {
        toast.error(res.message || "Failed to post jobs");
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit recruitment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rendering
  const filteredDepartments = departments.filter(d => d.departmentType === recruitmentType);
  
  const filteredRecruitments = recruitments.filter(r => 
    (r.jobTitle?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (r.jobTitleAmharic?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (r.specialization?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="recruitment-container">
      <div className="recruitment-top-toolbar">
        <label className="recruitment-search-wrapper" htmlFor="searchRecruitment">
          <Search size={18} color="var(--text-secondary)" />
          <input className="recruitment-form-input" 
            id="searchRecruitment" 
            type="text" 
            placeholder={i18n.language === 'am' ? "ፈልግ..." : "Search vacancies..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn-add-recruitment" onClick={handleOpenModal}>
          <Plus size={18} /> {i18n.language === 'am' ? "ቅጥር አክል" : "Add Recruitment"}
        </button>
      </div>

      <div className="recruitment-table-card">
        <div className="recruitment-table-responsive-wrapper">
          <table className="recruitment-modern-data-table">
            <thead>
              <tr>
                <th>{i18n.language === 'am' ? "ዓይነት" : "Type"}</th>
                <th>{i18n.language === 'am' ? "መጠሪያ / ስፔሻላይዜሽን" : "Title / Specialization"}</th>
                <th>{i18n.language === 'am' ? "የስራ ክፍል" : "Department"}</th>
                <th>{i18n.language === 'am' ? "ብዛት" : "Vacancies"}</th>
                <th>{i18n.language === 'am' ? "ሁኔታ" : "Status"}</th>
                <th>{i18n.language === 'am' ? "የወጣበት ቀን" : "Posted Date"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "በመጫን ላይ..." : "Loading..."}</td>
                </tr>
              ) : filteredRecruitments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "ምንም መረጃ አልተገኘም" : "No recruitments found."}</td>
                </tr>
              ) : (
                filteredRecruitments.map(rec => (
                  <tr key={rec.id}>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        background: rec.recruitmentType === 'ACADEMIC' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: rec.recruitmentType === 'ACADEMIC' ? '#3b82f6' : '#10b981'
                      }}>
                        {rec.recruitmentType}
                      </span>
                    </td>
                    <td className="recruitment-primary-text">
                      {rec.recruitmentType === 'ACADEMIC' 
                        ? (rec.specialization || rec.specializationAmharic || '-') 
                        : (rec.jobTitleAmharic || rec.jobTitle || '-')}
                    </td>
                    <td>{rec.departmentName || '-'}</td>
                    <td>{rec.vacancies}</td>
                    <td>{rec.status}</td>
                    <td>{formatEthiopianDate(rec.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="recruitment-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="recruitment-modal-header">
              <h3>{i18n.language === 'am' ? 'አዲስ የስራ ማስታወቂያ' : 'Post New Vacancies'}</h3>
              <button className="recruitment-close-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <div className="recruitment-type-toggle">
              <button 
                className={`type-btn ${recruitmentType === 'ADMINISTRATIVE' ? 'active' : ''}`}
                onClick={() => handleTypeToggle('ADMINISTRATIVE')}
              >
                {i18n.language === 'am' ? 'የአስተዳደር ስራ (Administrative)' : 'Administrative Staff'}
              </button>
              <button 
                className={`type-btn ${recruitmentType === 'ACADEMIC' ? 'active' : ''}`}
                onClick={() => handleTypeToggle('ACADEMIC')}
              >
                 {i18n.language === 'am' ? 'የአካዳሚክ ስራ (Academic)' : 'Academic Staff'}
              </button>
            </div>
            <div className="premium-section-title">
              <span>{i18n.language === 'am' ? 'የስራ ዝርዝሮች' : 'Job Details'}</span>
              <button type="button" className="add-record-btn" onClick={handleAddRow}>
                <Plus size={14} /> {i18n.language === 'am' ? "ተጨማሪ ክፍት ቦታ አክል" : "Add Job Row"}
              </button>
            </div>

            <div className="bulk-jobs-container">
              {jobs.map((job, index) => (
                <div key={index} className="recruitment-card">
                  {jobs.length > 1 && (
                    <button className="remove-job-btn" onClick={() => handleRemoveRow(index)}>
                      <X size={14} />
                    </button>
                  )}
                  
                  <div className="recruitment-split-layout">
                    {/* Left Column */}
                    <div className="recruitment-column">


                      {recruitmentType === 'ADMINISTRATIVE' ? (
                        <>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">የስራ መደቡ መጠሪያ</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. የፋይናንስ ኦዲት ባለሙያ IV"
                                value={job.jobTitleAmharic} 
                                onChange={(e) => handleJobChange(index, 'jobTitleAmharic', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">ደረጃ</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. XIII"
                                value={job.level} 
                                onChange={(e) => handleJobChange(index, 'level', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">የትምህርት ደረጃ</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. የመጀመሪያ ዲግሪ"
                                value={job.educationLevel} 
                                onChange={(e) => handleJobChange(index, 'educationLevel', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">መለያ ቁጥር</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. 8.41/አዮ-38"
                                value={job.referenceNumber} 
                                onChange={(e) => handleJobChange(index, 'referenceNumber', e.target.value)} 
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <> <div className="recruitment-form-group">
                            <label className="recruitment-form-label">
                              Department <span className="common-required-star">*</span>
                            </label>
                            <div className="recruitment-input-wrap">
                              <SearchableSelect 
                                field={{
                                  name: 'departmentId',
                                  label: 'Department',
                                  options: filteredDepartments.map(d => ({ value: d.id, label: d.departmentName })),
                                }}
                                value={job.departmentId}
                                onChange={(e) => handleJobChange(index, 'departmentId', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">Field of Specialization</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. Software Engineering"
                                value={job.specialization} 
                                onChange={(e) => handleJobChange(index, 'specialization', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">Academic Rank</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. Lecturer and above"
                                value={job.academicRank} 
                                onChange={(e) => handleJobChange(index, 'academicRank', e.target.value)} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">Education Level (Background)</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. MSc in Software Engineering"
                                value={job.educationLevel} 
                                onChange={(e) => handleJobChange(index, 'educationLevel', e.target.value)} 
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="recruitment-column">
                      {recruitmentType === 'ADMINISTRATIVE' ? (
                        <>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">ብዛት</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="number" 
                                min="1"
                                placeholder="e.g. 1"
                                value={job.vacancies} 
                                onChange={(e) => handleJobChange(index, 'vacancies', parseInt(e.target.value))} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">ደመወዝ</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. 17,838"
                                value={job.salaryRange} 
                                onChange={(e) => handleJobChange(index, 'salaryRange', e.target.value)} 
                              />
                            </div>
                          </div>
                            <div className="recruitment-form-group">
                            <label className="recruitment-form-label">የስራ ልምድ</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. 6 ዓመት"
                                value={job.experienceRequired} 
                                onChange={(e) => handleJobChange(index, 'experienceRequired', e.target.value)} 
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">Vacancies</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="number" 
                                min="1"
                                placeholder="e.g. 2"
                                value={job.vacancies} 
                                onChange={(e) => handleJobChange(index, 'vacancies', parseInt(e.target.value))} 
                              />
                            </div>
                          </div>
                          <div className="recruitment-form-group">
                            <label className="recruitment-form-label">Remark</label>
                            <div className="recruitment-input-wrap">
                              
                              <input className="recruitment-form-input" 
                                type="text" 
                                placeholder="e.g. Clinical experience required"
                                value={job.remark} 
                                onChange={(e) => handleJobChange(index, 'remark', e.target.value)} 
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Full Width Footer Area */}
                  {recruitmentType === 'ADMINISTRATIVE' ? (
                    <div className="recruitment-form-group" style={{ marginTop: '1rem' }}>
                      <label className="recruitment-form-label">አስፈላጊ የትምህርት ዝግጅት</label>
                      <div className="recruitment-input-wrap">
                        
                        <textarea className="recruitment-form-input" 
                          rows="2"
                          placeholder="e.g. አካውንቲንግ, ፋይናንስ ማኔጅመንት..."
                          value={job.requirementsAmharic} 
                          onChange={(e) => handleJobChange(index, 'requirementsAmharic', e.target.value)} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="recruitment-form-group" style={{ marginTop: '1rem' }}>
                      <label className="recruitment-form-label">Required Background / Qualifications</label>
                      <div className="recruitment-input-wrap">
                        
                        <input className="recruitment-form-input" 
                          type="text" 
                          placeholder="e.g. Software Engineering, Computer Science"
                          value={job.requirements} 
                          onChange={(e) => handleJobChange(index, 'requirements', e.target.value)} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="notes-section">
              <div className="recruitment-form-group">
                <label className="recruitment-form-label">
                  {recruitmentType === 'ADMINISTRATIVE' 
                    ? (i18n.language === 'am' ? 'ማሳሰቢያ (Footer Notes for the Telegram Image)' : 'Notes (Amharic Footer)') 
                    : 'Notes (English Footer for the Telegram Image)'}
                </label>
                <textarea className="recruitment-form-input" 
                  placeholder={recruitmentType === 'ADMINISTRATIVE' 
                    ? "1. ከላይ የተገለጹት...\n2. አመልካቾች..." 
                    : "1. Applicants must bring...\n2. Submission deadline..."}
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer-actions">
              <button className="btn-cancel" onClick={handleCloseModal} disabled={isSubmitting}>
                {i18n.language === 'am' ? "ሰርዝ" : "Cancel"}
              </button>
              <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (i18n.language === 'am' ? "በመላክ ላይ..." : "Posting...") : (i18n.language === 'am' ? "ይላኩ (Post to Telegram)" : "Post to Telegram")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
