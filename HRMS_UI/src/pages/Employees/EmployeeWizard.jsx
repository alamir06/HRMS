import React, { useState, useEffect } from 'react';
import { 
  X, ArrowRight, ChevronLeft, Plus, Trash2, 
  User, Calendar, Phone, Briefcase, Building, Info, FileUp, File
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Stepper from '../../components/common/Stepper';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import { collegeService } from '../../services/collegeService';
import { outsourceCompanyService } from '../../services/outsourceCompanyService';
import './EmployeeWizard.css';

const steps = [
  { title: "Category", subtitle: "Role & Department" },
  { title: "Personal Details", subtitle: "Core Identity" },
  { title: "Details", subtitle: "Specialization" },
  { title: "Documents", subtitle: "Upload Files" }
];

const EmployeeWizard = ({ onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookups
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [outsourceCompanies, setOutsourceCompanies] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    // Base
    employeeType: 'ACADEMIC',
    departmentId: '',
    hireDate: new Date().toISOString().split('T')[0],
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    
    // Sub-objects
    personal: {
      firstName: '',
      firstNameAmharic: '',
      middleName: '',
      middleNameAmharic: '',
      lastName: '',
      lastNameAmharic: '',
      gender: 'MALE',
      dateOfBirth: '',
      personalEmail: '',
      personalPhone: '',
      emergencyContactName: '',
      emergencyContactNameAmharic: '',
      emergencyContactPhone: ''
    },
    employment: {
      officialEmail: '',
      officialPhone: '',
      salary: '',
      qualification: '',
      qualificationAmharic: ''
    },
    academic: {
      collegeId: '',
      academicRank: '',
      academicRankAmharic: '',
      academicStatus: 'ACTIVE',
      fieldOfSpecialization: '',
      fieldOfSpecializationAmharic: ''
    },
    hr: {
      hrSpecialization: 'generalist',
      hrLevel: 'officer'
    },
    outsource: {
      outsourcingCompanyId: '',
      contractStartDate: '',
      contractEndDate: '',
      serviceType: 'SECURITY'
    },
    education: [],
    documents: []
  });

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [deptRes, colRes, outRes] = await Promise.all([
          departmentService.getAllDepartments(1, 200),
          collegeService.getAllColleges(1, 100),
          outsourceCompanyService.getAllCompanies(1, 100)
        ]);

        if (deptRes?.success) setDepartments(deptRes.data);
        if (colRes?.success) setColleges(colRes.data);
        if (outRes?.success) setOutsourceCompanies(outRes.data);
      } catch (e) {
        console.error("Failed to load dependency lookups");
      }
    };
    loadLookups();
  }, []);

  const updateBase = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNested = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(c => c + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const newDocs = files.map(file => ({
      file,
      documentType: 'OTHER',
      documentName: file.name
    }));

    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocs]
    }));
    e.target.value = '';
  };
  
  const updateDocumentType = (idx, value) => {
    const newDocs = [...formData.documents];
    newDocs[idx].documentType = value;
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const updateDocumentName = (idx, value) => {
    const newDocs = [...formData.documents];
    newDocs[idx].documentName = value;
    setFormData(prev => ({ ...prev, documents: newDocs }));
  }

  const removeDocument = (idx) => {
    const newDocs = [...formData.documents];
    newDocs.splice(idx, 1);
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { institutionName: '', institutionNameAmharic: '', qualification: '', startDate: '', endDate: '' }]
    }));
  };
  const updateEducation = (idx, field, value) => {
    const newEd = [...formData.education];
    newEd[idx][field] = value;
    setFormData(prev => ({ ...prev, education: newEd }));
  };
  const removeEducation = (idx) => {
    const newEd = [...formData.education];
    newEd.splice(idx, 1);
    setFormData(prev => ({ ...prev, education: newEd }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const payload = { ...formData };
      
      if (!payload.departmentId) delete payload.departmentId;
      
      if (payload.employment.salary) {
        payload.employment.salary = Number(payload.employment.salary);
      } else {
         delete payload.employment.salary;
      }
      
      if (!payload.personal.dateOfBirth) delete payload.personal.dateOfBirth;

      if (payload.employeeType !== 'ACADEMIC') delete payload.academic;
      if (payload.employeeType !== 'HR') delete payload.hr;
      if (payload.employeeType !== 'OUTSOURCED') delete payload.outsource;

      if (payload.education.length === 0) {
        delete payload.education;
      }
      
      const documentsToUpload = payload.documents;
      delete payload.documents;
      
      const submitPayload = { ...payload };
      
      // Map UI values to strictly match Database ENUMs
      if (submitPayload.employeeType === 'HR') {
        submitPayload.employeeType = 'ADMINISTRATIVE';
        submitPayload.employeeRole = 'HROFFICER'; 
      }
      
      if (submitPayload.employeeType === 'OUTSOURCED') {
        submitPayload.employeeType = 'OUTSOURCE';
      }
      
      if (submitPayload.employmentType === 'FULL_TIME') {
        submitPayload.employmentType = 'FULLTIME';
      } else if (submitPayload.employmentType === 'PART_TIME') {
        submitPayload.employmentType = 'PARTTIME';
      }

      const res = await employeeService.createEmployee(submitPayload);
      if (res.success) {
         const newEmployeeId = res.data.id;
         
         if (documentsToUpload && documentsToUpload.length > 0) {
            toast.info(`Employee created. Uploading ${documentsToUpload.length} documents...`);
            for (const docObj of documentsToUpload) {
               const docFormData = new FormData();
               docFormData.append('document', docObj.file);
               docFormData.append('documentType', docObj.documentType);
               docFormData.append('documentName', docObj.documentName);
               try {
                 await employeeService.uploadSingleDocument(newEmployeeId, docFormData);
               } catch (err) {
                 console.error("Doc upload failed", err);
                 toast.warn(`Failed to upload document: ${docObj.documentName}`);
               }
            }
         }
         
         toast.success("Employee Registration completed successfully!");
         onSuccess();
      } else {
         toast.error(res?.error || "Failed to create employee");
      }
    } catch (e) {
      const errs = e?.response?.data?.details;
      if (Array.isArray(errs)) {
         errs.forEach(err => toast.error(`${err.field}: ${err.message}`));
      } else if (e?.response?.data?.message) {
         toast.error(e.response.data.message);
      } else {
         toast.error("An unexpected error occurred during submission.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-modal" onClick={e => e.stopPropagation()}>
        <div className="premium-header">
          <div className="header-left" onClick={currentStep > 0 ? handlePrev : onClose}>
            <ChevronLeft size={20} className="header-icon" />
            <span className="header-title">{t('wizard.title', 'Registration')}</span>
          </div>
          <div className="header-center">
            <Stepper steps={steps} currentStep={currentStep} />
          </div>
          <div className="premium-header-actions">
            <button className="premium-icon-btn" onClick={onClose}><X size={20} className="close-icon" /></button>
          </div>
        </div>

        <div className="premium-body">
          <div className="premium-form-container">
            
            {/* STEP 1: CATEGORY */}
            {currentStep === 0 && (
              <>
                <h3 className="premium-section-title">Employment Information</h3>
                <div className="wizard-split-layout">
                  {/* Left Column */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      <div className="premium-form-group">
                        <label>{t('forms.employeeCategory', 'Employee Category')} <span className="req">*</span></label>
                        <div className="premium-input-wrap select-wrap">
                          <Briefcase size={18} className="input-icon" />
                          <select value={formData.employeeType} onChange={e => updateBase('employeeType', e.target.value)}>
                            <option value="ACADEMIC">{t('forms.academic', 'Academic / Teaching')}</option>
                            <option value="ADMINISTRATIVE">{t('forms.administrative', 'Administrative')}</option>
                            <option value="HR">{t('forms.hr', 'Human Resources')}</option>
                            <option value="OUTSOURCED">{t('forms.outsourced', 'Outsourced Contractor')}</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="premium-form-group">
                        <label>{t('forms.hireDate', 'Hire Date')} <span className="req">*</span></label>
                        <div className="premium-input-wrap">
                          <Calendar size={18} className="input-icon" />
                          <input 
                            type="date" 
                            value={formData.hireDate} 
                            onChange={e => updateBase('hireDate', e.target.value)} 
                            required 
                          />
                        </div>
                      </div>

                      <div className="premium-form-group">
                        <label>{t('forms.employmentType', 'Employment Type')} <span className="req">*</span></label>
                        <div className="premium-input-wrap select-wrap">
                          <Briefcase size={18} className="input-icon" />
                          <select value={formData.employmentType} onChange={e => updateBase('employmentType', e.target.value)}>
                            <option value="FULL_TIME">{t('forms.fullTime', 'Full Time')}</option>
                            <option value="PART_TIME">{t('forms.partTime', 'Part Time')}</option>
                            <option value="CONTRACT">{t('forms.contract', 'Contract')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="premium-form-group">
                        <label>{t('forms.status', 'Status')} <span className="req">*</span></label>
                        <div className="premium-input-wrap select-wrap">
                          <Info size={18} className="input-icon" />
                          <select value={formData.employmentStatus} onChange={e => updateBase('employmentStatus', e.target.value)}>
                            <option value="ACTIVE">{t('forms.active', 'Active')}</option>
                            <option value="ONLEAVE">{t('forms.onLeave', 'On Leave')}</option>
                            <option value="TERMINATED">{t('forms.terminated', 'Terminated')}</option>
                            <option value="RESIGNED">{t('forms.resigned', 'Resigned')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      {formData.employeeType === 'ACADEMIC' && (
                        <>
                          <div className="premium-form-group">
                            <label>Linked College <span className="req">*</span></label>
                            <div className="premium-input-wrap select-wrap">
                              <Building size={18} className="input-icon" />
                              <select value={formData.academic.collegeId} onChange={e => {
                                  updateNested('academic', 'collegeId', e.target.value);
                                  updateBase('departmentId', ''); 
                              }}>
                                <option value="">-- Select College --</option>
                                {colleges.map(c => <option key={c.id} value={c.id}>{c.collegeName}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="premium-form-group">
                            <label>Academic Department <span className="req">*</span></label>
                            <div className="premium-input-wrap select-wrap">
                              <Building size={18} className="input-icon" />
                              <select value={formData.departmentId} onChange={e => updateBase('departmentId', e.target.value)} disabled={!formData.academic.collegeId}>
                                <option value="">-- Select Department --</option>
                                {departments
                                  .filter(d => d.departmentType === 'ACADEMIC' && d.collegeId === formData.academic.collegeId)
                                  .map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {(formData.employeeType === 'ADMINISTRATIVE' || formData.employeeType === 'HR') && (
                        <div className="premium-form-group">
                            <label>Administrative Department <span className="req">*</span></label>
                            <div className="premium-input-wrap select-wrap">
                              <Building size={18} className="input-icon" />
                              <select value={formData.departmentId} onChange={e => updateBase('departmentId', e.target.value)}>
                                <option value="">-- Select Department --</option>
                                {departments
                                    .filter(d => d.departmentType === 'ADMINISTRATIVE')
                                    .map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                              </select>
                            </div>
                        </div>
                      )}

                      {formData.employeeType === 'OUTSOURCED' && (
                        <div className="premium-form-group">
                            <label>Vendor Company <span className="req">*</span></label>
                            <div className="premium-input-wrap select-wrap">
                              <Building size={18} className="input-icon" />
                              <select value={formData.outsource.outsourcingCompanyId} onChange={e => updateNested('outsource', 'outsourcingCompanyId', e.target.value)}>
                                <option value="">-- Select Vendor --</option>
                                {outsourceCompanies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                              </select>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: PERSONAL */}
            {currentStep === 1 && (
              <>
                <h3 className="premium-section-title">Identity & Contacts</h3>
                <div className="wizard-split-layout">
                  {/* Left Column */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      <div className="premium-form-group" style={{ display: 'flex', gap: '1rem' }}>
                        {i18n.language === 'en' && (
                          <div style={{ flex: 1 }}>
                            <label>First Name <span className="req">*</span></label>
                            <div className="premium-input-wrap">
                              <input 
                                type="text" 
                                value={formData.personal.firstName} 
                                onChange={e => updateNested('personal', 'firstName', e.target.value)} 
                                placeholder="English" required 
                              />
                            </div>
                          </div>
                        )}
                        
                        {i18n.language === 'am' && (
                          <div style={{ flex: 1 }}>
                            <label>ስም <span className="req">*</span></label>
                            <div className="premium-input-wrap">
                              <input 
                                type="text" 
                                value={formData.personal.firstNameAmharic} 
                                onChange={e => updateNested('personal', 'firstNameAmharic', e.target.value)} 
                                placeholder="Amharic" 
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="premium-form-group" style={{ display: 'flex', gap: '1rem' }}>
                        {i18n.language === 'en' && (
                          <div style={{ flex: 1 }}>
                            <label>Middle Name</label>
                            <div className="premium-input-wrap">
                              <input 
                                type="text" 
                                value={formData.personal.middleName} 
                                onChange={e => updateNested('personal', 'middleName', e.target.value)} 
                                placeholder="English" 
                              />
                            </div>
                          </div>
                        )}
                        {i18n.language === 'am' && (
                          <div style={{ flex: 1 }}>
                            <label>የአባት ስም</label>
                            <div className="premium-input-wrap">
                              <input 
                                type="text" 
                                value={formData.personal.middleNameAmharic} 
                                onChange={e => updateNested('personal', 'middleNameAmharic', e.target.value)} 
                                placeholder="Amharic" 
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="premium-form-group" style={{ display: 'flex', gap: '1rem' }}>
                        {i18n.language === 'en' && (
                          <div style={{ flex: 1 }}>
                            <label>Last Name <span className="req">*</span></label>
                            <div className="premium-input-wrap">
                              <input 
                                type="text" 
                                value={formData.personal.lastName} 
                                onChange={e => updateNested('personal', 'lastName', e.target.value)} 
                                placeholder="English" required 
                              />
                            </div>
                          </div>
                        )}
                        {i18n.language === 'am' && (
                          <div style={{ flex: 1 }}>
                            <label>የአያት ስም</label>
                            <div className="premium-input-wrap">
                              <input 
                                type="text" 
                                value={formData.personal.lastNameAmharic} 
                                onChange={e => updateNested('personal', 'lastNameAmharic', e.target.value)} 
                                placeholder="Amharic" 
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="premium-form-group">
                        <label>Gender <span className="req">*</span></label>
                        <div className="gender-toggle-group">
                          <button type="button" className={`gender-btn ${formData.personal.gender === 'MALE' ? 'active' : ''}`} onClick={() => updateNested('personal', 'gender', 'MALE')}>Male</button>
                          <button type="button" className={`gender-btn ${formData.personal.gender === 'FEMALE' ? 'active' : ''}`} onClick={() => updateNested('personal', 'gender', 'FEMALE')}>Female</button>
                        </div>
                      </div>

                      <div className="premium-form-group">
                        <label>Date of Birth <span className="req">*</span></label>
                        <div className="premium-input-wrap">
                          <Calendar size={18} className="input-icon" />
                          <input type="date" value={formData.personal.dateOfBirth} onChange={e => updateNested('personal', 'dateOfBirth', e.target.value)} required />
                        </div>
                      </div>

                      <div className="premium-form-group">
                        <label>Contact Number <span className="req">*</span></label>
                        <div className="premium-input-wrap">
                          <Phone size={18} className="input-icon" />
                          <input type="text" value={formData.personal.personalPhone} onChange={e => updateNested('personal', 'personalPhone', e.target.value)} placeholder="+251..." required />
                        </div>
                      </div>

                      <div className="premium-form-group">
                        <label>Personal Email</label>
                        <div className="premium-input-wrap">
                          <User size={18} className="input-icon" />
                          <input type="email" value={formData.personal.personalEmail} onChange={e => updateNested('personal', 'personalEmail', e.target.value)} placeholder="email@example.com" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      <h4 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Emergency Contact</h4>
                      {i18n.language === 'en' && (
                        <div className="premium-form-group">
                          <label>Emergency Contact Name</label>
                          <div className="premium-input-wrap">
                            <User size={18} className="input-icon" />
                            <input type="text" value={formData.personal.emergencyContactName} onChange={e => updateNested('personal', 'emergencyContactName', e.target.value)} placeholder="English" />
                          </div>
                        </div>
                      )}
                      {i18n.language === 'am' && (
                        <div className="premium-form-group">
                          <label>የተጠሪ ስም</label>
                          <div className="premium-input-wrap">
                            <User size={18} className="input-icon" />
                            <input type="text" value={formData.personal.emergencyContactNameAmharic} onChange={e => updateNested('personal', 'emergencyContactNameAmharic', e.target.value)} placeholder="Amharic" />
                          </div>
                        </div>
                      )}
                      <div className="premium-form-group">
                        <label>Emergency Contact Phone</label>
                        <div className="premium-input-wrap">
                          <Phone size={18} className="input-icon" />
                          <input type="text" value={formData.personal.emergencyContactPhone} onChange={e => updateNested('personal', 'emergencyContactPhone', e.target.value)} placeholder="+251..." />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: OFFICIAL & SPECIALIZATION */}
            {currentStep === 2 && (
              <>
                <h3 className="premium-section-title">Specialization & Details</h3>
                <div className="wizard-split-layout">
                  {/* Left Column */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      <div className="premium-form-group">
                        <label>Official Email</label>
                        <div className="premium-input-wrap">
                          <User size={18} className="input-icon" />
                          <input type="email" value={formData.employment.officialEmail} onChange={e => updateNested('employment', 'officialEmail', e.target.value)} placeholder="official@example.com" />
                        </div>
                      </div>
                      <div className="premium-form-group">
                        <label>Official Phone</label>
                        <div className="premium-input-wrap">
                          <Phone size={18} className="input-icon" />
                          <input type="text" value={formData.employment.officialPhone} onChange={e => updateNested('employment', 'officialPhone', e.target.value)} placeholder="+251..." />
                        </div>
                      </div>
                      <div className="premium-form-group">
                        <label>Base Salary (Monthly)</label>
                        <div className="premium-input-wrap">
                          <Briefcase size={18} className="input-icon" />
                          <input type="number" min="0" value={formData.employment.salary} onChange={e => updateNested('employment', 'salary', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      {formData.employeeType === 'ACADEMIC' && (
                        <>
                          {i18n.language === 'en' && (
                            <div className="premium-form-group">
                              <label>Academic Rank (English)</label>
                              <div className="premium-input-wrap">
                                <Briefcase size={18} className="input-icon" />
                                <input type="text" value={formData.academic.academicRank} onChange={e => updateNested('academic', 'academicRank', e.target.value)} placeholder="e.g. Professor" />
                              </div>
                            </div>
                          )}
                          {i18n.language === 'am' && (
                            <div className="premium-form-group">
                              <label>የአካዳሚክ ደረጃ</label>
                              <div className="premium-input-wrap">
                                <Briefcase size={18} className="input-icon" />
                                <input type="text" value={formData.academic.academicRankAmharic} onChange={e => updateNested('academic', 'academicRankAmharic', e.target.value)} placeholder="Amharic" />
                              </div>
                            </div>
                          )}
                          {i18n.language === 'en' && (
                            <div className="premium-form-group">
                              <label>Field of Specialization (English)</label>
                              <div className="premium-input-wrap">
                                <Info size={18} className="input-icon" />
                                <input type="text" value={formData.academic.fieldOfSpecialization} onChange={e => updateNested('academic', 'fieldOfSpecialization', e.target.value)} placeholder="e.g. Mathematics" />
                              </div>
                            </div>
                          )}
                          {i18n.language === 'am' && (
                            <div className="premium-form-group">
                              <label>የትምህርት መስክ</label>
                              <div className="premium-input-wrap">
                                <Info size={18} className="input-icon" />
                                <input type="text" value={formData.academic.fieldOfSpecializationAmharic} onChange={e => updateNested('academic', 'fieldOfSpecializationAmharic', e.target.value)} placeholder="Amharic" />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {formData.employeeType === 'HR' && (
                        <>
                          <div className="premium-form-group">
                            <label>HR Specialization</label>
                            <div className="premium-input-wrap select-wrap">
                              <Briefcase size={18} className="input-icon" />
                              <select value={formData.hr.hrSpecialization} onChange={e => updateNested('hr', 'hrSpecialization', e.target.value)}>
                                <option value="generalist">Generalist</option>
                                <option value="recruitment">Recruitment</option>
                                <option value="payroll">Payroll</option>
                                <option value="training">Training</option>
                              </select>
                            </div>
                          </div>
                          <div className="premium-form-group">
                            <label>Access Level</label>
                            <div className="premium-input-wrap select-wrap">
                              <Info size={18} className="input-icon" />
                              <select value={formData.hr.hrLevel} onChange={e => updateNested('hr', 'hrLevel', e.target.value)}>
                                <option value="officer">Officer</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="manager">Manager</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {formData.employeeType === 'OUTSOURCED' && (
                        <>
                          <div className="premium-form-group">
                            <label>Service Type <span className="req">*</span></label>
                            <div className="premium-input-wrap select-wrap">
                              <Briefcase size={18} className="input-icon" />
                              <select value={formData.outsource.serviceType} onChange={e => updateNested('outsource', 'serviceType', e.target.value)}>
                                <option value="SECURITY">Security</option>
                                <option value="CLEANING">Cleaning</option>
                                <option value="IT">IT Support</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>
                          </div>
                          <div className="premium-form-group">
                            <label>Contract End Date</label>
                            <div className="premium-input-wrap">
                              <Calendar size={18} className="input-icon" />
                              <input type="date" value={formData.outsource.contractEndDate} onChange={e => updateNested('outsource', 'contractEndDate', e.target.value)} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="premium-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                  <span>Education Records</span>
                  <button type="button" className="add-record-btn" onClick={addEducation}>
                    <Plus size={14} /> Add Record
                  </button>
                </div>
                
                {formData.education.length === 0 ? (
                  <p className="empty-text">No education records added. Optional.</p>
                ) : (
                  formData.education.map((ed, idx) => (
                    <div key={idx} className="premium-card array-item-card">
                       <button type="button" className="btn-remove-array" onClick={() => removeEducation(idx)}><Trash2 size={12} /></button>
                       <div className="wizard-split-layout" style={{ gap: '1rem' }}>
                         <div className="premium-form-group">
                           <label>{i18n.language === 'en' ? 'Institution Name' : 'የትምህርት ተቋም ስም'} <span className="req">*</span></label>
                           <div className="premium-input-wrap">
                              <Building size={18} className="input-icon" />
                              <input required value={i18n.language === 'en' ? ed.institutionName : ed.institutionNameAmharic} onChange={e => updateEducation(idx, i18n.language === 'en' ? 'institutionName' : 'institutionNameAmharic', e.target.value)} />
                           </div>
                         </div>
                         <div className="premium-form-group">
                           <label>Qualification <span className="req">*</span></label>
                           <div className="premium-input-wrap">
                              <Briefcase size={18} className="input-icon" />
                              <input required value={ed.qualification} onChange={e => updateEducation(idx, 'qualification', e.target.value)} placeholder="e.g. BSc Computer Science" />
                           </div>
                         </div>
                         <div className="premium-form-group">
                           <label>Start Date <span className="req">*</span></label>
                           <div className="premium-input-wrap">
                              <Calendar size={18} className="input-icon" />
                              <input type="date" required value={ed.startDate} onChange={e => updateEducation(idx, 'startDate', e.target.value)} />
                           </div>
                         </div>
                         <div className="premium-form-group">
                           <label>End Date</label>
                           <div className="premium-input-wrap">
                              <Calendar size={18} className="input-icon" />
                              <input type="date" value={ed.endDate} onChange={e => updateEducation(idx, 'endDate', e.target.value)} />
                           </div>
                         </div>
                       </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* STEP 4: DOCUMENTS */}
            {currentStep === 3 && (
              <>
                <h3 className="premium-section-title">Upload Documents</h3>
                <div className="wizard-split-layout">
                  {/* Left Column: Uploader */}
                  <div className="wizard-column">
                    <div className="premium-card document-upload-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                      <FileUp size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
                      <h4 style={{ marginBottom: '0.5rem' }}>Select Files to Attach</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Upload ID, certificates, resumes, and contracts.
                      </p>
                      
                      <label className="upload-btn-label" style={{ display: 'inline-block', padding: '0.8rem 1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '500' }}>
                        Browse Files
                        <input type="file" multiple onChange={handleDocumentChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>

                  {/* Right Column: File List */}
                  <div className="wizard-column">
                    <div className="premium-card">
                      <h4 style={{ marginBottom: '1rem' }}>Pending Documents ({formData.documents.length})</h4>
                      {formData.documents.length === 0 ? (
                        <p className="empty-text">No documents selected.</p>
                      ) : (
                        <div className="document-upload-section">
                          {formData.documents.map((doc, idx) => (
                            <div key={idx} className="document-item">
                              <div className="document-item-info">
                                <File size={16} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                  <input 
                                    className="document-item-title" 
                                    style={{ border: 'none', background: 'transparent', outline: 'none' }} 
                                    value={doc.documentName} 
                                    onChange={e => updateDocumentName(idx, e.target.value)} 
                                  />
                                  <select 
                                    className="document-item-type" 
                                    value={doc.documentType} 
                                    onChange={e => updateDocumentType(idx, e.target.value)}
                                    style={{ border: 'none', background: 'var(--border-color)', outline: 'none', cursor: 'pointer' }}
                                  >
                                    <option value="IDDOCUMENT">ID Document</option>
                                    <option value="EDUCATION">Education</option>
                                    <option value="CERTIFICATION">Certification</option>
                                    <option value="CONTRACT">Contract</option>
                                    <option value="OTHER">Other</option>
                                  </select>
                                </div>
                              </div>
                              <button type="button" className="btn-remove-doc" onClick={() => removeDocument(idx)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        <div className="premium-footer">
          <button 
            className="draft-btn" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button 
            className="next-step-btn" 
            onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : currentStep === steps.length - 1 ? (
              <>Register & Upload <ArrowRight size={16} /></>
            ) : (
              <>Next Step <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeWizard;
