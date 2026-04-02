import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { collegeService } from '../../services/collegeService';
import CommonForm from '../../components/common/CommonForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import './Colleges.css';

const Colleges = () => {
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirm states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [collegeToDelete, setCollegeToDelete] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch logic
  const loadColleges = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await collegeService.getAllColleges(page, limit, debouncedSearch, sortBy, sortOrder);
      
      if (res.success) {
        setColleges(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
      } else {
        toast.error("Failed to load colleges");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    loadColleges();
  }, [loadColleges]);

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
    setEditingCollege(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (college) => {
    setEditingCollege(college);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingCollege(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingCollege) {
        const res = await collegeService.updateCollege(editingCollege.id, formData);
        if (res.success) {
          toast.success("College updated successfully");
          closeFormModal();
          loadColleges();
        } else {
            toast.error(res.error || "Update failed");
        }
      } else {
        const res = await collegeService.createCollege(formData);
        if (res.success) {
          toast.success("College created successfully");
          closeFormModal();
          loadColleges();
        } else {
           toast.error(res.error || "Creation failed");
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "An error occurred while saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (college) => {
    setCollegeToDelete(college);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!collegeToDelete) return;
    try {
      const res = await collegeService.deleteCollege(collegeToDelete.id);
      if (res.success) {
        toast.success("College deleted successfully");
        loadColleges();
      } else {
        toast.error(res.error || "Failed to delete college");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete from server");
    } finally {
      setDeleteModalOpen(false);
      setCollegeToDelete(null);
    }
  };

  // CommonForm structure
  const collegeFormFields = [
    { name: 'collegeName', label: 'College Name', type: 'text', required: true },
    { name: 'collegeNameAmharic', label: 'Name (Amharic)', type: 'text' },
    { name: 'collegeDescription', label: 'Description', type: 'textarea' },
    { name: 'collegeDescriptionAmharic', label: 'Description (Amharic)', type: 'textarea' }
  ];

  return (
    <div className="colleges-container">
      {/* Search and Action Toolbar */}
      <div className="colleges-top-toolbar">
        <label className="search-wrapper" htmlFor="searchCollege">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchCollege" 
            type="text" 
            placeholder="Search colleges by name or description..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn-add-college" onClick={handleOpenAdd}>
          <Plus size={18} /> Add College
        </button>
      </div>

      {/* Main Data Table */}
      <div className="colleges-table-card">
        <div className="table-responsive-wrapper">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => handleSort('collegeName')}>
                  <div className="th-content">College Name {renderSortIcon('collegeName')}</div>
                </th>
                <th className="sortable-header" onClick={() => handleSort('collegeNameAmharic')}>
                  <div className="th-content">Name (Amharic) {renderSortIcon('collegeNameAmharic')}</div>
                </th>
                <th>Description</th>
                <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                  <div className="th-content">Created Date {renderSortIcon('createdAt')}</div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : colleges.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>No colleges found.</td>
                </tr>
              ) : (
                colleges.map(college => (
                  <tr key={college.id}>
                    <td className="col-primary-text">{college.collegeName}</td>
                    <td>{college.collegeNameAmharic || '-'}</td>
                    <td className="col-description" title={college.collegeDescription}>
                      {college.collegeDescription || '-'}
                    </td>
                    <td>{new Date(college.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn-light" onClick={() => handleOpenEdit(college)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn-light action-btn-danger" onClick={() => triggerDelete(college)} title="Delete">
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
        <div className="table-footer">
          <div className="page-limit-selector">
            <span>Show</span>
            <select 
              className="limit-dropdown" 
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
            <span>entries</span>
          </div>

          <div className="pagination-controls">
            <span>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button 
                className="page-btn" 
                onClick={() => setPage(page - 1)} 
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className="page-btn" 
                onClick={() => setPage(page + 1)} 
                disabled={page >= pagination.pages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal manually overlaid with backdrop */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="modal-form-header">
              <h3>{editingCollege ? 'Edit College' : 'Add New College'}</h3>
              <button className="close-btn" onClick={closeFormModal}><X size={20} /></button>
            </div>
            
             <CommonForm 
              fields={collegeFormFields}
              initialData={editingCollege || {}}
              onSubmit={handleFormSubmit}
              onCancel={closeFormModal}
              twoColumns={true}
              submitText={editingCollege ? "Update College" : "Create College"}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal for Deletions */}
      <ConfirmModal 
        isOpen={deleteModalOpen}
        title="Delete College"
        message={`Are you sure you want to permanently delete "${collegeToDelete?.collegeName}"? This cannot be undone.`}
        confirmText="Confirm Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

    </div>
  );
};

export default Colleges;
