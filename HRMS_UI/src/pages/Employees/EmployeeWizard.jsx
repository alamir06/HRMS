import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Stepper from '../../components/common/Stepper';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import { collegeService } from '../../services/collegeService';
import { outsourceCompanyService } from '../../services/outsourceCompanyService';
import './EmployeeWizard.css';

const steps = [
  { title: "Personal Details", subtitle: "Core Identity" },
  { title: "Employment", subtitle: "Role & Department" },
  { title: "Specialization", subtitle: "Specific Fields" },
  { title: "Education", subtitle: "Academic History" }
];

const EmployeeWizard = ({ onClose, onSuccess }) => {
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
      lastName: '',
      gender: 'MALE',
      dateOfBirth: '',
      personalEmail: '',
      personalPhone: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    },
    employment: {
      officialEmail: '',
      officialPhone: '',
      salary: '',
      qualification: ''
    },
    academic: {
      collegeId: '',
      academicRank: '',
      academicStatus: 'ACTIVE',
      fieldOfSpecialization: ''
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
    education: []
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

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Cleanup payload matching Zod demands based on EmployeeType
      const payload = { ...formData };
      
      // Remove empty optional relational fields
      if (!payload.departmentId) delete payload.departmentId;
      
      // Cast salary to number
      if (payload.employment.salary) {
        payload.employment.salary = Number(payload.employment.salary);
      } else {
         delete payload.employment.salary;
      }
      
      // Nullify empty dates in personal
      if (!payload.personal.dateOfBirth) delete payload.personal.dateOfBirth;

      // Clean specialized modules
      if (payload.employeeType !== 'ACADEMIC') delete payload.academic;
      if (payload.employeeType !== 'HR') delete payload.hr;
      if (payload.employeeType !== 'OUTSOURCED') delete payload.outsource;

      // Clean education if empty
      if (payload.education.length === 0) {
        delete payload.education;
      }

      // Add Company ID? The middleware 'ensureDefaultCompanyIdInBody' handles this automatically!
      
      const res = await employeeService.createEmployee(payload);
      if (res.success) {
         toast.success("Employee created successfully!");
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

  // Array Handlers
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { institutionName: '', qualification: '', startDate: '', endDate: '' }]
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

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-modal" onClick={e => e.stopPropagation()}>
        <div className="wizard-header">
          <h3>Register New Employee</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <Stepper steps={steps} currentStep={currentStep} />

        <div className="wizard-body">
          {/* STEP 1: PERSONAL */}
          {currentStep === 0 && (
            <div className="wizard-form-grid">
              <div className="wizard-section-title">Identity Information</div>
              <label className="form-group-wiz">
                <span>First Name <span className="req">*</span></span>
                <input value={formData.personal.firstName} onChange={e => updateNested('personal', 'firstName', e.target.value)} required />
              </label>
              <label className="form-group-wiz">
                <span>Last Name <span className="req">*</span></span>
                <input value={formData.personal.lastName} onChange={e => updateNested('personal', 'lastName', e.target.value)} required />
              </label>
              <label className="form-group-wiz">
                <span>Date of Birth</span>
                <input type="date" value={formData.personal.dateOfBirth} onChange={e => updateNested('personal', 'dateOfBirth', e.target.value)} />
              </label>
              <label className="form-group-wiz">
                <span>Gender</span>
                <select value={formData.personal.gender} onChange={e => updateNested('personal', 'gender', e.target.value)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </label>

              <div className="wizard-section-title">Contact & Emergency</div>
              <label className="form-group-wiz">
                <span>Personal Email</span>
                <input type="email" value={formData.personal.personalEmail} onChange={e => updateNested('personal', 'personalEmail', e.target.value)} />
              </label>
              <label className="form-group-wiz">
                <span>Personal Phone</span>
                <input type="text" value={formData.personal.personalPhone} onChange={e => updateNested('personal', 'personalPhone', e.target.value)} />
              </label>
              <label className="form-group-wiz">
                <span>Emergency Contact Name</span>
                <input type="text" value={formData.personal.emergencyContactName} onChange={e => updateNested('personal', 'emergencyContactName', e.target.value)} />
              </label>
              <label className="form-group-wiz">
                <span>Emergency Contact Phone</span>
                <input type="text" value={formData.personal.emergencyContactPhone} onChange={e => updateNested('personal', 'emergencyContactPhone', e.target.value)} />
              </label>
            </div>
          )}

          {/* STEP 2: EMPLOYMENT */}
          {currentStep === 1 && (
            <div className="wizard-form-grid">
              <div className="wizard-section-title">Core Role Details</div>
              <label className="form-group-wiz">
                <span>Employee Category <span className="req">*</span></span>
                <select value={formData.employeeType} onChange={e => updateBase('employeeType', e.target.value)}>
                  <option value="ACADEMIC">Academic / Teaching</option>
                  <option value="ADMINISTRATIVE">Administrative</option>
                  <option value="HR">Human Resources</option>
                  <option value="OUTSOURCED">Outsourced Contractor</option>
                </select>
              </label>
              <label className="form-group-wiz">
                <span>Hire Date <span className="req">*</span></span>
                <input type="date" value={formData.hireDate} onChange={e => updateBase('hireDate', e.target.value)} required />
              </label>
              <label className="form-group-wiz">
                <span>Employment Type <span className="req">*</span></span>
                <select value={formData.employmentType} onChange={e => updateBase('employmentType', e.target.value)}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </label>
              <label className="form-group-wiz">
                <span>Status <span className="req">*</span></span>
                <select value={formData.employmentStatus} onChange={e => updateBase('employmentStatus', e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>

              <div className="wizard-section-title">Organizational Mapping</div>
              
              {formData.employeeType === 'ACADEMIC' && (
                 <>
                    <label className="form-group-wiz">
                      <span>Linked College <span className="req">*</span></span>
                      <select value={formData.academic.collegeId} onChange={e => {
                          updateNested('academic', 'collegeId', e.target.value);
                          updateBase('departmentId', ''); // Reset dept
                      }}>
                        <option value="">-- Select College --</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.collegeName}</option>)}
                      </select>
                    </label>
                    
                    <label className="form-group-wiz">
                      <span>Academic Department <span className="req">*</span></span>
                      <select value={formData.departmentId} onChange={e => updateBase('departmentId', e.target.value)} disabled={!formData.academic.collegeId}>
                        <option value="">-- Select Department --</option>
                        {departments
                           .filter(d => d.departmentType === 'ACADEMIC' && d.collegeId === formData.academic.collegeId)
                           .map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                      </select>
                    </label>
                 </>
              )}

              {(formData.employeeType === 'ADMINISTRATIVE' || formData.employeeType === 'HR') && (
                 <label className="form-group-wiz">
                    <span>Administrative Department <span className="req">*</span></span>
                    <select value={formData.departmentId} onChange={e => updateBase('departmentId', e.target.value)}>
                      <option value="">-- Select Department --</option>
                      {departments
                         .filter(d => d.departmentType === 'ADMINISTRATIVE')
                         .map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                    </select>
                  </label>
              )}

              {formData.employeeType === 'OUTSOURCED' && (
                 <label className="form-group-wiz">
                    <span>Vendor Company <span className="req">*</span></span>
                    <select value={formData.outsource.outsourcingCompanyId} onChange={e => updateNested('outsource', 'outsourcingCompanyId', e.target.value)}>
                      <option value="">-- Select Vendor --</option>
                      {outsourceCompanies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                  </label>
              )}
              <label className="form-group-wiz">
                <span>Official Email</span>
                <input type="email" value={formData.employment.officialEmail} onChange={e => updateNested('employment', 'officialEmail', e.target.value)} />
              </label>
              <label className="form-group-wiz">
                <span>Base Salary (Monthly)</span>
                <input type="number" min="0" value={formData.employment.salary} onChange={e => updateNested('employment', 'salary', e.target.value)} />
              </label>
            </div>
          )}

          {/* STEP 3: SPECIALIZATION */}
          {currentStep === 2 && (
            <div className="wizard-form-grid">
              
              {formData.employeeType === 'ACADEMIC' && (
                <>
                  <div className="wizard-section-title">Academic Qualifications</div>
                  <label className="form-group-wiz">
                    <span>Academic Rank</span>
                    <input type="text" value={formData.academic.academicRank} onChange={e => updateNested('academic', 'academicRank', e.target.value)} placeholder="e.g. Professor, Assistant Lecturer" />
                  </label>
                  <label className="form-group-wiz">
                    <span>Field of Specialization</span>
                    <input type="text" value={formData.academic.fieldOfSpecialization} onChange={e => updateNested('academic', 'fieldOfSpecialization', e.target.value)} />
                  </label>
                </>
              )}

              {formData.employeeType === 'HR' && (
                <>
                  <div className="wizard-section-title">HR Clearances</div>
                  <label className="form-group-wiz">
                    <span>HR Specialization</span>
                    <select value={formData.hr.hrSpecialization} onChange={e => updateNested('hr', 'hrSpecialization', e.target.value)}>
                      <option value="generalist">Generalist</option>
                      <option value="recruitment">Recruitment</option>
                      <option value="payroll">Payroll</option>
                      <option value="training">Training</option>
                    </select>
                  </label>
                  <label className="form-group-wiz">
                    <span>Access Level</span>
                    <select value={formData.hr.hrLevel} onChange={e => updateNested('hr', 'hrLevel', e.target.value)}>
                      <option value="officer">Officer</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="manager">Manager</option>
                    </select>
                  </label>
                </>
              )}

              {formData.employeeType === 'OUTSOURCED' && (
                <>
                  <div className="wizard-section-title">Outsource Details</div>
                  <label className="form-group-wiz">
                    <span>Service Type <span className="req">*</span></span>
                    <select value={formData.outsource.serviceType} onChange={e => updateNested('outsource', 'serviceType', e.target.value)}>
                      <option value="SECURITY">Security</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="IT">IT Support</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="form-group-wiz">
                    <span>Contract End Date</span>
                    <input type="date" value={formData.outsource.contractEndDate} onChange={e => updateNested('outsource', 'contractEndDate', e.target.value)} />
                  </label>
                </>
              )}

              {formData.employeeType === 'ADMINISTRATIVE' && (
                <div className="full-width" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No specialized fields required for Administrative staff. Use the next button.
                </div>
              )}

            </div>
          )}

          {/* STEP 4: EDUCATION */}
          {currentStep === 3 && (
            <div className="wizard-form-grid" style={{ display: 'block' }}>
              <div className="wizard-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Education Records</span>
                <button type="button" className="btn-add-employee" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={addEducation}>
                  <Plus size={14} /> Add Record
                </button>
              </div>

              {formData.education.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No education records added. Optional.</p>
              ) : (
                formData.education.map((ed, idx) => (
                  <div key={idx} className="array-item-card wizard-form-grid" style={{ position: 'relative' }}>
                     <button type="button" className="btn-remove-array" onClick={() => removeEducation(idx)}><Trash2 size={12} /></button>
                     <label className="form-group-wiz">
                       <span>Institution Name <span className="req">*</span></span>
                       <input required value={ed.institutionName} onChange={e => updateEducation(idx, 'institutionName', e.target.value)} />
                     </label>
                     <label className="form-group-wiz">
                       <span>Qualification <span className="req">*</span></span>
                       <input required value={ed.qualification} onChange={e => updateEducation(idx, 'qualification', e.target.value)} placeholder="e.g. BSc Computer Science" />
                     </label>
                     <label className="form-group-wiz">
                       <span>Start Date <span className="req">*</span></span>
                       <input type="date" required value={ed.startDate} onChange={e => updateEducation(idx, 'startDate', e.target.value)} />
                     </label>
                     <label className="form-group-wiz">
                       <span>End / Graduation Date</span>
                       <input type="date" value={ed.endDate} onChange={e => updateEducation(idx, 'endDate', e.target.value)} />
                     </label>
                  </div>
                ))
              )}
              
              <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>Note:</strong> File attachments (profile pictures, scanned certificates, and documents) can be uploaded directly from the Employee Details screen <strong>after</strong> this core profile is created.
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <button 
            className="btn-wizard-nav btn-wizard-prev" 
            onClick={currentStep === 0 ? onClose : handlePrev}
            disabled={isSubmitting}
          >
            {currentStep === 0 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
          </button>
          
          <button 
            className="btn-wizard-nav btn-wizard-next" 
            onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : currentStep === steps.length - 1 ? 'Complete Registration' : <>Next <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeWizard;
