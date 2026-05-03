import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { X, Search, ChevronDown } from 'lucide-react';
import api from '../../../services/api';
import designationService from '../../../services/designationService';

const CustomSelect = ({ value, onChange, options, placeholder, searchable = false, searchPlaceholder = "Search..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;
  const filteredOptions = searchable && searchTerm
    ? options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  return (
    <div className="hr-attendance-period-filter-wrap" ref={selectRef} style={{ width: '100%', position: 'relative' }}>
      <button
        type="button"
        className={`hr-attendance-period-filter-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
        style={{ width: '100%', justifyContent: 'space-between', minHeight: '48px' }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{selectedLabel}</span>
        <ChevronDown size={16} className="hr-attendance-period-filter-chevron" />
      </button>
      
      {isOpen && (
        <div className="hr-attendance-period-filter-menu" style={{ width: '100%', maxHeight: '250px', overflowY: 'auto', left: 0, zIndex: 10 }}>
          {searchable && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: '6px', padding: '4px 8px' }}>
                <Search size={14} color="var(--text-secondary)" style={{ marginRight: '6px' }} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            className="hr-attendance-period-filter-option"
            onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
            style={{ color: 'var(--text-secondary)' }}
          >
            {placeholder}
          </button>
          {filteredOptions.map(opt => (
             <button
                key={opt.value}
                type="button"
                className={`hr-attendance-period-filter-option ${value === opt.value ? 'active' : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearchTerm(''); }}
             >
                {opt.label}
             </button>
          ))}
          {searchable && filteredOptions.length === 0 && (
             <div className="hr-attendance-period-filter-option" style={{ padding: '12px', color: 'var(--text-secondary)', cursor: 'default' }}>
                No matches found...
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const DesignationForm = ({ onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Custom Employee Dropdown States
  const [empSearch, setEmpSearch] = useState('');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const empDropdownRef = useRef(null);

  const [isJobDescFocused, setIsJobDescFocused] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '', // expected: HEAD, DEAN, TRANSFER, MANAGER, OTHER
    jobDescription: '',
    status: 'ACTIVE',
    collegeId: '',
    departmentId: '',
    companyId: ''
  });

  // Data Loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, colRes, depRes] = await Promise.all([
           api.get('/employees', { params: { limit: 1000, period: 'ALL' } }),
           api.get('/colleges'),
           api.get('/departments')
        ]);

        if (empRes.data.success) {
          setEmployees(empRes.data.data.employees || empRes.data.data || []);
        }
        if (colRes.data.success) setColleges(colRes.data.data || []);
        if (depRes.data.success) setDepartments(depRes.data.data || []);
        
      } catch (error) {
        console.error("Dependency load error", error);
        toast.error("Failed to load required form dependencies.");
      }
    };
    fetchData();
  }, []);

  // Click outside to close custom employee dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      // Reset dependent fields intelligently
      if (name === 'title') {
        if (value === 'TRANSFER' || value === 'MANAGER') {
          next.collegeId = '';
        } else if (value === 'OTHER') {
          next.collegeId = '';
          next.departmentId = '';
          setCustomTitle('');
        }
      }
      if (name === 'collegeId' && prev.title === 'HEAD') {
        next.departmentId = ''; // Reset dept if college changes for Head
      }
      
      // Enforce Academic restriction if role explicitly changed while administrative previously targeted
      if (name === 'title' && (value === 'HEAD' || value === 'DEAN') && prev.employeeId) {
         const selectedEmp = employees.find(emp => emp.id === prev.employeeId);
         if (selectedEmp && selectedEmp.employeeType !== 'ACADEMIC') {
            next.employeeId = '';
            setEmpSearch('');
            toast.warn(isAmharic ? 'ለዲን ወይም ለሀላፊነት የአካዳሚክ ሰራተኞች ብቻ የተፈቀዱ ናቸው። እባክዎ እንደገና ይምረጡ።' : 'Only ACADEMIC employees can be assigned to this role. Please reselect.', { position: 'top-center' });
         }
      }
      return next;
    });
  };

  const validateForm = () => {
    if (!formData.employeeId) return "Employee selection is required.";
    if (!formData.title) return "Action selection (Title) is required.";
    
    if (formData.title === 'HEAD') {
       if (!formData.collegeId) return "College selection is strictly required for Department Head.";
       if (!formData.departmentId) return "Department selection is strictly required for Department Head.";
    }
    else if (formData.title === 'DEAN') {
       if (!formData.collegeId) return "College selection is strictly required for Dean.";
    }
    else if (formData.title === 'TRANSFER') {
       if (!formData.departmentId) return "Target Department selection is strictly required for Transfer.";
    }
    else if (formData.title === 'MANAGER') {
       if (!formData.departmentId) return "Target Department selection is strictly required for Office Manager.";
    }
    else if (formData.title === 'OTHER') {
       if (!customTitle.trim()) return "Please specify the exact title.";
       const lowerTitle = customTitle.toLowerCase();
       if (lowerTitle.includes('dean') && !formData.collegeId) return "College selection is required for Vice Dean or similar roles.";
       if (lowerTitle.includes('coordinator') && !formData.departmentId) return "Department selection is required for Coordinator roles.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);
    try {
       // --- DESIGNATION LOGIC ---
       const payload = { ...formData };
       if (payload.minSalary) payload.minSalary = Number(payload.minSalary);
       if (payload.maxSalary) payload.maxSalary = Number(payload.maxSalary);
       
       if (!payload.collegeId) delete payload.collegeId;
       if (!payload.departmentId) delete payload.departmentId;
       if (!payload.companyId) delete payload.companyId;

       // Dynamically resolve Action Titles based on selected targets
       if (payload.title === 'HEAD') {
           const targetDept = departments.find(d => d.id === formData.departmentId);
           if (targetDept) {
               payload.title = `Head of ${targetDept.departmentName}`;
               payload.titleAmharic = `የ ${targetDept.departmentNameAmharic || targetDept.departmentName} ኃላፊ`;
           } else {
               payload.titleAmharic = 'የዲፓርትመንት ሀላፊ';
           }
       } else if (payload.title === 'DEAN') {
           const targetCollege = colleges.find(c => c.id === formData.collegeId);
           if (targetCollege) {
               payload.title = `Dean of ${targetCollege.collegeName}`;
               payload.titleAmharic = `የ ${targetCollege.collegeNameAmharic || targetCollege.collegeName} ዲን`;
           } else {
               payload.titleAmharic = 'ዲን';
           }
       } else if (payload.title === 'TRANSFER') {
           payload.titleAmharic = 'ዝውውር';
       } else if (payload.title === 'OTHER') {
           payload.title = customTitle.trim();
       }

       const res = await designationService.createDesignation(payload);
       
       if (res.success) {
          toast.success(isAmharic ? 'ምደባው በተሳካ ሁኔታ ተጠናቋል!' : 'Designation Processed Successfully!');
          onSuccess();
       } else {
          toast.error(res.message || 'Error configuring designation.');
       }
    } catch (err) {
       const msg = err.response?.data?.message || err.response?.data?.error || "Error executing logic.";
       toast.error(msg);
    } finally {
       setIsLoading(false);
    }
  };

  const getLocalizedTitle = (enValue, amValue) => {
    if (isAmharic && amValue) return amValue;
    return enValue || amValue || "Unknown";
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
           <h2>{isAmharic ? 'አዲስ ምደባ ወይም ዝውውር' : 'New Assignment & Transfer'}</h2>
           <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1 }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
             <div className="form-group">
                <label className="required">{isAmharic ? 'የቅንብር አይነት ይምረጡ' : 'Select Operation Action'}</label>
                <CustomSelect 
                  value={formData.title}
                  onChange={(val) => handleChange({ target: { name: 'title', value: val } })}
                  placeholder={isAmharic ? '-- ምረጥ --' : '-- Select Action --'}
                  options={[
                    { value: 'HEAD', label: isAmharic ? 'የክፍል ኃላፊ (Department Head)' : 'Department Head (HEAD)' },
                    { value: 'DEAN', label: isAmharic ? 'ዲን (Dean)' : 'College Dean (DEAN)' },
                    { value: 'TRANSFER', label: isAmharic ? 'ዝውውር (Transfer)' : 'Transfer Employee (TRANSFER)' },
                    { value: 'MANAGER', label: isAmharic ? 'የቢሮ ሃላፊ (Administrative Office Manager)' : 'Administrative Office Manager (MANAGER)' },
                    { value: 'OTHER', label: isAmharic ? 'ሌላ (Other / Dual Role)' : 'Other Dual Role (Coordinator, Vice Dean)' }
                  ]}
                />
             </div>
          </div>

          {formData.title === 'OTHER' && (
             <div style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                   <label className="required">{isAmharic ? 'ትክክለኛውን ማዕረግ ያስገቡ' : 'Specify Exact Title'}</label>
                   <input
                     type="text"
                     value={customTitle}
                     onChange={(e) => setCustomTitle(e.target.value)}
                     placeholder={isAmharic ? 'ለምሳሌ፡ አስተባባሪ' : 'e.g., Coordinator, Vice Dean...'}
                     style={{
                       width: '100%',
                       padding: '0.6rem 1rem',
                       borderRadius: '8px',
                       border: '1px solid var(--border-color)',
                       background: 'var(--bg-secondary)',
                       color: 'var(--text-primary)',
                       outline: 'none',
                       minHeight: '48px'
                     }}
                   />
                </div>
             </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }} ref={empDropdownRef}>
             <label className="required">{isAmharic ? 'ሰራተኛ ምረጥ' : 'Select Employee'}</label>
             <label className="hr-attendance-search-wrapper" htmlFor="modalEmpSearchDesig" style={{ margin: 0, minHeight: '48px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                <input 
                  id="modalEmpSearchDesig"
                  type="text" 
                  placeholder={isAmharic ? 'ስም ይፈልጉ...' : 'Type to search employee...'}
                  value={empSearch}
                  onChange={(e) => {
                    setEmpSearch(e.target.value);
                    if (!isEmpDropdownOpen) setIsEmpDropdownOpen(true);
                    if (e.target.value === '') setFormData(prev => ({ ...prev, employeeId: '' }));
                  }}
                  onFocus={() => setIsEmpDropdownOpen(true)}
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                />
             </label>
             
             {isEmpDropdownOpen && (
                 <div className="hr-attendance-period-filter-menu" style={{ top: 'calc(100% + 4px)', position: 'absolute' }}>
                    {employees.filter(emp => {
                       let passesRoleRestriction = true;
                       if (formData.title === 'HEAD' || formData.title === 'DEAN') {
                          passesRoleRestriction = emp.employeeType === 'ACADEMIC' || (emp.department && emp.department.departmentType === 'ACADEMIC');
                       }
                       const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(empSearch.toLowerCase());
                       return matchesSearch && passesRoleRestriction;
                    }).map((emp) => (
                       <button 
                         key={emp.id} 
                         type="button"
                         className="hr-attendance-period-filter-option"
                         onMouseDown={() => {
                            setFormData(prev => ({ ...prev, employeeId: emp.id }));
                            setEmpSearch(`${emp.firstName} ${emp.lastName}`);
                            setIsEmpDropdownOpen(false);
                         }}
                       >
                          <div style={{ fontWeight: '500' }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                             <span style={{ 
                               padding: '1px 6px', 
                               background: emp.employeeType === 'ACADEMIC' ? 'rgba(16, 163, 108, 0.1)' : 'rgba(75, 85, 99, 0.1)', 
                               color: emp.employeeType === 'ACADEMIC' ? 'var(--primary-color)' : 'var(--text-secondary)', 
                               borderRadius: '4px', fontSize: '0.65rem', fontWeight: '500' 
                             }}>
                               {emp.employeeType || "ADMINISTRATIVE"}
                             </span>
                             {emp.department?.departmentName && <span style={{ opacity: 0.7 }}>• {emp.department.departmentName}</span>}
                          </div>
                       </button>
                    ))}
                    {employees.filter(emp => {
                        let passesRoleRestriction = true;
                        if (formData.title === 'HEAD' || formData.title === 'DEAN') {
                           passesRoleRestriction = emp.employeeType === 'ACADEMIC' || (emp.department && emp.department.departmentType === 'ACADEMIC');
                        } else if (formData.title === 'TRANSFER') {
                           passesRoleRestriction = emp.employeeType === 'ADMINISTRATIVE';
                        }
                        return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(empSearch.toLowerCase()) && passesRoleRestriction;
                    }).length === 0 && (
                       <div className="hr-attendance-period-filter-option" style={{ padding: '12px', color: 'var(--text-secondary)', cursor: 'default' }}>
                           {isAmharic ? 'ምንም አልተገኘም' : 'No matches found...'}
                       </div>
                    )}
                 </div>
             )}
          </div>

          {formData.title && (
             <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                   
                   {(formData.title === 'HEAD' || formData.title === 'DEAN' || (formData.title === 'OTHER' && customTitle.toLowerCase().includes('dean'))) && (
                     <div className="form-group">
                        <label className="required">{isAmharic ? 'ኮሌጅ' : 'Target College'}</label>
                        <CustomSelect 
                          value={formData.collegeId}
                          onChange={(val) => handleChange({ target: { name: 'collegeId', value: val } })}
                          placeholder={isAmharic ? '-- ምረጥ --' : '-- Select College --'}
                          searchable={true}
                          searchPlaceholder={isAmharic ? 'ፈልግ...' : 'Search colleges...'}
                          options={colleges.map(c => ({
                             value: c.id,
                             label: getLocalizedTitle(c.collegeName, c.collegeNameAmharic)
                          }))}
                        />
                     </div>
                   )}
                   
                   {(formData.title === 'HEAD' || formData.title === 'TRANSFER' || formData.title === 'MANAGER' || (formData.title === 'OTHER' && customTitle.toLowerCase().includes('coordinator'))) && (
                     <div className="form-group">
                        <label className="required">{isAmharic ? 'ዲፓርትመንት' : 'Target Department'}</label>
                        <CustomSelect 
                          value={formData.departmentId}
                          onChange={(val) => handleChange({ target: { name: 'departmentId', value: val } })}
                          placeholder={isAmharic ? '-- ምረጥ --' : '-- Select Department --'}
                          searchable={true}
                          searchPlaceholder={isAmharic ? 'ፈልግ...' : 'Search departments...'}
                          options={departments
                              .filter(d => {
                                 if (formData.title === 'MANAGER') return d.departmentType === 'ADMINISTRATIVE';
                                 if (formData.title === 'HEAD') return d.collegeId === formData.collegeId;
                                 if (formData.title === 'TRANSFER') return d.departmentType === 'ADMINISTRATIVE';
                                 return true;
                              })
                              .map(d => ({
                                 value: d.id,
                                 label: `${getLocalizedTitle(d.departmentName, d.departmentNameAmharic)}${formData.title === 'TRANSFER' || formData.title === 'OTHER' ? ` (${d.departmentType})` : ''}`
                              }))
                          }
                        />
                     </div>
                   )}

                </div>
             </div>
          )}

          {formData.title && formData.title !== 'TRANSFER' && (
             <>
               <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                 <label>{isAmharic ? 'የስራ መግለጫ (አማራጭ)' : 'Job Description'}</label>
                 <textarea 
                   name="jobDescription" 
                   value={formData.jobDescription} 
                   onChange={handleChange} 
                   onFocus={() => setIsJobDescFocused(true)}
                   onBlur={() => setIsJobDescFocused(false)}
                   rows="4"
                   style={{ 
                     width: '100%', 
                     padding: '0.6rem 1rem', 
                     borderRadius: '8px', 
                     border: `1px solid ${isJobDescFocused ? 'var(--primary-color)' : 'var(--border-color)'}`, 
                     background: 'var(--bg-secondary)', 
                     color: 'var(--text-primary)', 
                     resize: 'vertical',
                     outline: 'none',
                     boxShadow: isJobDescFocused ? '0 0 0 3px rgba(11, 130, 85, 0.1)' : 'none',
                     transition: 'border-color 0.2s, box-shadow 0.2s'
                   }}
                 ></textarea>
               </div>
             </>
          )}

          <div className="modal-footer" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading} style={{ width: '100%' }}>
              {isAmharic ? 'ሰርዝ' : 'Cancel'}
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading || !formData.title} style={{ width: '100%' }}>
              {isLoading ? 'Processing...' : (isAmharic ? 'መዝግብ' : (formData.title === 'TRANSFER' ? 'Apply Transfer' : 'Finalize Designation'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DesignationForm;
