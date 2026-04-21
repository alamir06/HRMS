import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Trash2, ArrowUpDown, ArrowDown, ArrowUp, Pencil, X, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { toast } from 'react-toastify';
import { benefitService } from '../../../../services/benefitService';
import { employeeService } from '../../../../services/employeeService';
import CommonForm from '../../../../components/common/CommonForm';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import { formatEthiopianDate } from '../../../../utils/dateTime';
import '../BenefitList/BenefitList.css'; 
import './BenefitAssignment.css';

const ENROLLMENT_STATUSES = ['ACTIVE', 'CANCELLED', 'SUSPENDED'];

const BenefitAssignment = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [benefitOptions, setBenefitOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('enrollmentDate');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters for the table (optional explicit filter in grid, but we fetch all default)
  const [selectedBenefitFilter, setSelectedBenefitFilter] = useState('');

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Dependencies
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const empRes = await employeeService.getAllEmployees(1, 400);
        if (empRes?.success) setEmployees(empRes.data || []);
      } catch (e) {
        console.error("Failed to load employees");
      }
      try {
        const benRes = await benefitService.getAllBenefits(1, 400, '', 'benefitName', 'ASC');
        if (benRes?.success) setBenefitOptions(benRes.data || []);
      } catch(e) {
        console.error("Failed to load available benefits");
      }
    };
    loadDependencies();
  }, []);

  const loadEnrollments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await benefitService.getAllEnrollments(selectedBenefitFilter);
      if (res && res.success !== false) {
          const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          setEnrollments(data);
          setPagination({ total: data.length, pages: 1 });
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load enrollments");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBenefitFilter]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} color="var(--text-secondary)" />;
    return sortOrder === 'ASC' ? <ArrowUp size={14} color="var(--primary-color)" /> : <ArrowDown size={14} color="var(--primary-color)" />;
  };

  const closeModals = () => {
    setIsEnrollModalOpen(false);
    setIsStatusModalOpen(false);
    setSelectedEnrollment(null);
  };

  const handleEnrollSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      await benefitService.enrollEmployee({
        ...formData,
        coverageAmount: formData.coverageAmount === '' ? null : Number(formData.coverageAmount),
        employeeContribution: formData.employeeContribution === '' ? null : Number(formData.employeeContribution),
        companyContribution: formData.companyContribution === '' ? null : Number(formData.companyContribution),
        endDate: formData.endDate || null,
      });
      toast.success('Employee enrolled successfully');
      closeModals();
      loadEnrollments();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to enroll employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusSubmit = async (formData) => {
    if (!selectedEnrollment) return;
    try {
      setIsSubmitting(true);
      await benefitService.updateEnrollmentStatus(selectedEnrollment.enrollmentId, {
        status: formData.status,
        endDate: formData.endDate || null,
      });
      toast.success('Enrollment status updated');
      closeModals();
      loadEnrollments();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update enrollment status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enrollmentFormFields = useMemo(() => [
    { name: 'employeeId', label: 'Employee', type: 'select', required: true, options: employees.map(emp => ({ value: emp.id, label: `${(emp.firstName || '').trim()} ${(emp.lastName || '').trim()} (${emp.id})` })) },
    { name: 'benefitId', label: 'Benefit', type: 'select', required: true, options: benefitOptions.map(item => ({ value: item.id, label: `${item.benefitName} (${item.benefitType})` })) },
    { name: 'enrollmentDate', label: 'Enrollment Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ENROLLMENT_STATUSES.map(s => ({ value: s, label: s })) },
    { name: 'coverageAmount', label: 'Coverage Amount', type: 'number' },
    { name: 'employeeContribution', label: 'Employee Contribution', type: 'number' },
    { name: 'companyContribution', label: 'Company Contribution', type: 'number' },
    { name: 'endDate', label: 'End Date', type: 'date' }
  ], [employees, benefitOptions]);

  const statusFormFields = [
    { name: 'status', label: 'New Status', type: 'select', required: true, options: ENROLLMENT_STATUSES.map(s => ({ value: s, label: s })) },
    { name: 'endDate', label: 'End Date', type: 'date' }
  ];

  return (
    <div className="benefit-container">
      <div className="benefit-top-toolbar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', width: '100%' }}>
        <label className="benefit-search-wrapper" htmlFor="searchEnrollment" style={{ flex: 1 }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchEnrollment" 
            type="text" 
            placeholder={"Search enrollments..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        
        <select 
          className="benefit-limit-dropdown" 
          style={{ height: '48px', padding: '0 1rem', minWidth: '180px' }}
          value={selectedBenefitFilter}
          onChange={(e) => setSelectedBenefitFilter(e.target.value)}
        >
          <option value="">All Benefit Types</option>
          {benefitOptions.map(b => (
             <option key={b.id} value={b.id}>{b.benefitName}</option>
          ))}
        </select>

        <button className="benefit-btn-add" onClick={() => setIsEnrollModalOpen(true)}>
          <Plus size={18} /> Enroll Employee
        </button>
      </div>

      <div className="benefit-table-card">
        <div className="benefit-table-responsive-wrapper">
          <table className="benefit-modern-data-table">
            <thead>
              <tr>
                <th>Benefit</th>
                <th>Employee</th>
                <th onClick={() => handleSort('enrollmentDate')} className="benefit-sortable-header">
                   <div className="benefit-th-content">Enrollment Date {renderSortIcon('enrollmentDate')}</div>
                </th>
                <th>End Date</th>
                <th>Coverage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : enrollments.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No enrollments found. Select an employee to verify directly if the global filter is empty.</td></tr>
              ) : (
                enrollments.map((enr, index) => {
                  return (
                    <tr key={enr.enrollmentId || index}>
                      <td className="col-primary-text">{enr.benefitName}</td>
                      <td>{enr.firstName} {enr.lastName}</td>
                      <td>{formatEthiopianDate(enr.enrollmentDate)}</td>
                      <td>{enr.endDate ? formatEthiopianDate(enr.endDate) : '-'}</td>
                      <td>{enr.coverageAmount ?? '-'}</td>
                      <td>
                         <span className={`benefit-status-badge benefit-status-${enr.status === 'ACTIVE' || enr.status === 'Active' ? 'true' : 'false'}`}>
                           {enr.status}
                         </span>
                      </td>
                      <td>
                        <div className="benefit-table-actions">
                          <button 
                            className="benefit-action-btn-light" 
                            onClick={() => { setSelectedEnrollment(enr); setIsStatusModalOpen(true); }}
                            title="Update Status"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            className="benefit-action-btn-light benefit-action-btn-danger" 
                            onClick={() => { setEnrollmentToDelete(enr); setDeleteModalOpen(true); }} 
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="benefit-table-footer">
          <div className="benefit-page-limit-selector">
            <span>Show</span>
            <select className="benefit-limit-dropdown" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
               <option value={5}>5</option>
               <option value={10}>10</option>
               <option value={20}>20</option>
               <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
          <div className="benefit-pagination-controls">
            <span>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="benefit-page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button>
               <button className="benefit-page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {isEnrollModalOpen && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="benefit-modal-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="benefit-modal-form-header">
              <h3>Enroll Employee</h3>
              <button className="benefit-close-btn" onClick={closeModals}><X size={20} /></button>
            </div>
            <CommonForm 
              fields={enrollmentFormFields}
              initialData={{
                enrollmentDate: new Date().toISOString().substring(0, 10),
                status: 'ACTIVE'
              }}
              onSubmit={handleEnrollSubmit}
              onCancel={closeModals}
              twoColumns={true}
              submitText="Enroll Employee"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="benefit-modal-form-wrapper" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="benefit-modal-form-header">
              <h3>Update Enrollment Status</h3>
              <button className="benefit-close-btn" onClick={closeModals}><X size={20} /></button>
            </div>
            <CommonForm 
              fields={statusFormFields}
              initialData={{
                status: selectedEnrollment?.status || 'ACTIVE',
                endDate: selectedEnrollment?.endDate?.substring(0, 10) || ''
              }}
              onSubmit={handleStatusSubmit}
              onCancel={closeModals}
              twoColumns={false}
              submitText="Update Status"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        title="Delete Enrollment Record"
        message="Are you sure you want to delete this benefit enrollment record? This cannot be undone."
        confirmText="Confirm Delete"
        isDestructive={true}
        onConfirm={async () => {
          setDeleteModalOpen(false);
          toast.warning("Delete enrollment is not fully supported on the backend yet.");
        }}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default BenefitAssignment;
