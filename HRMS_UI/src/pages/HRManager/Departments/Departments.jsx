import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { departmentService } from '../../../services/departmentService';
import { collegeService } from '../../../services/collegeService';
import CommonForm from '../../../components/common/CommonForm';
import ConfirmModal from '../../../components/common/ConfirmModal';
import './Departments.css';

const Departments = () => {
  const { t, i18n } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [parentDepartments, setParentDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Dynamic Parent Names Cache
  const [parentNamesCache, setParentNamesCache] = useState({});

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic form state to track type switching
  const [activeFormType, setActiveFormType] = useState('ACADEMIC');

  // Hierarchy state for dropdowns
  const [adminHierarchy, setAdminHierarchy] = useState([]);
  const [adminChildrenOptions, setAdminChildrenOptions] = useState({});

  // Delete confirm states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);

  // Memoize initial form data to prevent unwanted resets inside CommonForm
  const initialFormData = useMemo(() => {
    return {
      departmentType: 'ACADEMIC',
      departmentStatus: 'ACTIVE',
      ...editingDept
    };
  }, [editingDept]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Bootup reference fetchers
  const loadFilterLookups = async () => {
    try {
      const colRes = await collegeService.getAllColleges(1, 200, '', 'collegeName', 'ASC');
      if (colRes?.data) setColleges(colRes.data);

      const deptRes = await departmentService.getAllDepartments(1, 500, '', 'departmentName', 'ASC');
      if (deptRes?.data) {
        // Only allow administrative departments as generic parents
        const adminParents = deptRes.data.filter(d => d.departmentType === 'ADMINISTRATIVE');
        setParentDepartments(adminParents);
      }
    } catch (e) {
      console.warn("Failed to load reference lookups", e);
    }
  };

  // Main list fetch logic
  const loadDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await departmentService.getAllDepartments(page, limit, debouncedSearch, sortBy, sortOrder);

      if (res.success) {
        setDepartments(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
      } else {
        toast.error("Failed to load departments");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    loadDepartments();
    loadFilterLookups(); // Load colleges/parents just once when page mounts
  }, [loadDepartments]);

  // Resolving deeply embedded unknown parent names dynamically
  useEffect(() => {
    const fetchMissingParents = async () => {
      const missingIds = [...new Set(departments
        .filter(d => d.parentDepartmentId)
        .map(d => d.parentDepartmentId)
        .filter(id =>
          !parentDepartments.some(p => p.id === id) &&
          !departments.some(d => d.id === id) &&
          !parentNamesCache[id]
        )
      )];

      if (missingIds.length === 0) return;

      const newCache = { ...parentNamesCache };
      for (const id of missingIds) {
        try {
          const res = await departmentService.getDepartmentById(id);
          if (res?.success && res?.data) {
            newCache[id] = res.data.departmentName;
          }
        } catch (e) {
          newCache[id] = 'External Parent Node';
        }
      }
      setParentNamesCache(newCache);
    };

    if (departments.length > 0) {
      fetchMissingParents();
    }
  }, [departments, parentDepartments]); // Intentionally omitting parentNamesCache to prevent infinite looping

  // Handlers
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} color="var(--text-secondary)" />;
    return sortOrder === 'ASC' ? <ArrowUp size={14} color="var(--primary-color)" /> : <ArrowDown size={14} color="var(--primary-color)" />;
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setActiveFormType('ACADEMIC'); // Default fresh form
    setAdminHierarchy([]);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setActiveFormType(dept.departmentType || 'ACADEMIC');
    
    if (dept.departmentType === 'ADMINISTRATIVE' && dept.parentDepartmentId) {
      const path = [];
      let curr = dept.parentDepartmentId;
      let safety = 10;
      while (curr && safety > 0) {
        path.unshift(curr);
        const node = parentDepartments.find(d => d.id === curr);
        if (node && node.parentDepartmentId) {
           curr = node.parentDepartmentId;
        } else {
           curr = null;
        }
        safety--;
      }
      setAdminHierarchy(path);
      path.forEach(async (id) => {
         if (!adminChildrenOptions[id]) {
            try {
              const res = await departmentService.getDepartmentsByParent(id);
              if (res?.success) setAdminChildrenOptions(prev => ({...prev, [id]: res.data}));
            } catch(e) {}
         }
      });
    } else {
      setAdminHierarchy([]);
    }
    
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingDept(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      // Clean up irrelevant payload data based on strict backend schema mapping
      const payload = { ...formData };
      
      if (i18n.language === 'am') {
        delete payload.departmentName;
        delete payload.departmentDescription;
      } else {
        delete payload.departmentNameAmharic;
        delete payload.departmentDescriptionAmharic;
      }

      // Default company mapped generically if omitted by backend, but we'll let EnsureDefaultCompany handle it
      // if it strictly needs it in body, EnsureDefaultCompany will append it!

      if (payload.departmentType === 'ACADEMIC') {
        payload.parentDepartmentId = null;
      } else {
        payload.collegeId = null;
        payload.parentDepartmentId = payload.parentDepartmentId || null;
      }

      if (editingDept) {
        const res = await departmentService.updateDepartment(editingDept.id, payload);
        if (res.success) {
          toast.success("Department updated successfully");
          closeFormModal();
          loadDepartments();
        } else {
          toast.error(res.error || "Update failed");
        }
      } else {
        const res = await departmentService.createDepartment(payload);
        if (res.success) {
          toast.success("Department created successfully");
          closeFormModal();
          loadDepartments();
        } else {
          toast.error(res.error || "Creation failed");
        }
      }
    } catch (error) {
      const msgs = error?.response?.data?.details || error?.response?.data?.message || "An error occurred while saving";
      toast.error(typeof msgs === 'string' ? msgs : "Validation Error from Server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (dept) => {
    setDeptToDelete(dept);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deptToDelete) return;
    try {
      const res = await departmentService.deleteDepartment(deptToDelete.id);
      if (res.success) {
        toast.success("Department deleted successfully");
        loadDepartments();
      } else {
        toast.error(res.error || "Failed to delete department");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete from server");
    } finally {
      setDeleteModalOpen(false);
      setDeptToDelete(null);
    }
  };

  // Dynamic Structure mapping
  const getDynamicFields = () => {
    let textFields = [];
    if (i18n.language === 'am') {
       textFields = [
         { name: 'departmentNameAmharic', label: 'የዲፓርትመንት ስም (Amharic Name)', type: 'text', required: true },
         { name: 'departmentDescriptionAmharic', label: 'መግለጫ (Amharic Description)', type: 'textarea' }
       ];
    } else {
       textFields = [
         { name: 'departmentName', label: 'Department Name', type: 'text', required: true },
         { name: 'departmentDescription', label: 'Description', type: 'textarea' }
       ];
    }

    const baseFields = [
      {
        name: 'departmentType',
        label: i18n.language === 'am' ? 'አይነት' : 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'ACADEMIC', label: i18n.language === 'am' ? 'አካዳሚክ' : 'Academic' },
          { value: 'ADMINISTRATIVE', label: i18n.language === 'am' ? 'አስተዳደር' : 'Administrative' }
        ]
      },
      {
        name: 'departmentStatus',
        label: i18n.language === 'am' ? 'ሁኔታ' : 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ACTIVE', label: i18n.language === 'am' ? 'ገባሪ' : 'Active' },
          { value: 'INACTIVE', label: i18n.language === 'am' ? 'የማይሰራ' : 'Inactive' }
        ]
      },
      ...textFields
    ];

    // Conditionally splice in the unique relational bindings based on the LIVE monitored form type
    if (activeFormType === 'ACADEMIC') {
      baseFields.splice(2, 0, {
        name: 'collegeId',
        label: i18n.language === 'am' ? 'የተሳሰረበት ኮሌጅ' : 'Linked College',
        type: 'select',
        required: true,
        options: colleges.map(c => ({ value: c.id, label: i18n.language === 'am' ? (c.collegeNameAmharic || c.collegeName) : c.collegeName }))
      });
    } else if (activeFormType === 'ADMINISTRATIVE') {
      baseFields.splice(2, 0, {
        name: 'parentDepartmentId',
        type: 'custom',
        render: ({ value, onChange }) => {
           const selects = [];
           let currentParentId = null;

           for (let i = 0; i <= adminHierarchy.length; i++) {
             let availableOptions = [];
             
             if (currentParentId === null) {
               availableOptions = parentDepartments.filter(d => !d.parentDepartmentId);
             } else {
               availableOptions = adminChildrenOptions[currentParentId];
             }

             if (!availableOptions || availableOptions.length === 0) break;

             const selectedValue = adminHierarchy[i] || '';

             selects.push(
               <div className="common-form-group" key={`admin_dept_${i}`} style={{ marginBottom: i < adminHierarchy.length ? '1rem' : '0' }}>
                 <label className="common-form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                   {i18n.language === 'am' ? `ዋና ዲፓርትመንት (ደረጃ ${i + 1})` : `Parent Department (Level ${i + 1})`}
                 </label>
                 <select
                   className="common-form-select"
                   value={selectedValue}
                   onChange={async (e) => {
                     const val = e.target.value;
                     const newHierarchy = adminHierarchy.slice(0, i);
                     if (val) {
                       newHierarchy.push(val);
                       onChange(val);
                       
                       try {
                         if (!adminChildrenOptions[val]) {
                           const res = await departmentService.getDepartmentsByParent(val);
                           if (res?.success) {
                             setAdminChildrenOptions(prev => ({ ...prev, [val]: res.data }));
                           }
                         }
                       } catch (err) {}
                     } else {
                       onChange(i > 0 ? newHierarchy[i-1] : null);
                     }
                     setAdminHierarchy(newHierarchy);
                   }}
                 >
                   <option value="">{i18n.language === 'am' ? "-- ዲፓርትመንት ምረጥ --" : "-- Select Department --"}</option>
                   {availableOptions.filter(d => d.id !== editingDept?.id).map(d => (
                     <option key={d.id} value={d.id}>{i18n.language === 'am' ? (d.departmentNameAmharic || d.departmentName) : d.departmentName}</option>
                   ))}
                 </select>
               </div>
             );

             if (!selectedValue) break;
             currentParentId = selectedValue;
           }

           return <div>{selects}</div>;
        }
      });
    }

    return baseFields;
  };

  return (
    <div className="departments-container">
      {/* Search and Action Toolbar */}
      <div className="departments-top-toolbar">
        <label className="department-search-wrapper" htmlFor="searchDepartment">
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="searchDepartment"
            type="text"
            placeholder={i18n.language === 'am' ? "ዲፓርትመንቶችን በስም ወይም በመግለጫ ይፈልጉ..." : "Search departments by name or description..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn-add-department" onClick={handleOpenAdd}>
          <Plus size={18} /> {i18n.language === 'am' ? "ዲፓርትመንት አክል" : "Add Department"}
        </button>
      </div>

      {/* Main Data Table */}
      <div className="departments-table-card">
        <div className="department-table-responsive-wrapper">
          <table className="department-modern-data-table">
            <thead>
              <tr>
                {i18n.language === 'am' ? (
                  <th className="department-sortable-header" onClick={() => handleSort('departmentNameAmharic')}>
                    <div className="department-th-content">የዲፓርትመንት ስም {renderSortIcon('departmentNameAmharic')}</div>
                  </th>
                ) : (
                  <th className="department-sortable-header" onClick={() => handleSort('departmentName')}>
                    <div className="department-th-content">Department Name {renderSortIcon('departmentName')}</div>
                  </th>
                )}
                <th>{i18n.language === 'am' ? "አይነት" : "Type"}</th>
                <th>{i18n.language === 'am' ? "ኮሌጅ / ወላጅ" : "College / Parent"}</th>
                <th>{i18n.language === 'am' ? "ሁኔታ" : "Status"}</th>
                <th className="department-sortable-header" onClick={() => handleSort('createdAt')}>
                  <div className="department-th-content">{i18n.language === 'am' ? "የተፈጠረበት ቀን" : "Created Date"} {renderSortIcon('createdAt')}</div>
                </th>
                <th>{i18n.language === 'am' ? "እርምጃዎች" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "በመጫን ላይ..." : "Loading..."}</td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>{i18n.language === 'am' ? "ምንም ዲፓርትመንት አልተገኘም።" : "No departments found."}</td>
                </tr>
              ) : (
                departments.map(dept => (
                  <tr key={dept.id}>
                    {i18n.language === 'am' ? (
                       <td className="department-primary-text">{dept.departmentNameAmharic || dept.departmentName}</td>
                    ) : (
                       <td className="department-primary-text">{dept.departmentName}</td>
                    )}
                    <td>
                      <span className={`department-badge ${dept.departmentType === 'ACADEMIC' ? 'department-badge-academic' : 'department-badge-admin'}`}>
                        {dept.departmentType}
                      </span>
                    </td>
                    <td>
                      {dept.departmentType === 'ACADEMIC' && dept.collegeId
                        ? colleges.find(c => c.id === dept.collegeId)?.[i18n.language === 'am' ? 'collegeNameAmharic' : 'collegeName'] || colleges.find(c => c.id === dept.collegeId)?.collegeName || (i18n.language === 'am' ? 'የተሳሰረ' : 'Linked')
                        : dept.parentDepartmentId
                          ? (parentDepartments.find(p => p.id === dept.parentDepartmentId)?.[i18n.language === 'am' ? 'departmentNameAmharic' : 'departmentName']
                            || parentDepartments.find(p => p.id === dept.parentDepartmentId)?.departmentName
                            || departments.find(p => p.id === dept.parentDepartmentId)?.[i18n.language === 'am' ? 'departmentNameAmharic' : 'departmentName']
                            || departments.find(p => p.id === dept.parentDepartmentId)?.departmentName
                            || parentNamesCache[dept.parentDepartmentId]
                            || (i18n.language === 'am' ? 'ያልታወቀ ወላጅ' : 'Unknown Parent'))
                          : (i18n.language === 'am' ? 'ምንም (ዋና)' : 'None (Root)')
                      }
                    </td>
                    <td>
                      <span className={`department-badge ${dept.departmentStatus === 'ACTIVE' ? 'department-badge-active' : 'department-badge-inactive'}`}>
                        {dept.departmentStatus}
                      </span>
                    </td>
                    <td>{new Date(dept.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="department-table-actions">
                        <button className="department-action-btn-light" onClick={() => handleOpenEdit(dept)} title={i18n.language === 'am' ? "አስተካክል" : "Edit"}>
                          <Pencil size={14} />
                        </button>
                        <button className="department-action-btn-light department-action-btn-danger" onClick={() => triggerDelete(dept)} title={i18n.language === 'am' ? "ሰርዝ" : "Delete"}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Toolbar: Page Limit & Pagination */}
        <div className="department-table-footer">
          <div className="department-page-limit-selector">
            <span>{i18n.language === 'am' ? "አሳይ" : "Show"}</span>
            <select
              className="department-limit-dropdown"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>{i18n.language === 'am' ? "መዝገቦች" : "entries"}</span>
          </div>

          <div className="department-pagination-controls">
            <span>{i18n.language === 'am' ? `${(page - 1) * limit + 1} እስከ ${Math.min(page * limit, pagination.total)} ከ ${pagination.total} በማሳየት ላይ` : `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, pagination.total)} of ${pagination.total}`}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="department-page-btn"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="department-page-btn"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Wide Modal overlaid with backdrop */}
      {isFormModalOpen && (
        <div className="department-modal-overlay" onClick={closeFormModal}>
          <div className="department-modal-form-wrapper department-wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="department-modal-form-header">
              <h3>{editingDept 
                ? (i18n.language === 'am' ? 'ዲፓርትመንት አስተካክል' : 'Edit Department') 
                : (i18n.language === 'am' ? 'አዲስ ዲፓርትመንት አክል' : 'Add New Department')}</h3>
              <button className="department-close-btn" onClick={closeFormModal}><X size={20} /></button>
            </div>

            <CommonForm
              fields={getDynamicFields()}
              initialData={initialFormData}
              onChange={(formState) => {
                // If user changes DepartmentType in real-time, trigger a rerender locally 
                // so the conditional College vs Parent Parent fields immediately swap out!
                if (formState.departmentType && formState.departmentType !== activeFormType) {
                  setActiveFormType(formState.departmentType);
                }
              }}
              onSubmit={handleFormSubmit}
              onCancel={closeFormModal}
              twoColumns={true}
              submitText={editingDept 
                ? (i18n.language === 'am' ? "ዲፓርትመንት አዘምን" : "Update Department") 
                : (i18n.language === 'am' ? "ዲፓርትመንት ፍጠር" : "Create Department")}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal for Deletions */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={i18n.language === 'am' ? "ዲፓርትመንት ሰርዝ" : "Delete Department"}
        message={i18n.language === 'am' 
          ? `በእርግጥ "${deptToDelete?.departmentNameAmharic || deptToDelete?.departmentName}" ዲፓርትመንትን መሰረዝ ይፈልጋሉ? ይህ እርምጃ ሊቀለበስ አይችልም።` 
          : `Are you sure you want to permanently delete "${deptToDelete?.departmentName}"? This action cannot be undone.`}
        confirmText={i18n.language === 'am' ? "መሰረዙን አረጋግጥ" : "Confirm Delete"}
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

    </div>
  );
};

export default Departments;
