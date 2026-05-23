import React, { useState, useEffect, useRef } from 'react';
import { CalendarOff, Clock, LayoutDashboard, Megaphone, User, Briefcase, GraduationCap, FileText, Camera, Building2, Trash, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { employeeService } from '../../../services/employeeService';
import { attendanceService } from '../../../services/attendanceService';
import { leaveService } from '../../../services/leaveService';
import { noticeService } from '../../../services/noticeService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../EmployeePortal.css';
import './EmployeeOverview.css';

const EmployeeOverview = () => {
  const { i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [viewDocModal, setViewDocModal] = useState(null);
  const fileInputRef = useRef(null);

  // Stats
  const [leavesRemaining, setLeavesRemaining] = useState('N/A');
  const [recentAttendance, setRecentAttendance] = useState('N/A');
  const [unreadNotices, setUnreadNotices] = useState('N/A');

  const displayEthDate = (ethValue, gregValue) => {
    if (ethValue) return ethValue;
    if (gregValue) return formatEthiopianDate(gregValue);
    return null;
  };

  const getLocalizedText = (enValue, amValue) => {
    if (isAmharic && amValue) return amValue;
    return enValue || amValue || '';
  };

  const getEmployeeDisplayName = (emp) => {
    if (!emp) return 'Employee';
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

  useEffect(() => {
    const userStr = (localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      if (parsedUser.employeeId) {
        fetchDashboardData(parsedUser.employeeId);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchDashboardData = async (employeeId) => {
    try {
      setIsLoading(true);
      
      // Fetch core profile
      const res = await employeeService.getEmployeeById(employeeId, ['company', 'college', 'department']);
      if (res.success) {
         let empData = res.data;
         
         // Fetch documents
         try {
           const docsRes = await employeeService.getDocuments(employeeId);
           if (docsRes.success || Array.isArray(docsRes.data)) {
             empData.documents = docsRes.data || (Array.isArray(docsRes) ? docsRes : []);
           }
         } catch (docErr) {
           empData.documents = [];
         }
         
         setEmployee(empData);
      } else {
         toast.error("Employee profile not found");
      }

      // Fetch dynamic stats
      try {
        const attendanceRes = await attendanceService.getEmployeeSummary(employeeId);
        if (attendanceRes?.success && attendanceRes.data) {
          // If the employee has late arrivals today or yesterday, show Late, else On Time
          setRecentAttendance(attendanceRes.data.late > 0 ? 'Late Records' : 'On Time');
        }
      } catch (err) { }

      try {
        const leaveRes = await leaveService.getMyLeaves({ limit: 1 });
        // Can't accurately determine remaining leaves without full balance API, but we try
        if (leaveRes?.success) {
           // We will just show a placeholder until a dedicated leave balance API is ready
           setLeavesRemaining('View Leaves');
        }
      } catch (err) { }

      try {
        const noticeRes = await noticeService.listNotices({ limit: 10 });
        if (noticeRes?.success && noticeRes.data) {
           setUnreadNotices(noticeRes.data.length.toString());
        }
      } catch (err) { }

    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploadingPic(true);
      const res = await employeeService.uploadProfilePicture(user.employeeId, file);
      if (res.success) {
        toast.success("Profile picture updated successfully!");
        fetchDashboardData(user.employeeId);
        
        try {
          const userObj = JSON.parse((localStorage.getItem('user') || sessionStorage.getItem('user')));
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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

  const getDocPath = (doc) => {
    const path = doc.filePath || doc.documentUrl || doc.fileUrl || doc.path || doc.url;
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    return `${apiOrigin}/${path.replace(/^\//, '')}`;
  };

  if (isLoading) {
    return (
      <div className="employee-portal-container">
        <div className="overview-loading">{isAmharic ? 'የዳሽቦርድ መረጃ በመጫን ላይ...' : 'Loading Dashboard...'}</div>
      </div>
    );
  }

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>{isAmharic ? 'እንኳን ደህና መጡ,' : 'Welcome back,'} {user?.firstName || 'Employee'}!</h1>
        <p>{isAmharic ? 'የእርስዎ ዳሽቦርድ መረጃ እነሆ።' : 'Here is your dashboard overview.'}</p>
      </div>

      <div className="portal-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <CalendarOff size={24} />
          </div>
          <div className="stat-details">
            <h3>{isAmharic ? 'የቀረ ፈቃድ' : 'Leaves Remaining'}</h3>
            <p className="stat-value">{leavesRemaining}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h3>{isAmharic ? 'የቅርብ ክትትል' : 'Recent Attendance'}</h3>
            <p className="stat-value">{recentAttendance}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Megaphone size={24} />
          </div>
          <div className="stat-details">
            <h3>{isAmharic ? 'ያልተነበቡ ማስታወቂያዎች' : 'Unread Notices'}</h3>
            <p className="stat-value">{unreadNotices}</p>
          </div>
        </div>
      </div>
      
      {employee && (
        <>
          <div className="profile-hero-card">
            <div className="profile-avatar-section">
              <div className="avatar-wrapper-lg">
                <img 
                  src={employee.profilePicture || `${import.meta.env.VITE_AVATAR_API_URL}?name=${encodeURIComponent(getEmployeeDisplayName(employee))}&background=0B8255&color=fff`} 
                  alt="Profile" 
                  style={{ opacity: isUploadingPic ? 0.5 : 1 }}
                  onError={(e) => { e.target.src = `${import.meta.env.VITE_AVATAR_API_URL}?name=${encodeURIComponent(getEmployeeDisplayName(employee))}&background=0B8255&color=fff` }}
                />
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
               {employee.designationTitle && (
                 <p className="hero-subtitle" style={{fontWeight: 500, marginTop: '4px', color: 'var(--text-primary)'}}>
                   {getLocalizedText(employee.designationTitle, employee.designationTitleAmharic)}
                   {employee.designationGradeLevel && ` (${employee.designationGradeLevel})`}
                 </p>
               )}
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
                 <div className="data-group">
                   <label>{isAmharic ? 'የስራ ሃላፊ (ማናጀር)' : 'Reporting Manager'}</label>
                   <span>
                     {employee.managerFirstName 
                       ? `${getLocalizedText(employee.managerFirstName, employee.managerFirstNameAmharic)} ${getLocalizedText(employee.managerLastName, employee.managerLastNameAmharic) || ''}`
                       : (isAmharic ? 'አልተመደበም' : 'None Assigned')}
                   </span>
                 </div>
               </div>
            </div>

            {/* OUTSOURCE DETAILS CARD */}
            {employee.employeeType === 'OUTSOURCE' && (
              <div className="profile-info-card">
                 <div className="card-lbl-header"><Building2 size={18}/> {isAmharic ? 'የውጭ ኮንትራት መረጃ' : 'Outsourcing Details'}</div>
                 <div className="card-data-grid">
                   <div className="data-group">
                     <label>{isAmharic ? 'ኮንትራክተር ካምፓኒ' : 'Company'}</label>
                     <span>{getLocalizedText(employee.companyName, employee.companyNameAmharic) || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
                   </div>
                   <div className="data-group">
                     <label>{isAmharic ? 'የአገልግሎት ዓይነት' : 'Service Type'}</label>
                     <span>{employee.serviceType || (isAmharic ? 'አልተገለጸም' : 'Unspecified')}</span>
                   </div>
                   <div className="data-group">
                     <label>{isAmharic ? 'የውል ጅማሬ' : 'Contract Start'}</label>
                     <span>{displayEthDate(null, employee.contractStartDate) || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
                   </div>
                   <div className="data-group">
                     <label>{isAmharic ? 'የውል ማብቂያ' : 'Contract End'}</label>
                     <span>{displayEthDate(null, employee.contractEndDate) || (isAmharic ? 'አልተገኘም' : 'N/A')}</span>
                   </div>
                 </div>
              </div>
            )}

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
        </>
      )}

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

export default EmployeeOverview;
