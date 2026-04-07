import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  BarChart3
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { benefitService } from '../../services/benefitService';
import CommonForm from '../../components/common/CommonForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import './Benefits.css';

const BENEFIT_TYPES = ['Health', 'Retirement', 'Insurance', 'Wellness', 'Other'];
const ENROLLMENT_STATUSES = ['Active', 'Cancelled', 'Suspended'];

const initialEnrollmentForm = {
  employeeId: '',
  benefitId: '',
  enrollmentDate: new Date().toISOString().slice(0, 10),
  coverageAmount: '',
  employeeContribution: '',
  companyContribution: '',
  status: 'ACTIVE',
  endDate: '',
};

const initialStatusForm = {
  enrollmentId: '',
  status: 'ACTIVE',
  endDate: '',
};

const benefitFormFields = [
  { name: 'benefitName', label: 'Benefit Name', type: 'text', required: true },
  { name: 'benefitNameAmharic', label: 'Name (Amharic)', type: 'text' },
  {
    name: 'benefitType',
    label: 'Type',
    type: 'select',
    required: true,
    options: BENEFIT_TYPES.map((item) => ({ value: item, label: item }))
  },
  { name: 'costToCompany', label: 'Cost To Company', type: 'number', min: 0 },
  {
    name: 'isActive',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' }
    ]
  },
  { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
  { name: 'descriptionAmharic', label: 'Description (Amharic)', type: 'textarea', fullWidth: true }
];

