import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Briefcase, GraduationCap, FileText, UploadCloud, Trash, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { employeeService } from '../../services/employeeService';
import './EmployeeProfile.css';

const EmployeeProfileModal = ({ employeeId, onClose }) => {
  const { i18n } = useTranslation();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // File Upload states
  const [isUploading, setIsUploading] = useState(false);

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true);
      const res = await employeeService.getEmployeeById(employeeId, ['company', 'college', 'department']);
      if (res.success) {
         setEmployee(res.data);
      } else {
         toast.error("Employee not found");
         onClose();
      }
    } catch (e) {
      toast.error("Failed to fetch profile");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchEmployeeData();
  }, [employeeId]);

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast.info("Uploading picture...");
      const res = await employeeService.uploadProfilePicture(employeeId, file);
      if (res.success) {
        toast.success("Profile picture updated!");
        fetchEmployeeData();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to upload picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In actual rigorous implementation, you'd prompt for DocumentType, Name etc.
    // For now we just construct a quick FormData payload based on implicit defaults
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentName', file.name);
    formData.append('documentType', 'OTHER');

    try {
      setIsUploading(true);
      toast.info("Uploading document...");
      const res = await employeeService.uploadSingleDocument(employeeId, formData);
      if (res.success) {
        toast.success("Document attached!");
        fetchEmployeeData();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Document upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return (
    <div className="employee-profile-overlay">
      <div className="employee-profile-modal profile-modal-centered">
         <div className="profile-loading">Loading Comprehensive Profile...</div>
      </div>
    </div>
  );
  
  if (!employee) return null;

  return (
    <div className="employee-profile-overlay" onClick={onClose}>
      <div className="employee-profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal-header">
           <h3>Employee Complete Record</h3>
           <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="wizard-body" style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          <div className="employee-profile-container">

      <div className="profile-hero-card">
        <div className="profile-avatar-section">
          <div className="avatar-wrapper-lg">
            <img 
               src={employee.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.firstName + ' ' + employee.lastName)}&background=0B8255&color=fff`} 
               alt="Profile" 
               onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.firstName + ' ' + employee.lastName)}&background=0B8255&color=fff` }}
            />
            {/* The hidden file input triggered by throwing the label over it */}
            <label className="avatar-upload-btn" title="Change Picture">
              <UploadCloud size={16} />
              <input type="file" accept="image/*" style={{ display: 'none'}} onChange={handleProfilePicUpload} disabled={isUploading} />
            </label>
          </div>
        </div>
        
        <div className="profile-hero-info">
           <h2>
             {i18n.language === 'am' && employee.firstNameAmharic 
               ? `${employee.firstNameAmharic} ${employee.middleNameAmharic || ''} ${employee.lastNameAmharic || ''}`.trim()
               : `${employee.firstName} ${employee.middleName || ''} ${employee.lastName || ''}`.trim()
             }
           </h2>
           <div className="hero-badges">
             <span className="badge badge-academic">{employee.employeeType || "STAFF"}</span>
             <span className={`badge ${employee.employmentStatus === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
               {employee.employmentStatus || 'ACTIVE'}
             </span>
           </div>
           <p className="hero-subtitle">{employee.departmentName || "No Linked Department"}</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* PERSONAL DETAILS CARD */}
        <div className="profile-info-card">
           <div className="card-lbl-header"><User size={18}/> Personal Information</div>
           <div className="card-data-grid">
             <div className="data-group">
               <label>Gender</label>
               <span>{employee.gender || 'Not Specified'}</span>
             </div>
             <div className="data-group">
               <label>Date of Birth</label>
               <span>{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
             </div>
             <div className="data-group">
               <label>Personal Phone</label>
               <span>{employee.personalPhone || 'N/A'}</span>
             </div>
             <div className="data-group">
               <label>Emergency Contact</label>
               <span>{employee.emergencyContactName || 'N/A'} ({employee.emergencyContactPhone || 'N/A'})</span>
             </div>
           </div>
        </div>

        {/* EMPLOYMENT DETAILS CARD */}
        <div className="profile-info-card">
           <div className="card-lbl-header"><Briefcase size={18}/> Employment Status</div>
           <div className="card-data-grid">
             <div className="data-group">
               <label>Hire Date</label>
               <span>{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</span>
             </div>
             <div className="data-group">
               <label>Contract Type</label>
               <span>{employee.employmentType || "FULL_TIME"}</span>
             </div>
             <div className="data-group">
               <label>Official Email</label>
               <span>{employee.officialEmail || 'N/A'}</span>
             </div>
             <div className="data-group">
               <label>Base Salary</label>
               <span>{employee.salary ? `$${employee.salary}` : 'Confidential'}</span>
             </div>
           </div>
        </div>

        {/* ACADEMIC / SPECIFIC DETAILS CARD */}
        {employee.employeeType === 'ACADEMIC' && (
          <div className="profile-info-card">
             <div className="card-lbl-header"><GraduationCap size={18}/> Academic Role</div>
             <div className="card-data-grid">
               <div className="data-group">
                 <label>College</label>
                 <span>{employee.collegeName || 'N/A'}</span>
               </div>
               <div className="data-group">
                 <label>Academic Rank</label>
                 <span>{employee.academicRank || 'Unspecified'}</span>
               </div>
               <div className="data-group">
                 <label>Specialization</label>
                 <span>{employee.fieldOfSpecialization || 'General'}</span>
               </div>
             </div>
          </div>
        )}

        {/* DOCUMENTS VAULT CARD */}
        <div className="profile-info-card full-span">
           <div className="card-lbl-header header-spread">
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><FileText size={18}/> Document Vault</div>
              
              <label className="btn-upload-doc">
                <UploadCloud size={16} /> Upload New
                <input type="file" style={{ display: 'none'}} onChange={handleDocumentUpload} disabled={isUploading} />
              </label>
           </div>
           
           <div className="document-list">
             {!employee.documents || employee.documents.length === 0 ? (
                <div className="empty-docs">No documents securely vaulted yet.</div>
             ) : (
                employee.documents.map((doc, i) => (
                  <div key={i} className="doc-item">
                    <FileText size={24} color="var(--primary-color)"/>
                    <div className="doc-info">
                       <strong>{doc.documentName || doc.fileName}</strong>
                       <span>{doc.documentType} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileModal;
