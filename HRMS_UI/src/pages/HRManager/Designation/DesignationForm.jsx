import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { X, Search } from 'lucide-react';
import api from '../../../services/api';
import designationService from '../../../services/designationService';

const DesignationForm = ({ onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '',
    titleAmharic: '',
    jobDescription: '',
    gradeLevel: '',
    minSalary: '',
    maxSalary: '',
    status: 'ACTIVE',
    collegeId: '',
    departmentId: '',
    companyId: ''
  });

  // Dynamic Rule States
  const [rules, setRules] = useState({
    requireCollege: false,
    requireDepartment: true,
    hideDepartment: false,
  });

  // Data Loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, colRes, depRes] = await Promise.all([
           api.get('/employees', { params: { limit: 1000, period: 'ALL' } }),
           api.get('/colleges'), // API endpoint corrected to actual /api/colleges
           api.get('/departments') // API endpoint corrected to actual /api/departments
        ]);

        if (empRes.data.success) {
          setEmployees(empRes.data.data.employees || empRes.data.data || []);
          setFilteredEmployees(empRes.data.data.employees || empRes.data.data || []);
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

  // Employee Search Filter
  useEffect(() => {
    if (!empSearch.trim()) {
      setFilteredEmployees(employees);
      return;
    }
    const lower = empSearch.toLowerCase();
    const hits = employees.filter(e => {
      const nameMatch = `${e.firstName} ${e.lastName}`.toLowerCase().includes(lower);
      const emailMatch = (e.personalEmail || '').toLowerCase().includes(lower);
      return nameMatch || emailMatch;
    });
    setFilteredEmployees(hits);
  }, [empSearch, employees]);

  // Real-time Title Logic evaluation securely matching backend strict schemas
  useEffect(() => {
    const activeTitle = (formData.title || '').toLowerCase();
    const isDean = activeTitle.includes("dean") || activeTitle.includes("dea");
    const isHead = activeTitle.includes("head");

    let requireCol = false;
    let requireDep = true;
    let hideDep = false;

    if (isDean) {
      requireCol = true;
      hideDep = true;
      requireDep = false;
    } else if (isHead) {
      requireCol = true;
      requireDep = true;
      hideDep = false;
    }

    setRules({
      requireCollege: requireCol,
      requireDepartment: requireDep,
      hideDepartment: hideDep,
    });

    // Auto-clear hidden fields to prevent accidental 400 Bad Requests
    if (hideDep && formData.departmentId) {
       setFormData(prev => ({ ...prev, departmentId: '' }));
    }
  }, [formData.title, formData.departmentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.employeeId) return "Employee selection is required.";
    if (!formData.title) return "Designation Title is required.";
    if (rules.requireCollege && !formData.collegeId) return "College selection is strictly required for this role.";
    if (rules.requireDepartment && !formData.departmentId) return "Department selection is strictly required for this role.";
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
       const payload = { ...formData };
       
       // Force Number formatting correctly
       if (payload.minSalary) payload.minSalary = Number(payload.minSalary);
       if (payload.maxSalary) payload.maxSalary = Number(payload.maxSalary);
       
       // Strip empty IDs logically
       if (!payload.collegeId) delete payload.collegeId;
       if (!payload.departmentId) delete payload.departmentId;
       if (!payload.companyId) delete payload.companyId;

       // Utilizes explicit service file architecture
       const res = await designationService.createDesignation(payload);
       
       if (res.success) {
          toast.success(isAmharic ? 'ምደባው በተሳካ ሁኔታ ተጠናቋል!' : 'Assignment Transferred Successfully!');
          onSuccess();
       } else {
          toast.error(res.message || 'Error configuring transfer.');
       }
    } catch (err) {
       const msg = err.response?.data?.message || err.response?.data?.error || "Error executing assignment logic.";
       toast.error(msg);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
           <h2>{isAmharic ? 'አዲስ ምደባ ወይም ዝውውር' : 'New Assignment & Transfer'}</h2>
           <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
             <label className="required">{isAmharic ? 'ሰራተኛ ምረጥ' : 'Select Employee'}</label>
             <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search size={16} color="#6b7280" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input 
                  type="text" 
                  placeholder={isAmharic ? 'ስም ይፈልጉ...' : 'Search Name or Email...'}
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
             </div>
             
             <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)' }}>
               {filteredEmployees.map(emp => (
                 <label 
                   key={emp.id} 
                   style={{ 
                     display: 'flex', alignItems: 'center', padding: '0.75rem', 
                     borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                     background: formData.employeeId === emp.id ? 'var(--bg-secondary)' : 'transparent'
                   }}
                 >
                   <input 
                     type="radio" 
                     name="employeeId" 
                     value={emp.id} 
                     checked={formData.employeeId === emp.id}
                     onChange={handleChange}
                     style={{ marginRight: '0.75rem' }}
                   />
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{emp.firstName} {emp.lastName}</strong>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{emp.personalEmail || "No Email"} — {emp.employeeId}</span>
                   </div>
                 </label>
               ))}
               {filteredEmployees.length === 0 && (
                 <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No matching employees found</div>
               )}
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
             <div className="form-group">
                <label className="required">{isAmharic ? 'የስራ መደብ ርዕስ' : 'Designation Title'}</label>
                <input 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange} 
                  placeholder="e.g. Dean, Department Head, HR Staff..."
                  required 
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
             </div>
             <div className="form-group">
                <label>{isAmharic ? 'በአማርኛ ርዕስ' : 'Title (Amharic)'}</label>
                <input 
                  type="text" 
                  name="titleAmharic" 
                  value={formData.titleAmharic} 
                  onChange={handleChange} 
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
             </div>
          </div>

          <div style={{ padding: '1.25rem', background: rules.requireCollege ? 'rgba(11,130,85, 0.05)' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '1.25rem' }}>
             <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
               <span>{isAmharic ? 'ማስታወሻ: ዲን / ሀላፊ ካስገቡ ስርዓቱ ትክክለኛውን ቦታ በራስ ሰር ይለየዋል::' : 'Target System will logically trigger transfer routing based on inputs:'}</span>
               {rules.requireCollege && <strong style={{color: 'var(--primary-color)'}}>• Requires College Mapping</strong>}
               {rules.requireDepartment && <strong style={{color: 'var(--primary-color)'}}>• Requires Department Mapping</strong>}
               {rules.hideDepartment && <strong style={{color: '#991b1b'}}>• Cannot have Department attached</strong>}
             </p>
             <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                <div className="form-group" style={{ opacity: (!rules.requireCollege && formData.title === '') ? 0.6 : 1 }}>
                   <label className={rules.requireCollege ? "required" : ""}>{isAmharic ? 'ኮሌጅ' : 'Target College'}</label>
                   <select 
                     name="collegeId" 
                     value={formData.collegeId} 
                     onChange={handleChange} 
                     required={rules.requireCollege}
                     style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                   >
                     <option value="">{isAmharic ? '-- ምረጥ --' : '-- Select --'}</option>
                     {colleges.map(c => <option key={c.id} value={c.id}>{getLocalizedTitle(c.collegeName, c.collegeNameAmharic, isAmharic)}</option>)}
                   </select>
                </div>
                
                {!rules.hideDepartment && (
                  <div className="form-group">
                     <label className={rules.requireDepartment ? "required" : ""}>{isAmharic ? 'ዲፓርትመንት' : 'Target Department'}</label>
                     <select 
                       name="departmentId" 
                       value={formData.departmentId} 
                       onChange={handleChange} 
                       required={rules.requireDepartment}
                       style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                     >
                       <option value="">{isAmharic ? '-- ምረጥ --' : '-- Select --'}</option>
                       {departments.map(d => <option key={d.id} value={d.id}>{getLocalizedTitle(d.departmentName, d.departmentNameAmharic, isAmharic)}</option>)}
                     </select>
                  </div>
                )}
             </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>{isAmharic ? 'የስራ መግለጫ' : 'Job Description'}</label>
            <textarea 
              name="jobDescription" 
              value={formData.jobDescription} 
              onChange={handleChange} 
              rows="2"
              style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
             <div className="form-group">
                <label>{isAmharic ? 'የደረጃ ምድብ' : 'Grade Level'}</label>
                <input 
                  type="text" 
                  name="gradeLevel" 
                  value={formData.gradeLevel} 
                  onChange={handleChange} 
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
             </div>
             <div className="form-group">
                <label>{isAmharic ? 'ዝቅተኛ ደመወዝ' : 'Min Salary'}</label>
                <input 
                  type="number" 
                  name="minSalary" 
                  value={formData.minSalary} 
                  onChange={handleChange} 
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
             </div>
             <div className="form-group">
                <label>{isAmharic ? 'ከፍተኛ ደመወዝ' : 'Max Salary'}</label>
                <input 
                  type="number" 
                  name="maxSalary" 
                  value={formData.maxSalary} 
                  onChange={handleChange} 
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
             </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              {isAmharic ? 'ሰርዝ' : 'Cancel'}
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : (isAmharic ? 'መዝግብ' : 'Initiate Transfer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const getLocalizedTitle = (enValue, amValue, isAmharic) => {
   if (isAmharic && amValue) return amValue;
   return enValue || amValue || "Unknown";
};

export default DesignationForm;
