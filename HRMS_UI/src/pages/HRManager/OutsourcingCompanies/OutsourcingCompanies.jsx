import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { outsourceCompanyService } from '../../../services/outsourceCompanyService';
import CommonForm from '../../../components/common/CommonForm';
import ConfirmModal from '../../../components/common/ConfirmModal';
import './OutsourcingCompanies.css';

const OutsourcingCompanies = () => {
  const { t, i18n } = useTranslation();
  const [companies, setCompanies] = useState([]);
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
  const [editingCompany, setEditingCompany] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirm states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch logic
  const loadCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await outsourceCompanyService.getAllCompanies(page, limit, debouncedSearch, sortBy, sortOrder);
      
      if (res.success) {
        setCompanies(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
      } else {
        toast.error("Failed to load generic outsourcing companies");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

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
    setEditingCompany(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (company) => {
    // Format dates for inputs if they exist (cutting off time portion if it's ISO string)
    const formattedCompany = { ...company };
    if (formattedCompany.companyContractStartDate) {
      formattedCompany.companyContractStartDate = formattedCompany.companyContractStartDate.split('T')[0];
    }
    if (formattedCompany.companyContractEndDate) {
      formattedCompany.companyContractEndDate = formattedCompany.companyContractEndDate.split('T')[0];
    }

    setEditingCompany(formattedCompany);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingCompany(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      
      const payload = { ...formData };
      
      // Amharic fallback mapping
      if (i18n.language === 'am') {
        payload.companyName = payload.companyName || payload.companyNameAmharic;
        payload.companyAddress = payload.companyAddress || payload.companyAddressAmharic;
      } else {
        payload.companyNameAmharic = payload.companyNameAmharic || payload.companyName;
        payload.companyAddressAmharic = payload.companyAddressAmharic || payload.companyAddress;
      }

      // Convert empty strings to null for optional dates and phone/email
      if (!payload.companyContractStartDate) payload.companyContractStartDate = null;
      if (!payload.companyContractEndDate) payload.companyContractEndDate = null;
      if (!payload.companyPhone) payload.companyPhone = null;
      if (!payload.companyEmail) payload.companyEmail = null;

      if (editingCompany) {
        const res = await outsourceCompanyService.updateCompany(editingCompany.id, payload);
        if (res.success) {
          toast.success("Outsourcing Company updated successfully");
          closeFormModal();
          loadCompanies();
        } else {
            toast.error(res.error || "Update failed");
        }
      } else {
        const res = await outsourceCompanyService.createCompany(payload);
        if (res.success) {
          toast.success("Outsourcing Company created successfully");
          closeFormModal();
          loadCompanies();
        } else {
           toast.error(res.error || "Creation failed");
        }
      }
    } catch (error) {
      const msgs = error?.response?.data?.details || error?.response?.data?.error || "An error occurred while saving";
      toast.error(typeof msgs === 'string' ? msgs : "Validation Error from Server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (company) => {
    setCompanyToDelete(company);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      const res = await outsourceCompanyService.deleteCompany(companyToDelete.id);
      if (res.success) {
        toast.success("Outsourcing Company deleted successfully");
        loadCompanies();
      } else {
        toast.error(res.error || "Failed to delete company");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete from server");
    } finally {
      setDeleteModalOpen(false);
      setCompanyToDelete(null);
    }
  };

  // Form Configuration
  const formFields = useMemo(() => {
    const isAmharic = i18n.language === 'am';
    
    return [
      { 
        name: isAmharic ? 'companyNameAmharic' : 'companyName', 
        label: isAmharic ? 'የኩባንያ ስም' : 'Company Name', 
        type: 'text', 
        required: true 
      },
      { 
        name: 'companyServiceType', 
        label: isAmharic ? 'የአገልግሎት ዓይነት' : 'Service Type', 
        type: 'select', 
        required: true,
        options: [
          { value: 'SECURITY', label: isAmharic ? 'ጥበቃ (Security)' : 'Security' },
          { value: 'CLEANING', label: isAmharic ? 'ጽዳት (Cleaning)' : 'Cleaning' },
          { value: 'IT', label: 'IT' },
          { value: 'CATERING', label: isAmharic ? 'ምግብ ዝግጅት (Catering)' : 'Catering' },
          { value: 'MAINTENANCE', label: isAmharic ? 'ጥገና (Maintenance)' : 'Maintenance' },
          { value: 'OTHER', label: isAmharic ? 'ሌላ (Other)' : 'Other' }
        ]
      },
      { 
        name: 'companyStatus', 
        label: isAmharic ? 'ሁኔታ' : 'Status', 
        type: 'select', 
        required: true,
        options: [
          { value: 'ACTIVE', label: isAmharic ? 'ገባሪ (Active)' : 'Active' },
          { value: 'INACTIVE', label: isAmharic ? 'ቦዘኔ (Inactive)' : 'Inactive' },
          { value: 'SUSPENDED', label: isAmharic ? 'ታግዷል (Suspended)' : 'Suspended' }
        ]
      },
      { 
        name: 'companyPhone', 
        label: isAmharic ? 'ስልክ ቁጥር' : 'Phone Number', 
        type: 'tel' 
      },
      { 
        name: 'companyEmail', 
        label: isAmharic ? 'ኢሜል' : 'Email Address', 
        type: 'email' 
      },
      { 
        name: 'companyContractStartDate', 
        label: isAmharic ? 'የውል ጅማሬ ቀን' : 'Contract Start Date', 
        type: 'date' 
      },
      { 
        name: 'companyContractEndDate', 
        label: isAmharic ? 'የውል ማብቂያ ቀን' : 'Contract End Date', 
        type: 'date' 
      },
      { 
        name: isAmharic ? 'companyAddressAmharic' : 'companyAddress', 
        label: isAmharic ? 'አድራሻ' : 'Address', 
        type: 'text',
        fullWidth: true
      }
    ];
  }, [i18n.language]);

  return (
    <div className="outsourcing-container">
      {/* Search and Action Toolbar */}
      <div className="outsourcing-top-toolbar">
        <label className="search-wrapper" htmlFor="searchCompany">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchCompany" 
            type="text" 
            placeholder="Search outsourcing companies..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn-add-company" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Company
        </button>
      </div>

      {/* Main Data Table */}
      <div className="outsourcing-table-card">
        <div className="table-responsive-wrapper">
          <table className="modern-data-table">
            <thead>
              <tr>
                {i18n.language === 'am' ? (
                  <th className="sortable-header" onClick={() => handleSort('companyNameAmharic')}>
                    <div className="th-content">የኩባንያ ስም {renderSortIcon('companyNameAmharic')}</div>
                  </th>
                ) : (
                  <th className="sortable-header" onClick={() => handleSort('companyName')}>
                    <div className="th-content">Company Name {renderSortIcon('companyName')}</div>
                  </th>
                )}
                <th>Service Type</th>
                <th>Contact</th>
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
                  <td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No outsourcing companies found.</td>
                </tr>
              ) : (
                companies.map(company => (
                  <tr key={company.id}>
                    {i18n.language === 'am' ? (
                      <td className="col-primary-text">{company.companyNameAmharic || company.companyName}</td>
                    ) : (
                      <td className="col-primary-text">{company.companyName}</td>
                    )}
                    <td>
                      <span className="badge" style={{ backgroundColor: 'rgba(11, 130, 85, 0.1)', color: 'var(--primary-color)' }}>
                        {company.companyServiceType}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.74rem' }}>
                        {company.companyPhone && <span>{company.companyPhone}</span>}
                        {company.companyEmail && <span style={{ color: 'var(--text-secondary)' }}>{company.companyEmail}</span>}
                        {!company.companyPhone && !company.companyEmail && <span style={{ color: 'var(--text-secondary)' }}>-</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${company.companyStatus === 'ACTIVE' ? 'badge-active' : (company.companyStatus === 'SUSPENDED' ? 'badge-warning' : 'badge-inactive')}`}
                            style={company.companyStatus === 'SUSPENDED' ? { backgroundColor: 'var(--warning-light)', color: 'var(--warning-dark)' } : {}}>
                        {company.companyStatus}
                      </span>
                    </td>
                    <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn-light" onClick={() => handleOpenEdit(company)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn-light action-btn-danger" onClick={() => triggerDelete(company)} title="Delete">
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
              <h3>{editingCompany ? 'Edit Outsourcing Company' : 'Add New Outsourcing Company'}</h3>
              <button className="close-btn" onClick={closeFormModal}><X size={20} /></button>
            </div>
            
             <CommonForm 
              fields={formFields}
              initialData={editingCompany || { companyStatus: 'ACTIVE', companyServiceType: 'SECURITY' }}
              onSubmit={handleFormSubmit}
              onCancel={closeFormModal}
              twoColumns={true}
              submitText={editingCompany ? "Update Company" : "Create Company"}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Reusable Confirm Modal for Deletions */}
      <ConfirmModal 
        isOpen={deleteModalOpen}
        title="Delete Outsourcing Company"
        message={`Are you sure you want to permanently delete "${companyToDelete?.companyName}"? This cannot be undone.`}
        confirmText="Confirm Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

    </div>
  );
};

export default OutsourcingCompanies;
