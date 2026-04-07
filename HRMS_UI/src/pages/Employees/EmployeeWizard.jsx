import React, { useState, useEffect } from 'react';
import { 
  X, ArrowRight, ChevronLeft, Plus, Trash2, 
  User, Calendar, Phone, Briefcase, Building, Info, FileUp, File, ZoomIn, ZoomOut
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

const EmployeeWizard = ({ onClose, onSuccess, editEmployeeId }) => {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(!!editEmployeeId);

  // File Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null,
    url: null,
    zoom: 1
  });

  const openPreview = (file) => {
    setPreviewModal({
      isOpen: true,
      file,
      url: URL.createObjectURL(file),
      zoom: 1
    });
  };

  const closePreview = () => {
    if (previewModal.url) URL.revokeObjectURL(previewModal.url);
    setPreviewModal({ isOpen: false, file: null, url: null, zoom: 1 });
  };

  // Lookups
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [outsourceCompanies, setOutsourceCompanies] = useState([]);
  const [adminHierarchy, setAdminHierarchy] = useState([]);
  const [adminChildrenOptions, setAdminChildrenOptions] = useState({});

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

  useEffect(() => {    // Initialize Lookups
    const loadLookups = async () => {
      try {
        const [deptRes, collRes, outsourceRes] = await Promise.all([
          departmentService.getAllDepartments(1, 100),
          collegeService.getAllColleges(1, 100),
          outsourceCompanyService.getAllCompanies(1, 100)
        ]);
        if (deptRes.success) setDepartments(deptRes.data);
        if (collRes.success) setColleges(collRes.data);
        if (outsourceRes.success) setOutsourceCompanies(outsourceRes.data);
      } catch (err) {}
    };

    const loadEditData = async () => {
       if (!editEmployeeId) return;
       try {
          const res = await employeeService.getEmployeeById(editEmployeeId);
          if (res.success && res.data) {
             const e = res.data;
             setFormData(prev => ({
                ...prev,
                employeeType: e.employeeType || 'ACADEMIC',
                departmentId: e.departmentId || '',
                hireDate: e.hireDate ? new Date(e.hireDate).toISOString().split('T')[0] : prev.hireDate,
                employmentType: e.employmentType || 'FULL_TIME',
                employmentStatus: e.employmentStatus || 'ACTIVE',
                personal: {
                  firstName: e.firstName || '',
                  firstNameAmharic: e.firstNameAmharic || '',
                  middleName: e.middleName || '',
                  middleNameAmharic: e.middleNameAmharic || '',
                  lastName: e.lastName || '',
                  lastNameAmharic: e.lastNameAmharic || '',
                  gender: e.gender || 'MALE',
                  dateOfBirth: e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().split('T')[0] : '',
                  personalEmail: e.personalEmail || '',
                  personalPhone: e.personalPhone || '',
                  emergencyContactName: e.emergencyContactName || '',
                  emergencyContactNameAmharic: e.emergencyContactNameAmharic || '',
                  emergencyContactPhone: e.emergencyContactPhone || ''
                },
                employment: {
                  officialEmail: e.officialEmail || '',
                  officialPhone: e.officialPhone || '',
                  salary: e.salary || '',
                  qualification: e.qualification || '',
                  qualificationAmharic: e.qualificationAmharic || ''
                }
             }));
          }
       } catch (err) {
          toast.error("Failed to load employee details for editing.");
       } finally {
          setIsEditLoading(false);
       }
    };

    loadLookups();
    if (editEmployeeId) loadEditData();
  }, [editEmployeeId]);

  const updateBase = (field, value) => {
    if (field === 'employeeType') {
      setAdminHierarchy([]);
    }
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addDocument = () => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, { 
        documentType: 'OTHER', 
        documentName: '', 
        documentNameAmharic: '', 
        issueDate: '', 
        issuingAuthority: '', 
        description: '', 
        file: null 
      }]
    }));
  };

  const updateDocumentField = (idx, field, value) => {
    const newDocs = [...formData.documents];
    newDocs[idx][field] = value;
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const updateDocumentFile = (idx, file) => {
    const newDocs = [...formData.documents];
    newDocs[idx].file = file;
    if (!newDocs[idx].documentName && file) {
      newDocs[idx].documentName = file.name.split('.')[0];
    }
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const removeDocument = (idx) => {
    const newDocs = [...formData.documents];
    newDocs.splice(idx, 1);
    setFormData(prev => ({ ...prev, documents: newDocs }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { 
        institutionName: '', institutionNameAmharic: '', qualification: '', qualificationAmharic: '',
        fieldOfStudy: '', fieldOfStudyAmharic: '', grade: '',
        startDate: '', endDate: '', graduationDate: '', 
        description: '', descriptionAmharic: ''
      }]
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
      if (payload.employeeType !== 'ADMINISTRATIVE') delete payload.hr;
      if (payload.employeeType !== 'OUTSOURCE') delete payload.outsource;

      if (payload.education.length === 0) {
        delete payload.education;
      }
      
      const documentsToUpload = payload.documents;
      delete payload.documents;
      
      const submitPayload = { 
        ...payload,
        personal: { ...payload.personal },
        employment: { ...payload.employment }
      };
      if (submitPayload.academic) submitPayload.academic = { ...submitPayload.academic };
      
      // Ensure language sync
      if (i18n.language === 'am') {
        submitPayload.personal.firstName = submitPayload.personal.firstName || submitPayload.personal.firstNameAmharic;
        submitPayload.personal.middleName = submitPayload.personal.middleName || submitPayload.personal.middleNameAmharic;
        submitPayload.personal.lastName = submitPayload.personal.lastName || submitPayload.personal.lastNameAmharic;
        submitPayload.personal.emergencyContactName = submitPayload.personal.emergencyContactName || submitPayload.personal.emergencyContactNameAmharic;
        submitPayload.employment.qualification = submitPayload.employment.qualification || submitPayload.employment.qualificationAmharic;
        if (submitPayload.academic) {
          submitPayload.academic.academicRank = submitPayload.academic.academicRank || submitPayload.academic.academicRankAmharic;
          submitPayload.academic.fieldOfSpecialization = submitPayload.academic.fieldOfSpecialization || submitPayload.academic.fieldOfSpecializationAmharic;
        }
      } else {
        submitPayload.personal.firstNameAmharic = submitPayload.personal.firstNameAmharic || submitPayload.personal.firstName;
        submitPayload.personal.middleNameAmharic = submitPayload.personal.middleNameAmharic || submitPayload.personal.middleName;
        submitPayload.personal.lastNameAmharic = submitPayload.personal.lastNameAmharic || submitPayload.personal.lastName;
        submitPayload.personal.emergencyContactNameAmharic = submitPayload.personal.emergencyContactNameAmharic || submitPayload.personal.emergencyContactName;
        submitPayload.employment.qualificationAmharic = submitPayload.employment.qualificationAmharic || submitPayload.employment.qualification;
        if (submitPayload.academic) {
          submitPayload.academic.academicRankAmharic = submitPayload.academic.academicRankAmharic || submitPayload.academic.academicRank;
          submitPayload.academic.fieldOfSpecializationAmharic = submitPayload.academic.fieldOfSpecializationAmharic || submitPayload.academic.fieldOfSpecialization;
        }
      }
      
      // Map UI values to strictly match Database ENUMs
      if (submitPayload.employmentType === 'FULL_TIME') {
        submitPayload.employmentType = 'FULLTIME';
      } else if (submitPayload.employmentType === 'PART_TIME') {
        submitPayload.employmentType = 'PARTTIME';
      }

      const res = editEmployeeId 
          ? await employeeService.updateEmployee(editEmployeeId, submitPayload)
          : await employeeService.createEmployee(submitPayload);
          
      if (res.success) {
         const newEmployeeId = editEmployeeId || res.data.id;
         
         if (documentsToUpload && documentsToUpload.length > 0 && !editEmployeeId) {
            toast.info(`Employee created. Uploading ${documentsToUpload.length} documents...`);
            for (const docObj of documentsToUpload) {
               const docFormData = new FormData();
               docFormData.append('document', docObj.file);
               docFormData.append('documentType', docObj.documentType);
               docFormData.append('documentName', docObj.documentName);
               const docRes = await employeeService.uploadSingleDocument(newEmployeeId, docFormData);
               if (!docRes.success) {
                 console.error("Doc upload failed", docRes.message);
                 toast.warn(`Failed to upload document: ${docObj.documentName}`);
               }
            }
         }
         
         toast.success(`Employee ${editEmployeeId ? 'Updated' : 'Registration'} completed successfully!`);
         onSuccess();
      } else {
         const errs = res.details;
         if (Array.isArray(errs)) {
            errs.forEach(err => toast.error(`${err.field}: ${err.message}`));
         } else if (res.message) {
            toast.error(res.message);
         } else {
            toast.error(res.error || "Failed to create employee");
         }
      }
    } catch (e) {
      toast.error("An unexpected error occurred processing your submission.");
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
            <span className="header-title">{t('wizard.title', editEmployeeId ? 'Edit Employee' : 'Registration')}</span>
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
                            <option value="ACADEMIC">{t('forms.academic', 'Academic')}</option>
                            <option value="ADMINISTRATIVE">{t('forms.administrative', 'Administrative')}</option>
                            <option value="OUTSOURCE">{t('forms.outsourced', 'Outsource')}</option>
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

                      {formData.employeeType === 'ADMINISTRATIVE' && (() => {
                        const selects = [];
                        let currentParentId = null;

                        for (let i = 0; i <= adminHierarchy.length; i++) {
                          let availableOptions = [];
                          
                          if (currentParentId === null) {
                            // Root level: use preloaded departments
                            availableOptions = departments.filter(d => 
                               d.departmentType === 'ADMINISTRATIVE' && !d.parentDepartmentId
                            );
                          } else {
                            // Child levels: use fetched options from API
                            availableOptions = adminChildrenOptions[currentParentId];
                          }

                          // If options are not loaded yet or empty, break out
                          if (!availableOptions || availableOptions.length === 0) break;

                          const selectedValue = adminHierarchy[i] || '';

                          selects.push(
                            <div className="premium-form-group" key={`admin_dept_${i}`}>
                                <label>{t('forms.administrativeDepartment', 'Administrative Department')} (Level {i + 1}) {i === 0 && <span className="req">*</span>}</label>
                                <div className="premium-input-wrap select-wrap">
                                  <Building size={18} className="input-icon" />
                                  <select value={selectedValue} onChange={async (e) => {
                                      const val = e.target.value;
                                      const newHierarchy = adminHierarchy.slice(0, i);
                                      if (val) {
                                          newHierarchy.push(val);
                                          updateBase('departmentId', val);
                                          
                                          // Fetch child departments via API
                                          try {
                                              if (!adminChildrenOptions[val]) {
                                                  const res = await departmentService.getDepartmentsByParent(val);
                                                  if (res && res.success) {
                                                      setAdminChildrenOptions(prev => ({ ...prev, [val]: res.data }));
                                                  }
                                              }
                                          } catch (err) {
                                              console.error("Failed to fetch sub-departments", err);
                                          }
                                      } else {
                                          updateBase('departmentId', i > 0 ? newHierarchy[i-1] : '');
                                      }
                                      setAdminHierarchy(newHierarchy);
                                  }}>
                                    <option value="">-- {t('forms.selectDepartment', 'Select Department')} --</option>
                                    {availableOptions.map(d => (
                                      <option key={d.id} value={d.id}>
                                        {i18n.language === 'am' && d.departmentNameAmharic ? d.departmentNameAmharic : d.departmentName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                            </div>
                          );

                          if (!selectedValue) break;
                          currentParentId = selectedValue;
                        }

                        return selects;
                      })()}

                      {formData.employeeType === 'OUTSOURCE' && (
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
                  {/* Left Column - Specialization */}
                  {formData.employeeType !== 'ADMINISTRATIVE' && (
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

                        {/* Previously HR Specialization block, now ignored or could be keyed differently, currently inactive. */}
                        {formData.employeeType === 'HR_OBSOLETE' && (
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

                        {formData.employeeType === 'OUTSOURCE' && (
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
                  )}

                  {/* Right Column - Official Data */}
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
                        <div className="wizard-split-layout" style={{ gap: '1rem', marginTop: '1rem' }}>
                          <div className="premium-form-group">
                            <label>Field of Study <span className="req">*</span></label>
                            <div className="premium-input-wrap">
                               <Building size={18} className="input-icon" />
                               <input required value={i18n.language === 'en' ? ed.fieldOfStudy : ed.fieldOfStudyAmharic} onChange={e => updateEducation(idx, i18n.language === 'en' ? 'fieldOfStudy' : 'fieldOfStudyAmharic', e.target.value)} placeholder="e.g. Computer Science" />
                            </div>
                          </div>
                          <div className="premium-form-group">
                            <label>Grade / GPA</label>
                            <div className="premium-input-wrap">
                               <Info size={18} className="input-icon" />
                               <input value={ed.grade} onChange={e => updateEducation(idx, 'grade', e.target.value)} placeholder="e.g. 3.8 / Great Distinction" />
                            </div>
                          </div>
                          <div className="premium-form-group">
                            <label>Graduation Date</label>
                            <div className="premium-input-wrap">
                               <Calendar size={18} className="input-icon" />
                               <input type="date" value={ed.graduationDate} onChange={e => updateEducation(idx, 'graduationDate', e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="premium-form-group" style={{ marginTop: '1rem' }}>
                          <label>Description</label>
                          <div className="premium-input-wrap">
                             <Info size={18} className="input-icon" />
                             <input value={i18n.language === 'en' ? ed.description : ed.descriptionAmharic} onChange={e => updateEducation(idx, i18n.language === 'en' ? 'description' : 'descriptionAmharic', e.target.value)} placeholder="Any special honors or details" />
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
                <div className="premium-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Upload Documents</span>
                  <button type="button" className="add-record-btn" onClick={addDocument}>
                    <Plus size={14} /> Add Document
                  </button>
                </div>
                
                {formData.documents.length === 0 ? (
                  <div className="premium-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileUp size={48} color="var(--border-color)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h4 style={{ color: 'var(--text-secondary)' }}>No documents added yet</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click "Add Document" to begin uploading required files like ID, Certificates, and Contracts.</p>
                  </div>
                ) : (
                  formData.documents.map((doc, idx) => (
                    <div key={idx} className="premium-card array-item-card">
                       <button type="button" className="btn-remove-array" onClick={() => removeDocument(idx)}><Trash2 size={12} /></button>
                       <div className="wizard-split-layout" style={{ gap: '1.5rem', gridTemplateColumns: '1.5fr 1fr' }}>
                         <div className="document-metadata">
                           <div className="premium-form-group" style={{ marginBottom: '1rem' }}>
                             <label>Document Type <span className="req">*</span></label>
                             <div className="premium-input-wrap select-wrap">
                               <File size={18} className="input-icon" />
                               <select value={doc.documentType} onChange={e => updateDocumentField(idx, 'documentType', e.target.value)}>
                                 <option value="IDDOCUMENT">ID Document</option>
                                 <option value="EDUCATION">Education Certificate</option>
                                 <option value="CERTIFICATION">Professional Certification</option>
                                 <option value="CONTRACT">Contract</option>
                                 <option value="OTHER">Other</option>
                               </select>
                             </div>
                           </div>
                           <div className="premium-form-group" style={{ marginBottom: '1rem' }}>
                             <label>Document Name <span className="req">*</span></label>
                             <div className="premium-input-wrap">
                               <Info size={18} className="input-icon" />
                               <input required value={doc.documentName} onChange={e => updateDocumentField(idx, 'documentName', e.target.value)} placeholder="e.g. Master's Degree Certificate" />
                             </div>
                           </div>
                           <div className="wizard-split-layout" style={{ gap: '1rem', marginTop: '1rem' }}>
                             <div className="premium-form-group">
                               <label>Issue Date</label>
                               <div className="premium-input-wrap">
                                 <Calendar size={18} className="input-icon" />
                                 <input type="date" value={doc.issueDate} onChange={e => updateDocumentField(idx, 'issueDate', e.target.value)} />
                               </div>
                             </div>
                             <div className="premium-form-group">
                               <label>Issuing Authority</label>
                               <div className="premium-input-wrap">
                                 <Building size={18} className="input-icon" />
                                 <input type="text" value={doc.issuingAuthority} onChange={e => updateDocumentField(idx, 'issuingAuthority', e.target.value)} placeholder="e.g. Addis Ababa University" />
                               </div>
                             </div>
                           </div>
                         </div>
                         <div className="document-uploader" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                           <div className="premium-dashboard-file-upload" style={{ flex: 1, minHeight: '180px' }}>
                             <div className="upload-icon"><FileUp size={32} /></div>
                             <div className="upload-text">Upload a File</div>
                             <div className="upload-subtext">Max size: 5MB</div>
                             
                             {doc.file && (
                                <div className="file-preview-meta">
                                   <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }} 
                                         onClick={(e) => { e.stopPropagation(); openPreview(doc.file); }}>
                                     <File size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> 
                                     {doc.file.name}
                                   </span>
                                   <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{formatFileSize(doc.file.size)}</span>
                                </div>
                             )}

                             <input type="file" onChange={(e) => {
                               const file = e.target.files[0];
                               if (file) updateDocumentFile(idx, file);
                             }} />
                           </div>
                         </div>
                       </div>
                    </div>
                  ))
                )}
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

      {previewModal.isOpen && previewModal.file && (
        <div className="premium-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={closePreview}>
          <div className="preview-modal-toolbar" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '1rem' }}>
             <button onClick={() => setPreviewModal(p => ({ ...p, zoom: p.zoom + 0.25 }))} style={{ background: '#333', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ZoomIn size={16} /> Zoom In</button>
             <button onClick={() => setPreviewModal(p => ({ ...p, zoom: Math.max(0.25, p.zoom - 0.25) }))} style={{ background: '#333', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ZoomOut size={16} /> Zoom Out</button>
             <button onClick={closePreview} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><X size={16} /> Close</button>
          </div>
          
          <div className="preview-modal-content" onClick={e => e.stopPropagation()} style={{ width: '80%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto', marginTop: '5%' }}>
             {previewModal.file.type.startsWith('image/') ? (
                 <img src={previewModal.url} style={{ transform: `scale(${previewModal.zoom})`, transition: 'transform 0.2s', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Preview" />
             ) : previewModal.file.type === 'application/pdf' ? (
                 <iframe src={previewModal.url} style={{ width: '100%', height: '100%', border: 'none', transform: `scale(${previewModal.zoom})`, transition: 'transform 0.2s' }} title="PDF Preview" />
             ) : (
                 <div style={{ color: 'white', fontSize: '1.1rem', textAlign: 'center' }}>
                    <File size={64} color="gray" style={{ display: 'block', margin: '0 auto 1rem' }} />
                    <p>Preview not supported for this file type.</p>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeWizard;
