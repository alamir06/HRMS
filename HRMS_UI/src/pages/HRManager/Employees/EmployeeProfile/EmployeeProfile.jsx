import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Briefcase, GraduationCap, FileText, UploadCloud, Trash, X, Camera } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { employeeService } from '../../../../services/employeeService';
import { formatEthiopianDate } from '../../../../utils/dateTime';
import './EmployeeProfile.css';

const EmployeeProfileModal = ({ employeeId, onClose }) => {
  const { i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [viewDocModal, setViewDocModal] = useState(null);
  const fileInputRef = useRef(null);

  const displayEthDate = (ethValue, gregValue) => {
    if (ethValue) return ethValue;
    return formatEthiopianDate(gregValue);
  };

  const getLocalizedText = (enValue, amValue) => {
    if (isAmharic && amValue) return amValue;
    return enValue || amValue || '';
  };

  const getEmployeeDisplayName = (emp) => {
    const enName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
    const amName = `${emp.firstNameAmharic || ''} ${emp.middleNameAmharic || ''} ${emp.lastNameAmharic || ''}`.trim();
    return getLocalizedText(enName, amName) || (isAmharic ? 'ሰራተኛ' : 'Employee');
  };

  const getEmployeeTypeLabel = (value) => {
    const map = {
      ACADEMIC: { en: 'ACADEMIC', am: 'አካዳሚክ' },
      ADMINISTRATIVE: { en: 'ADMINISTRATIVE', am: 'አስተዳደራዊ' },
      OUTSOURCE: { en: 'OUTSOURCE', am: 'ውጭ' },
    };
    if (!value) return 'N/A';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  const getEmploymentTypeLabel = (value) => {
    const map = {
      FULLTIME: { en: 'FULLTIME', am: 'ሙሉ ጊዜ' },
      FULL_TIME: { en: 'FULLTIME', am: 'ሙሉ ጊዜ' },
      PARTTIME: { en: 'PARTTIME', am: 'ተከፋፈል ጊዜ' },
      CONTRACT: { en: 'CONTRACT', am: 'ውል' },
      INTERN: { en: 'INTERN', am: 'ስልጠና' },
    };
    if (!value) return 'N/A';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  const getEmploymentStatusLabel = (value) => {
    const map = {
      ACTIVE: { en: 'ACTIVE', am: 'ገባሪ' },
      ONLEAVE: { en: 'ON LEAVE', am: 'በፈቃድ' },
      TERMINATED: { en: 'TERMINATED', am: 'ተቋርጧል' },
      RESIGNED: { en: 'RESIGNED', am: 'ተቋርጧል' },
      INACTIVE: { en: 'INACTIVE', am: 'የማይሰራ' },
    };
    if (!value) return 'N/A';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  const getGenderLabel = (value) => {
    const map = {
      MALE: { en: 'Male', am: 'ወንድ' },
      FEMALE: { en: 'Female', am: 'ሴት' },
      OTHER: { en: 'Other', am: 'ሌላ' },
    };
    if (!value) return isAmharic ? 'አልተገለጸም' : 'Not Specified';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  const storedUser = localStorage.getItem('user');
  let loggedUserId = null;
  let loggedUserRole = null;
  try {
    if (storedUser) {
      const u = JSON.parse(storedUser);
      loggedUserId = u.employeeId;
      loggedUserRole = u.role;
    }
  } catch(e) {}
  
  const isMe = employeeId === loggedUserId;
  const isHr = loggedUserRole === 'HRMANAGER' || loggedUserRole === 'SUPERADMIN' || loggedUserRole === 'ADMIN';

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true);
      const res = await employeeService.getEmployeeById(employeeId, ['company', 'college', 'department']);
      if (res.success) {
         let empData = res.data;
         
         // Fetch documents explicitly
         try {
           const docsRes = await employeeService.getDocuments(employeeId);
           if (docsRes.success || Array.isArray(docsRes.data)) {
             empData.documents = docsRes.data || (Array.isArray(docsRes) ? docsRes : []);
           }
         } catch (docErr) {
           console.error("Failed to fetch documents", docErr);
           empData.documents = [];
         }

         setEmployee(empData);
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
      setIsUploadingPic(true);
      const res = await employeeService.uploadProfilePicture(employeeId, file);
      if (res.success) {
        toast.success("Profile picture updated successfully!");
        fetchEmployeeData();
        
        try {
          const userObj = JSON.parse(localStorage.getItem('user'));
          if (res.data?.profilePicture) {
            userObj.profilePicture = res.data.profilePicture;
            localStorage.setItem('user', JSON.stringify(userObj));
          } else if (res.profilePicture) {
            userObj.profilePicture = res.profilePicture;
            localStorage.setItem('user', JSON.stringify(userObj));
          } else if (res.data) {
             userObj.profilePicture = res.data;
             localStorage.setItem('user', JSON.stringify(userObj));
          }
        } catch(e) {}
      } else {
        toast.error("Failed to update picture: " + (res.message || res.error));
      }
    } catch (err) {
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploadingPic(false);
    }
  };

  const getDocPath = (doc) => {
    const path = doc.filePath || doc.documentUrl || doc.fileUrl || doc.path || doc.url;
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000/${path.replace(/^\//, '')}`;
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await employeeService.deleteDocument(docId);
      if (res.success) {
        toast.success("Document deleted!");
        fetchEmployeeData();
      } else {
        toast.error("Failed to delete document: " + (res.message || res.error));
      }
    } catch (e) {
      toast.error("Error deleting document");
    }
  };

  if (isLoading) return (
    <div className="employee-profile-overlay">
      <div className="employee-profile-modal profile-modal-centered">
         <div className="profile-loading">{isAmharic ? 'የሰራተኛ መረጃ በመጫን ላይ...' : 'Loading Comprehensive Profile...'}</div>
      </div>
    </div>
  );
  
  if (!employee) return null;

  return (
    <div className="employee-profile-overlay" onClick={onClose}>
      <div className="employee-profile-modal" onClick={e => e.stopPropagation()}>
         <div className="profile-modal-header">
           <h3>{isAmharic ? 'የሰራተኛ ሙሉ መረጃ' : 'Employee Complete Record'}</h3>
           <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="wizard-body" style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          <div className="employee-profile-container">

      <div className="profile-hero-card">
        <div className="profile-avatar-section">
          <div className="avatar-wrapper-lg" style={{ position: 'relative' }}>
            <img 
              src={employee.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(getEmployeeDisplayName(employee))}&background=0B8255&color=fff`} 
               alt="Profile" 
               style={{ opacity: isUploadingPic ? 0.5 : 1 }}
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getEmployeeDisplayName(employee))}&background=0B8255&color=fff` }}
            />
            {isMe && (
               <div 
                 className="profile-pic-edit-badge" 
                 title="Update Profile Picture"
                 onClick={() => fileInputRef.current && fileInputRef.current.click()}
                 style={{
                   position: 'absolute', bottom: '8px', right: '8px',
                   background: '#0B8255', color: '#fff',
                   width: '32px', height: '32px', borderRadius: '50%',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'background 0.2s'
                 }}
                 onMouseEnter={e => e.currentTarget.style.background = '#096843'}
                 onMouseLeave={e => e.currentTarget.style.background = '#0B8255'}
               >
                 <Camera size={16} />
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   style={{ display: 'none' }} 
                   accept="image/*" 
                   onChange={handleProfilePicUpload} 
                 />
               </div>
            )}
          </div>
        </div>
        
        <div className="profile-hero-info">
           <h2>{getEmployeeDisplayName(employee)}</h2>
           <div className="hero-badges">
             <span className="badge badge-academic">{getEmployeeTypeLabel(employee.employeeType || "STAFF")}</span>
             <span className={`badge ${employee.employmentStatus === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
               {getEmploymentStatusLabel(employee.employmentStatus || 'ACTIVE')}
             </span>
           </div>
           <p className="hero-subtitle">{getLocalizedText(employee.departmentName, employee.departmentNameAmharic) || (isAmharic ? 'ዲፓርትመንት አልተገኘም' : 'No Linked Department')}</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* PERSONAL DETAILS CARD */}
        <div className="profile-info-card">
           <div className="card-lbl-header"><User size={18}/> {isAmharic ? 'የግል መረጃ' : 'Personal Information'}</div>
           <div className="card-data-grid">
             <div className="data-group">
               <label>{isAmharic ? 'ፆታ' : 'Gender'}</label>
               <span>{getGenderLabel(employee.gender)}</span>
             </div>
             <div className="data-group">
               <label>{isAmharic ? 'የልደት ቀን' : 'Date of Birth'}</label>
               <span>{displayEthDate(employee.dateOfBirthEth, employee.dateOfBirth) || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
             </div>
             <div className="data-group">
               <label>{isAmharic ? 'የግል ስልክ' : 'Personal Phone'}</label>
               <span>{employee.personalPhone || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
             </div>
             <div className="data-group">
               <label>{isAmharic ? 'የአደጋ ጊዜ አድራሻ' : 'Emergency Contact'}</label>
               <span>
                 {getLocalizedText(employee.emergencyContactName, employee.emergencyContactNameAmharic) || (isAmharic ? 'አልተገኘም' : 'N/A')}
                 {employee.emergencyContactPhone ? ` (${employee.emergencyContactPhone})` : ''}
               </span>
             </div>
           </div>
        </div>

        {/* EMPLOYMENT DETAILS CARD */}
        <div className="profile-info-card">
           <div className="card-lbl-header"><Briefcase size={18}/> {isAmharic ? 'የቅጥር መረጃ' : 'Employment Status'}</div>
           <div className="card-data-grid">
             <div className="data-group">
               <label>{isAmharic ? 'የተቀጠረበት ቀን' : 'Hire Date'}</label>
               <span>{displayEthDate(employee.hireDateEth, employee.hireDate) || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
             </div>
             <div className="data-group">
               <label>{isAmharic ? 'የቅጥር ዓይነት' : 'Contract Type'}</label>
               <span>{getEmploymentTypeLabel(employee.employmentType || 'FULL_TIME')}</span>
             </div>
             <div className="data-group">
               <label>{isAmharic ? 'የስራ ኢሜል' : 'Official Email'}</label>
               <span>{employee.officialEmail || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
             </div>
             <div className="data-group">
               <label>{isAmharic ? 'መሰረታዊ ደመወዝ' : 'Base Salary'}</label>
               <span>{employee.salary ? `$${employee.salary}` : (isAmharic ? 'ምስጢር' : 'Confidential')}</span>
             </div>
           </div>
        </div>

        {/* ACADEMIC / SPECIFIC DETAILS CARD */}
        {employee.employeeType === 'ACADEMIC' && (
          <div className="profile-info-card">
             <div className="card-lbl-header"><GraduationCap size={18}/> {isAmharic ? 'አካዳሚክ ሚና' : 'Academic Role'}</div>
             <div className="card-data-grid">
               <div className="data-group">
                 <label>{isAmharic ? 'ኮሌጅ' : 'College'}</label>
                 <span>{getLocalizedText(employee.collegeName, employee.collegeNameAmharic) || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
               </div>
               <div className="data-group">
                 <label>{isAmharic ? 'የስራ ደረጃ' : 'Academic Rank'}</label>
                 <span>{getLocalizedText(employee.academicRank, employee.academicRankAmharic) || (isAmharic ? 'አልተገለጸም' : 'Unspecified')}</span>
               </div>
               <div className="data-group">
                 <label>{isAmharic ? 'ስፔሻላይዜሽን' : 'Specialization'}</label>
                 <span>{getLocalizedText(employee.fieldOfSpecialization, employee.fieldOfSpecializationAmharic) || (isAmharic ? 'አጠቃላይ' : 'General')}</span>
               </div>
             </div>
          </div>
        )}

        {/* DOCUMENTS VAULT CARD */}
        <div className="profile-info-card full-span">
            <div className="card-lbl-header header-spread">
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><FileText size={18}/> {isAmharic ? 'የሰነዶች ማህደር' : 'Document Vault'}</div>
           </div>
           
           <div className="document-list">
             {!employee.documents || employee.documents.length === 0 ? (
               <div className="empty-docs">{isAmharic ? 'ሰነዶች አልተጫኑም።' : 'No documents securely vaulted yet.'}</div>
             ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                  {employee.documents.map((doc, i) => {
                    const docUrl = getDocPath(doc);
                    const isImage = docUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                    return (
                      <div 
                        key={i} 
                        className="doc-card" 
                        style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', backgroundColor: '#fff' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                        onClick={() => setViewDocModal(docUrl)}
                      >
                        <div style={{ height: '140px', backgroundColor: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {isImage ? (
                            <img src={docUrl} alt={doc.documentType} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FileText size={48} color="#cbd5e0" />
                          )}
                          {isHr && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }} 
                              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '50%', padding: '6px', color: '#e53e3e', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} 
                                title={isAmharic ? 'ሰነድ ሰርዝ' : 'Delete Document'}
                            >
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', borderTop: '1px solid #e2e8f0' }}>
                           <strong style={{ fontSize: '0.9rem', color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                             {getLocalizedText(doc.documentName, doc.documentNameAmharic) || doc.fileName || doc.documentType}
                           </strong>
                           <span style={{ fontSize: '0.75rem', color: '#718096', marginTop: '4px' }}>
                             {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
             )}
           </div>
        </div>
      </div>
          </div>
        </div>
      </div>

      {viewDocModal && (
        <div className="doc-viewer-modal-overlay" onClick={() => setViewDocModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setViewDocModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={32} />
          </button>
          <div className="doc-viewer-content" onClick={(e) => e.stopPropagation()} style={{ width: '80%', height: '80%', maxWidth: '1000px', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {viewDocModal.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                 <img src={viewDocModal} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
             ) : (
                 <iframe src={viewDocModal} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', backgroundColor: '#fff' }} />
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfileModal;
