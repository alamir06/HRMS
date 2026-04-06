import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { employeeService } from '../../services/employeeService';
import './Benefit.css';

const BENEFIT_TYPES = ['HEALTH', 'RETIREMENT', 'INSURANCE', 'WELLNESS', 'OTHER'];
const ENROLLMENT_STATUSES = ['ACTIVE', 'CANCELLED', 'SUSPENDED'];

const initialBenefitForm = {
  benefitName: '',
  benefitNameAmharic: '',
  description: '',
  descriptionAmharic: '',
  benefitType: 'HEALTH',
  costToCompany: '',
  isActive: true,
};

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

const Benefit = () => {
  const [benefits, setBenefits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeBenefits, setEmployeeBenefits] = useState([]);
  const [summary, setSummary] = useState(null);

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [savingBenefit, setSavingBenefit] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [employeeBenefitsLoading, setEmployeeBenefitsLoading] = useState(false);

  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeBenefitStatusFilter, setEmployeeBenefitStatusFilter] = useState('');

  const [benefitForm, setBenefitForm] = useState(initialBenefitForm);
  const [enrollmentForm, setEnrollmentForm] = useState(initialEnrollmentForm);
  const [statusForm, setStatusForm] = useState(initialStatusForm);
  const [editingBenefitId, setEditingBenefitId] = useState('');

  const selectedBenefit = useMemo(
    () => benefits.find((item) => item.id === selectedBenefitId) || null,
    [benefits, selectedBenefitId]
  );

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const res = await api.get('/benefits/catalog?page=1&limit=200&sortBy=createdAt&sortOrder=DESC');
      setBenefits(res.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load benefit catalog');
    } finally {
      setCatalogLoading(false);
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
      const res = await api.get(`/benefits/catalog/${benefitId}/summary`);
      setSummary(res.data?.data || null);
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
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await api.get(`/benefits/employees/${employeeId}${query}`);
      const list = res.data?.data || [];
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

  useEffect(() => {
    loadCatalog();
    loadEmployees();
  }, [loadCatalog, loadEmployees]);

  useEffect(() => {
    loadSummary(selectedBenefitId);
  }, [selectedBenefitId, loadSummary]);

  useEffect(() => {
    loadEmployeeBenefits(selectedEmployeeId, employeeBenefitStatusFilter);
  }, [selectedEmployeeId, employeeBenefitStatusFilter, loadEmployeeBenefits]);

  const onBenefitFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setBenefitForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onEnrollmentFieldChange = (event) => {
    const { name, value } = event.target;
    setEnrollmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const onStatusFieldChange = (event) => {
    const { name, value } = event.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetBenefitForm = () => {
    setBenefitForm(initialBenefitForm);
    setEditingBenefitId('');
  };

  const handleEditBenefit = (benefit) => {
    setEditingBenefitId(benefit.id);
    setBenefitForm({
      benefitName: benefit.benefitName || '',
      benefitNameAmharic: benefit.benefitNameAmharic || '',
      description: benefit.description || '',
      descriptionAmharic: benefit.descriptionAmharic || '',
      benefitType: benefit.benefitType || 'HEALTH',
      costToCompany:
        benefit.costToCompany === null || benefit.costToCompany === undefined
          ? ''
          : String(benefit.costToCompany),
      isActive: Boolean(benefit.isActive),
    });
  };

  const handleSaveBenefit = async (event) => {
    event.preventDefault();

    const payload = {
      ...benefitForm,
      costToCompany: benefitForm.costToCompany === '' ? null : Number(benefitForm.costToCompany),
      benefitNameAmharic: benefitForm.benefitNameAmharic || null,
      description: benefitForm.description || null,
      descriptionAmharic: benefitForm.descriptionAmharic || null,
    };

    try {
      setSavingBenefit(true);
      if (editingBenefitId) {
        await api.patch(`/benefits/catalog/${editingBenefitId}`, payload);
        toast.success('Benefit updated');
      } else {
        await api.post('/benefits/catalog', payload);
        toast.success('Benefit created');
      }
      resetBenefitForm();
      await loadCatalog();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save benefit');
    } finally {
      setSavingBenefit(false);
    }
  };

  const handleDeleteBenefit = async (id) => {
    try {
      await api.delete(`/benefits/catalog/${id}`);
      toast.success('Benefit deleted');
      if (selectedBenefitId === id) {
        setSelectedBenefitId('');
      }
      if (editingBenefitId === id) {
        resetBenefitForm();
      }
      await loadCatalog();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete benefit');
    }
  };

  const handleEnrollEmployee = async (event) => {
    event.preventDefault();
    try {
      setSavingEnrollment(true);
      await api.post('/benefits/enrollments/enroll', {
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
      await api.post(`/benefits/enrollments/${statusForm.enrollmentId}/status`, {
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
    <div className="benefit-page">
      <div className="benefit-header">
        <div>
          <h2>Benefit Management</h2>
          <p>Manage benefit catalog, enroll employees, and review summary data.</p>
        </div>
        <button className="benefit-btn secondary" onClick={loadCatalog} disabled={catalogLoading}>
          <RefreshCw size={16} />
          Refresh Catalog
        </button>
      </div>

      <section className="benefit-section">
        <div className="benefit-section-head">
          <h3>{editingBenefitId ? 'Edit Benefit' : 'Create Benefit'}</h3>
          {editingBenefitId && (
            <button className="benefit-btn ghost" onClick={resetBenefitForm}>
              <Plus size={16} />
              New Benefit
            </button>
          )}
        </div>

        <form className="benefit-grid-form" onSubmit={handleSaveBenefit}>
          <label>
            Benefit Name *
            <input name="benefitName" value={benefitForm.benefitName} onChange={onBenefitFieldChange} required />
          </label>
          <label>
            Benefit Name (Amharic)
            <input name="benefitNameAmharic" value={benefitForm.benefitNameAmharic} onChange={onBenefitFieldChange} />
          </label>
          <label>
            Type *
            <select name="benefitType" value={benefitForm.benefitType} onChange={onBenefitFieldChange} required>
              {BENEFIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cost To Company
            <input
              type="number"
              min="0"
              step="0.01"
              name="costToCompany"
              value={benefitForm.costToCompany}
              onChange={onBenefitFieldChange}
            />
          </label>
          <label className="span-2">
            Description
            <textarea name="description" rows="2" value={benefitForm.description} onChange={onBenefitFieldChange} />
          </label>
          <label className="span-2">
            Description (Amharic)
            <textarea
              name="descriptionAmharic"
              rows="2"
              value={benefitForm.descriptionAmharic}
              onChange={onBenefitFieldChange}
            />
          </label>
          <label className="check">
            <input type="checkbox" name="isActive" checked={benefitForm.isActive} onChange={onBenefitFieldChange} />
            Active
          </label>
          <div className="actions span-2">
            <button className="benefit-btn primary" type="submit" disabled={savingBenefit}>
              <Save size={16} />
              {savingBenefit ? 'Saving...' : editingBenefitId ? 'Update Benefit' : 'Create Benefit'}
            </button>
          </div>
        </form>
      </section>

      <section className="benefit-section">
        <div className="benefit-section-head">
          <h3>Benefit Catalog</h3>
          <span>{catalogLoading ? 'Loading...' : `${benefits.length} record(s)`}</span>
        </div>
        <div className="benefit-table-wrap">
          <table className="benefit-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {benefits.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No benefits found.
                  </td>
                </tr>
              ) : (
                benefits.map((benefit) => (
                  <tr key={benefit.id}>
                    <td>{benefit.benefitName}</td>
                    <td>{benefit.benefitType}</td>
                    <td>{benefit.costToCompany ?? '-'}</td>
                    <td>
                      <span className={`status-chip ${benefit.isActive ? 'ok' : 'off'}`}>
                        {benefit.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button className="benefit-btn small" onClick={() => setSelectedBenefitId(benefit.id)}>
                        Summary
                      </button>
                      <button className="benefit-btn small" onClick={() => handleEditBenefit(benefit)}>
                        Edit
                      </button>
                      <button className="benefit-btn small danger" onClick={() => handleDeleteBenefit(benefit.id)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="benefit-dual">
        <div className="benefit-section">
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
                {benefits.map((item) => (
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

        <div className="benefit-section">
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

      <section className="benefit-section">
        <div className="benefit-section-head">
          <h3>Benefit Summary</h3>
          <label className="summary-picker">
            Benefit
            <select value={selectedBenefitId} onChange={(e) => setSelectedBenefitId(e.target.value)}>
              <option value="">Select benefit</option>
              {benefits.map((item) => (
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
    </div>
  );
};

export default Benefit;