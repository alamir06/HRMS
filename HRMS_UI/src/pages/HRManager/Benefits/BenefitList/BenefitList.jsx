import React, { useCallback, useEffect, useState } from 'react';
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
  ArrowUp
} from 'lucide-react';
import { benefitService } from '../../../../services/benefitService';
import CommonForm from '../../../../components/common/CommonForm';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import { formatEthiopianDate } from '../../../../utils/dateTime';
import './BenefitList.css';

const BENEFIT_TYPES = ['Health', 'Retirement', 'Insurance', 'Wellness', 'Other'];

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

const BenefitList = () => {
  const [benefits, setBenefits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

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
      if (editingBenefit?.id === benefitToDelete.id) {
        closeFormModal();
      }
      await loadCatalog();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete benefit');
    } finally {
      setDeleteModalOpen(false);
      setBenefitToDelete(null);
    }
  };

  return (
    <div className="benefit-container">
      <div className="benefit-top-toolbar">
        <label className="benefit-search-wrapper" htmlFor="searchBenefit">
          <Search size={18} color="var(--text-secondary)" />
          <input
            id="searchBenefit"
            type="text"
            placeholder="Search benefits by name or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="benefit-btn-add" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Benefit
        </button>
      </div>

      <div className="benefit-table-card">
        <div className="benefit-table-responsive-wrapper">
          <table className="benefit-modern-data-table">
            <thead>
              <tr>
                <th className="benefit-sortable-header" onClick={() => handleSort('benefitName')}>
                  <div className="benefit-th-content">Benefit Name {renderSortIcon('benefitName')}</div>
                </th>
                <th className="benefit-sortable-header" onClick={() => handleSort('benefitNameAmharic')}>
                  <div className="benefit-th-content">Name (Amharic) {renderSortIcon('benefitNameAmharic')}</div>
                </th>
                <th className="benefit-sortable-header" onClick={() => handleSort('benefitType')}>
                  <div className="benefit-th-content">Type {renderSortIcon('benefitType')}</div>
                </th>
                <th className="benefit-sortable-header" onClick={() => handleSort('costToCompany')}>
                  <div className="benefit-th-content">Cost {renderSortIcon('costToCompany')}</div>
                </th>
                <th>Status</th>
                <th className="benefit-sortable-header" onClick={() => handleSort('createdAt')}>
                  <div className="benefit-th-content">Created Date {renderSortIcon('createdAt')}</div>
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
                      <span className={`benefit-status-badge benefit-status-${benefit.isActive}`}>
                        {benefit.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatEthiopianDate(benefit.createdAt)}</td>
                    <td>
                      <div className="benefit-table-actions">
                        <button className="benefit-action-btn-light" onClick={() => handleOpenEdit(benefit)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="benefit-action-btn-light benefit-action-btn-danger" onClick={() => triggerDelete(benefit)} title="Delete">
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

        <div className="benefit-table-footer">
          <div className="benefit-page-limit-selector">
            <span>Show</span>
            <select
              className="benefit-limit-dropdown"
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

          <div className="benefit-pagination-controls">
            <span>
              Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="benefit-page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft size={16} />
              </button>
              <button className="benefit-page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="benefit-modal-form-wrapper" onClick={(event) => event.stopPropagation()}>
            <div className="benefit-modal-form-header">
              <h3>{editingBenefit ? 'Edit Benefit' : 'Add New Benefit'}</h3>
              <button className="benefit-close-btn" onClick={closeFormModal}><X size={20} /></button>
            </div>

            <CommonForm
              fields={benefitFormFields}
              initialData={{
                benefitType: 'Health',
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

export default BenefitList;