const Benefits = () => {
  const [benefits, setBenefits] = useState([]);
  const [benefitOptions, setBenefitOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeBenefits, setEmployeeBenefits] = useState([]);
  const [summary, setSummary] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [employeeBenefitsLoading, setEmployeeBenefitsLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [benefitToDelete, setBenefitToDelete] = useState(null);

  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeBenefitStatusFilter, setEmployeeBenefitStatusFilter] = useState('');

  const [enrollmentForm, setEnrollmentForm] = useState(initialEnrollmentForm);
  const [statusForm, setStatusForm] = useState(initialStatusForm);

  const selectedBenefit = useMemo(
    () => benefitOptions.find((item) => item.id === selectedBenefitId) || null,
    [benefitOptions, selectedBenefitId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await benefitService.getAllBenefits(page, limit, debouncedSearch, sortBy, sortOrder);
      if (res.success) {
        setBenefits(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
      } else {
        toast.error('Failed to load benefits');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load benefit catalog');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  const loadBenefitOptions = useCallback(async () => {
    try {
      const res = await benefitService.getAllBenefits(1, 300, '', 'benefitName', 'ASC');
      if (res.success) {
        setBenefitOptions(res.data || []);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load benefit options');
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const res = await employeeService.getAllEmployees(1, 300, '', 'createdAt', 'DESC');
      setEmployees(res?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async (benefitId) => {
    if (!benefitId) {
      setSummary(null);
      return;
    }
    try {
      setSummaryLoading(true);
      const res = await benefitService.getBenefitSummary(benefitId);
      setSummary(res.data || null);
    } catch (error) {
      setSummary(null);
      toast.error(error?.response?.data?.error || 'Failed to load benefit summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadEmployeeBenefits = useCallback(async (employeeId, status = '') => {
    if (!employeeId) {
      setEmployeeBenefits([]);
      return;
    }
    try {
      setEmployeeBenefitsLoading(true);
      const res = await benefitService.getEmployeeBenefits(employeeId, status);
      const list = res.data || [];
      setEmployeeBenefits(list);
      setStatusForm((prev) => ({
        ...prev,
        enrollmentId: prev.enrollmentId || list[0]?.enrollmentId || '',
      }));
    } catch (error) {
      setEmployeeBenefits([]);
      toast.error(error?.response?.data?.error || 'Failed to load employee benefits');
    } finally {
      setEmployeeBenefitsLoading(false);
    }
  }, []);

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
    setEditingBenefit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (benefit) => {
    setEditingBenefit(benefit);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingBenefit(null);
  };

  useEffect(() => {
    loadCatalog();
    loadBenefitOptions();
    loadEmployees();
  }, [loadCatalog, loadBenefitOptions, loadEmployees]);

  useEffect(() => {
    loadSummary(selectedBenefitId);
  }, [selectedBenefitId, loadSummary]);

  useEffect(() => {
    loadEmployeeBenefits(selectedEmployeeId, employeeBenefitStatusFilter);
  }, [selectedEmployeeId, employeeBenefitStatusFilter, loadEmployeeBenefits]);

  const onEnrollmentFieldChange = (event) => {
    const { name, value } = event.target;
    setEnrollmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const onStatusFieldChange = (event) => {
    const { name, value } = event.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (formData) => {
    const payload = {
      benefitName: formData.benefitName,
      benefitNameAmharic: formData.benefitNameAmharic || null,
      description: formData.description || null,
      descriptionAmharic: formData.descriptionAmharic || null,
      benefitType: formData.benefitType,
      costToCompany: formData.costToCompany === '' ? null : Number(formData.costToCompany),
      isActive: formData.isActive === true || formData.isActive === 'true',
    };

    try {
      setIsSubmitting(true);
      if (editingBenefit) {
        const res = await benefitService.updateBenefit(editingBenefit.id, payload);
        if (res.success) {
          toast.success('Benefit updated successfully');
        } else {
          toast.error(res.error || 'Update failed');
        }
      } else {
        const res = await benefitService.createBenefit(payload);
        if (res.success) {
          toast.success('Benefit created successfully');
        } else {
          toast.error(res.error || 'Creation failed');
        }
      }

      closeFormModal();
      await loadCatalog();
      await loadBenefitOptions();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save benefit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (benefit) => {
    setBenefitToDelete(benefit);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!benefitToDelete) return;
    try {
      const res = await benefitService.deleteBenefit(benefitToDelete.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete benefit');
        return;
      }

      toast.success('Benefit deleted successfully');
      if (selectedBenefitId === benefitToDelete.id) {
        setSelectedBenefitId('');
      }
      if (editingBenefit?.id === benefitToDelete.id) {
        closeFormModal();
      }
      await loadCatalog();
      await loadBenefitOptions();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete benefit');
    } finally {
      setDeleteModalOpen(false);
      setBenefitToDelete(null);
    }
  };

  const handleEnrollEmployee = async (event) => {
    event.preventDefault();
    try {
      setSavingEnrollment(true);
      await benefitService.enrollEmployee({
        ...enrollmentForm,
        coverageAmount: enrollmentForm.coverageAmount === '' ? null : Number(enrollmentForm.coverageAmount),
        employeeContribution:
          enrollmentForm.employeeContribution === '' ? null : Number(enrollmentForm.employeeContribution),
        companyContribution:
          enrollmentForm.companyContribution === '' ? null : Number(enrollmentForm.companyContribution),
        endDate: enrollmentForm.endDate || null,
      });
      toast.success('Employee enrolled successfully');
      setSelectedEmployeeId(enrollmentForm.employeeId);
      setSelectedBenefitId(enrollmentForm.benefitId);
      setEnrollmentForm(initialEnrollmentForm);
      await loadEmployeeBenefits(enrollmentForm.employeeId, employeeBenefitStatusFilter);
      await loadSummary(enrollmentForm.benefitId);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to enroll employee');
    } finally {
      setSavingEnrollment(false);
    }
  };

  const handleUpdateEnrollmentStatus = async (event) => {
    event.preventDefault();
    if (!statusForm.enrollmentId) {
      toast.warning('Please choose an enrollment first');
      return;
    }
    try {
      setSavingStatus(true);
      await benefitService.updateEnrollmentStatus(statusForm.enrollmentId, {
        status: statusForm.status,
        endDate: statusForm.endDate || null,
      });
      toast.success('Enrollment status updated');
      await loadEmployeeBenefits(selectedEmployeeId, employeeBenefitStatusFilter);
      if (selectedBenefitId) {
        await loadSummary(selectedBenefitId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update enrollment status');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="benefits-container">
      <div className="benefits-top-toolbar">
        <label className="search-wrapper-benefit" htmlFor="searchBenefit">
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="searchBenefit"
            type="text"
            placeholder="Search benefits by name or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="btn-add-benefit" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Benefit
        </button>
      </div>

      <div className="benefits-table-card">
        <div className="table-responsive-wrapper">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => handleSort('benefitName')}>
                  <div className="th-content">Benefit Name {renderSortIcon('benefitName')}</div>
                </th>
                <th className="sortable-header" onClick={() => handleSort('benefitNameAmharic')}>
                  <div className="th-content">Name (Amharic) {renderSortIcon('benefitNameAmharic')}</div>
                </th>
                <th className="sortable-header" onClick={() => handleSort('benefitType')}>
                  <div className="th-content">Type {renderSortIcon('benefitType')}</div>
                </th>
                <th className="sortable-header" onClick={() => handleSort('costToCompany')}>
                  <div className="th-content">Cost {renderSortIcon('costToCompany')}</div>
                </th>
                <th>Status</th>
                <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                  <div className="th-content">Created Date {renderSortIcon('createdAt')}</div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : benefits.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No benefits found.</td>
                </tr>
              ) : (
                benefits.map((benefit) => (
                  <tr key={benefit.id}>
                    <td className="col-primary-text">{benefit.benefitName}</td>
                    <td>{benefit.benefitNameAmharic || '-'}</td>
                    <td>{benefit.benefitType}</td>
                    <td>{benefit.costToCompany ?? '-'}</td>
                    <td>
                      <span className={`badge ${benefit.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {benefit.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(benefit.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn-light" onClick={() => setSelectedBenefitId(benefit.id)} title="Summary">
                          <BarChart3 size={14} />
                        </button>
                        <button className="action-btn-light" onClick={() => handleOpenEdit(benefit)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn-light action-btn-danger" onClick={() => triggerDelete(benefit)} title="Delete">
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

        <div className="table-footer">
          <div className="page-limit-selector">
            <span>Show</span>
            <select
              className="limit-dropdown"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="pagination-controls">
            <span>
              Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft size={16} />
              </button>
              <button className="page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="benefit-subsections">
        <div className="benefit-section-card">
          <div className="benefit-section-head">
            <h3>Enroll Employee</h3>
            <span>{employeesLoading ? 'Loading employees...' : `${employees.length} employee(s)`}</span>
          </div>
          <form className="benefit-grid-form" onSubmit={handleEnrollEmployee}>
            <label>
              Employee *
              <select
                name="employeeId"
                value={enrollmentForm.employeeId}
                onChange={onEnrollmentFieldChange}
                required
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {(emp.firstName || '').trim()} {(emp.lastName || '').trim()} ({emp.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Benefit *
              <select name="benefitId" value={enrollmentForm.benefitId} onChange={onEnrollmentFieldChange} required>
                <option value="">Select benefit</option>
                {benefitOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.benefitName} ({item.benefitType})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Enrollment Date *
              <input
                type="date"
                name="enrollmentDate"
                value={enrollmentForm.enrollmentDate}
                onChange={onEnrollmentFieldChange}
                required
              />
            </label>
            <label>
              Status
              <select name="status" value={enrollmentForm.status} onChange={onEnrollmentFieldChange}>
                {ENROLLMENT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coverage Amount
              <input
                type="number"
                step="0.01"
                min="0"
                name="coverageAmount"
                value={enrollmentForm.coverageAmount}
                onChange={onEnrollmentFieldChange}
              />
            </label>
            <label>
              Employee Contribution
              <input
                type="number"
                step="0.01"
                min="0"
                name="employeeContribution"
                value={enrollmentForm.employeeContribution}
                onChange={onEnrollmentFieldChange}
              />
            </label>
            <label>
              Company Contribution
              <input
                type="number"
                step="0.01"
                min="0"
                name="companyContribution"
                value={enrollmentForm.companyContribution}
                onChange={onEnrollmentFieldChange}
              />
            </label>
            <label>
              End Date
              <input type="date" name="endDate" value={enrollmentForm.endDate} onChange={onEnrollmentFieldChange} />
            </label>
            <div className="actions span-2">
              <button className="benefit-btn primary" type="submit" disabled={savingEnrollment}>
                {savingEnrollment ? 'Submitting...' : 'Enroll Employee'}
              </button>
            </div>
          </form>
        </div>

        <div className="benefit-section-card">
          <div className="benefit-section-head">
            <h3>Enrollment Status & Employee Benefits</h3>
          </div>
          <div className="inline-filters">
            <label>
              Employee
              <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {(emp.firstName || '').trim()} {(emp.lastName || '').trim()} ({emp.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status Filter
              <select value={employeeBenefitStatusFilter} onChange={(e) => setEmployeeBenefitStatusFilter(e.target.value)}>
                <option value="">All</option>
                {ENROLLMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form className="benefit-grid-form compact" onSubmit={handleUpdateEnrollmentStatus}>
            <label className="span-2">
              Enrollment
              <select name="enrollmentId" value={statusForm.enrollmentId} onChange={onStatusFieldChange}>
                <option value="">Select enrollment</option>
                {employeeBenefits.map((item) => (
                  <option key={item.enrollmentId} value={item.enrollmentId}>
                    {item.benefitName} | {item.status} | {item.enrollmentDate?.slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              New Status
              <select name="status" value={statusForm.status} onChange={onStatusFieldChange}>
                {ENROLLMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              End Date
              <input type="date" name="endDate" value={statusForm.endDate} onChange={onStatusFieldChange} />
            </label>
            <div className="actions span-2">
              <button className="benefit-btn primary" type="submit" disabled={savingStatus}>
                {savingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>

          <div className="benefit-table-wrap">
            <table className="benefit-table slim">
              <thead>
                <tr>
                  <th>Benefit</th>
                  <th>Status</th>
                  <th>Enrollment Date</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {employeeBenefitsLoading ? (
                  <tr>
                    <td colSpan="4" className="empty">
                      Loading...
                    </td>
                  </tr>
                ) : employeeBenefits.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty">
                      No records for selected employee.
                    </td>
                  </tr>
                ) : (
                  employeeBenefits.map((item) => (
                    <tr key={item.enrollmentId}>
                      <td>{item.benefitName}</td>
                      <td>{item.status}</td>
                      <td>{item.enrollmentDate?.slice(0, 10)}</td>
                      <td>{item.coverageAmount ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="benefit-section-card">
        <div className="benefit-section-head">
          <h3>Benefit Summary</h3>
          <label className="summary-picker">
            Benefit
            <select value={selectedBenefitId} onChange={(e) => setSelectedBenefitId(e.target.value)}>
              <option value="">Select benefit</option>
              {benefitOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.benefitName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {summaryLoading ? (
          <p className="summary-empty">Loading summary...</p>
        ) : !summary ? (
          <p className="summary-empty">Choose a benefit to load summary and recent enrollments.</p>
        ) : (
          <>
            <div className="summary-metrics">
              <div className="metric-card">
                <span>Benefit</span>
                <strong>{summary.benefit?.benefitName || selectedBenefit?.benefitName || '-'}</strong>
              </div>
              <div className="metric-card">
                <span>Active</span>
                <strong>{summary.stats?.activeEnrollments ?? 0}</strong>
              </div>
              <div className="metric-card">
                <span>Cancelled</span>
                <strong>{summary.stats?.cancelledEnrollments ?? 0}</strong>
              </div>
              <div className="metric-card">
                <span>Suspended</span>
                <strong>{summary.stats?.suspendedEnrollments ?? 0}</strong>
              </div>
              <div className="metric-card">
                <span>Total Employee Contribution</span>
                <strong>{summary.stats?.totalEmployeeContribution ?? 0}</strong>
              </div>
              <div className="metric-card">
                <span>Total Company Contribution</span>
                <strong>{summary.stats?.totalCompanyContribution ?? 0}</strong>
              </div>
            </div>

            <div className="benefit-table-wrap">
              <table className="benefit-table slim">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Enrollment Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.recentEnrollments || []).length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty">
                        No recent enrollments
                      </td>
                    </tr>
                  ) : (
                    summary.recentEnrollments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {(item.firstName || '').trim()} {(item.lastName || '').trim()} ({item.employeeId})
                        </td>
                        <td>{item.status}</td>
                        <td>{item.enrollmentDate?.slice(0, 10)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {isFormModalOpen && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-form-wrapper" onClick={(event) => event.stopPropagation()}>
            <div className="modal-form-header">
              <h3>{editingBenefit ? 'Edit Benefit' : 'Add New Benefit'}</h3>
              <button className="close-btn" onClick={closeFormModal}><X size={20} /></button>
            </div>

            <CommonForm
              fields={benefitFormFields}
              initialData={{
                benefitType: 'HEALTH',
                costToCompany: '',
                ...editingBenefit,
                isActive: String(editingBenefit?.isActive ?? true)
              }}
              onSubmit={handleFormSubmit}
              onCancel={closeFormModal}
              twoColumns={true}
              submitText={editingBenefit ? 'Update Benefit' : 'Create Benefit'}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Benefit"
        message={`Are you sure you want to permanently delete "${benefitToDelete?.benefitName}"? This action cannot be undone.`}
        confirmText="Confirm Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setBenefitToDelete(null);
        }}
      />
    </div>
  );
};

export default Benefits;