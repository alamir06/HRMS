import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { assetService } from '../../../../services/assetService';
import { formatEthiopianDate } from '../../../../utils/dateTime';
import CommonForm from '../../../../components/common/CommonForm';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import './AssetList.css';

const AssetList = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('categories'); // 'items' or 'categories'
  
  // Data States
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const [editingData, setEditingData] = useState(null);
  const [currentFormState, setCurrentFormState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirm states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'categories') {
        const res = await assetService.getAllCategories(page, limit, debouncedSearch, sortBy, sortOrder);
        if (res.success) {
          setCategories(res.data || []);
          setPagination(res.pagination || { total: 0, pages: 1 });
        } else {
          toast.error("Failed to load categories");
        }
      } else {
        const res = await assetService.getAllAssets(page, limit, debouncedSearch, sortBy, sortOrder);
        if (res.success) {
          setItems(res.data || []);
          setPagination(res.pagination || { total: 0, pages: 1 });
        } else {
          toast.error("Failed to load assets");
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, limit, debouncedSearch, sortBy, sortOrder]);

  // We also need all categories for the items dropdown
  const [allCategories, setAllCategories] = useState([]);
  useEffect(() => {
    if (activeTab === 'items') {
      assetService.getAllCategories(1, 100).then(res => {
        if (res.success) setAllCategories(res.data || []);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setEditingData(null);
    setCurrentFormState({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (data) => {
    setEditingData(data);
    setCurrentFormState(data);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingData(null);
    setCurrentFormState({});
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      const payload = { ...formData };
      
      // Handle numeric and date fields on Items
      if (activeTab === 'items') {
        payload.purchaseCost = payload.purchaseCost === '' || payload.purchaseCost == null ? null : Number(payload.purchaseCost);
        payload.currentValue = payload.currentValue === '' || payload.currentValue == null ? null : Number(payload.currentValue);
        if (!payload.purchaseDate) payload.purchaseDate = null;
      }

      if (editingData) {
        let res;
        if (activeTab === 'categories') res = await assetService.updateCategory(editingData.id, payload);
        else res = await assetService.updateAsset(editingData.id, payload);

        if (res?.success) {
          toast.success(`${activeTab === 'categories' ? 'Category' : 'Asset'} updated successfully`);
          closeFormModal();
          loadData();
        } else {
          toast.error(res?.error || "Update failed");
        }
      } else {
        let res;
        if (activeTab === 'categories') res = await assetService.createCategory(payload);
        else res = await assetService.createAsset(payload);

        if (res?.success) {
          toast.success(`${activeTab === 'categories' ? 'Category' : 'Asset'} created successfully`);
          closeFormModal();
          loadData();
        } else {
          toast.error(res?.error || "Creation failed");
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "An error occurred while saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (data) => {
    setDataToDelete(data);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!dataToDelete) return;
    try {
      let res;
      if (activeTab === 'categories') res = await assetService.deleteCategory(dataToDelete.id);
      else res = await assetService.deleteAsset(dataToDelete.id);

      if (res?.success) {
        toast.success(`${activeTab === 'categories' ? 'Category' : 'Asset'} deleted successfully`);
        loadData();
      } else {
        toast.error(res?.error || "Failed to delete");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete from server");
    } finally {
      setDeleteModalOpen(false);
      setDataToDelete(null);
    }
  };

  // Forms definition
  const categoryFormFields = useMemo(() => {
    if (i18n.language === 'am') {
      return [
        { name: 'categoryNameAmharic', label: 'የምድብ ስም (Amharic Name)', type: 'text', required: true },
        { name: 'descriptionAmharic', label: 'መግለጫ (Amharic Description)', type: 'textarea' },
        { name: 'categoryName', label: 'Category Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea' }
      ];
    }
    return [
      { name: 'categoryName', label: 'Category Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }
    ];
  }, [i18n.language]);

  const itemFormFields = useMemo(() => {
    const selectedCat = allCategories.find(c => c.id === currentFormState?.assetCategoryId);
    
    // Default to showing generic things, then refine if category is selected
    let isFurniture = false;
    let isVehicle = false;
    let isTech = true; 

    if (selectedCat) {
      const catName = String(selectedCat.categoryName).toLowerCase();
      isVehicle = catName.includes('vehicle') || catName.includes('car') || catName.includes('bus') || catName.includes('motor');
      isFurniture = catName.includes('furniture') || catName.includes('chair') || catName.includes('desk') || catName.includes('table');
      isTech = catName.includes('computer') || catName.includes('electronic') || catName.includes('hardware') || catName.includes('it') || catName.includes('laptop') || catName.includes('phone');
      
      // If it explicitly matches furniture, drop tech
      if (isFurniture) isTech = false;
    }

    const defaultFields = [
      { name: 'assetCategoryId', label: 'Category', type: 'select', required: true, options: allCategories.map(c => ({ value: c.id, label: c.categoryName })) },
      { name: 'assetName', label: 'Asset Name', type: 'text', required: true },
    ];

    if (isTech) {
      defaultFields.push({ name: 'serialNumber', label: 'Serial Number', type: 'text' });
      defaultFields.push({ name: 'model', label: 'Model/Brand', type: 'text' });
    } else if (isVehicle) {
      defaultFields.push({ name: 'serialNumber', label: 'License Plate / VIN', type: 'text' });
      defaultFields.push({ name: 'model', label: 'Make/Model', type: 'text' });
    } else if (!isFurniture) {
      defaultFields.push({ name: 'serialNumber', label: 'Identifier/Serial', type: 'text' });
    }

    defaultFields.push(
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      { name: 'purchaseCost', label: 'Purchase Cost (ETB)', type: 'number' },
      { name: 'currentValue', label: 'Current Value (ETB)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: [
        { value: 'AVAILABLE', label: 'Available' },
        { value: 'ASSIGNED', label: 'Assigned' },
        { value: 'MAINTENANCE', label: 'Maintenance' },
        { value: 'DISPOSED', label: 'Disposed' },
      ]},
      { name: 'location', label: 'Location/Office', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    );

    if (i18n.language === 'am') {
      defaultFields.splice(2, 0, { name: 'assetNameAmharic', label: 'የንብረት ስም (Amharic Name)', type: 'text' });
      defaultFields.push({ name: 'locationAmharic', label: 'ቦታ (Amharic Location)', type: 'text' });
      defaultFields.push({ name: 'notesAmharic', label: 'ማስታወሻ (Amharic Notes)', type: 'textarea' });
    }
    return defaultFields;
  }, [i18n.language, allCategories, currentFormState?.assetCategoryId]);

  const currentFields = activeTab === 'categories' ? categoryFormFields : itemFormFields;

  const handleExportPdf = () => {
    const printContent = document.getElementById('asset-catalog-table');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
      styles += el.outerHTML;
    });

    const reportTitle = activeTab === 'categories' ? 'Asset Categories Report' : 'Asset Items Report';

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          ${styles}
          <style>
             @page { size: landscape; margin: 15mm; }
             body { 
               padding: 0; 
               background: white; 
               font-family: 'Inter', sans-serif; 
               color: #1e293b;
               -webkit-print-color-adjust: exact;
               print-color-adjust: exact;
             }
             .asset-table-footer, 
             .asset-table-actions,
             .asset-page-limit-selector,
             .asset-pagination-controls { 
               display: none !important; 
             }
             th:last-child, td:last-child { display: none !important; }
             table { 
               width: 100%; 
               border-collapse: collapse; 
               margin-top: 15px; 
             }
             th, td { 
               border: 1px solid #cbd5e1 !important; 
               padding: 10px 12px !important; 
               text-align: left !important; 
               font-size: 10pt !important;
             }
             th { 
               background-color: #f8fafc !important; 
               color: #334155 !important; 
               font-weight: 700 !important; 
             }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; margin-bottom: 20px;">${reportTitle}</h2>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="asset-list-container">
      
      <div className="asset-tabs">
        <button 
          className={`asset-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => { setActiveTab('categories'); setPage(1); setSearch(''); }}
        >
          {i18n.language === 'am' ? "የንብረት ምድቦች" : "Asset Categories"}
        </button>
        <button 
          className={`asset-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => { setActiveTab('items'); setPage(1); setSearch(''); }}
        >
          {i18n.language === 'am' ? "ንብረቶች" : "Asset Items"}
        </button>
      </div>

      <div className="asset-top-toolbar">
        <label className="asset-search-wrapper" htmlFor="searchAsset">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchAsset" 
            type="text" 
            placeholder={i18n.language === 'am' ? "በስም ፈልግ..." : "Search by name..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="asset-export-btn" onClick={handleExportPdf}>
          <Download size={18} /> {i18n.language === 'am' ? 'ወደ ፒዲኤፍ ላክ' : 'Export as PDF'}
        </button>
        <button className="asset-btn-add" onClick={handleOpenAdd}>
          <Plus size={18} /> {activeTab === 'categories' ? (i18n.language === 'am' ? "ምድብ አክል" : "Add Category") : (i18n.language === 'am' ? "ንብረት አክል" : "Add Asset")}
        </button>
      </div>

      <div className="asset-table-card" id="asset-catalog-table">
        <div className="asset-table-responsive-wrapper">
          <table className="asset-modern-data-table">
            <thead>
              {activeTab === 'categories' ? (
                <tr>
                  <th className="asset-sortable-header" onClick={() => handleSort('categoryName')}>
                    <div className="asset-th-content">{i18n.language === 'am' ? "የምድብ ስም" : "Category Name"} {renderSortIcon('categoryName')}</div>
                  </th>
                  <th>{i18n.language === 'am' ? "መግለጫ" : "Description"}</th>
                  <th className="asset-sortable-header" onClick={() => handleSort('createdAt')}>
                    <div className="asset-th-content">{i18n.language === 'am' ? "የተፈጠረበት ቀን" : "Created Date"} {renderSortIcon('createdAt')}</div>
                  </th>
                  <th>{i18n.language === 'am' ? "እርምጃዎች" : "Actions"}</th>
                </tr>
              ) : (
                <tr>
                  <th className="asset-sortable-header" onClick={() => handleSort('assetName')}>
                    <div className="asset-th-content">{i18n.language === 'am' ? "የንብረት ስም" : "Asset Name"} {renderSortIcon('assetName')}</div>
                  </th>
                  <th>{i18n.language === 'am' ? "ምድብ" : "Category"}</th>
                  <th>{i18n.language === 'am' ? "ሞዴል" : "Model"}</th>
                  <th>{i18n.language === 'am' ? "ሁኔታ" : "Status"}</th>
                  <th className="asset-sortable-header" onClick={() => handleSort('createdAt')}>
                    <div className="asset-th-content">{i18n.language === 'am' ? "የተፈጠረበት ቀን" : "Created Date"} {renderSortIcon('createdAt')}</div>
                  </th>
                  <th>{i18n.language === 'am' ? "እርምጃዎች" : "Actions"}</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
          ) : (activeTab === 'categories' ? categories : items).length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No records found.</td></tr>
              ) : (
                (activeTab === 'categories' ? categories : items).map(record => (
                  <tr key={record.id}>
                    {activeTab === 'categories' ? (
                      <>
                        <td>{i18n.language === 'am' ? (record.categoryNameAmharic || record.categoryName) : record.categoryName}</td>
                        <td>{i18n.language === 'am' ? (record.descriptionAmharic || record.description || '-') : (record.description || '-')}</td>
                        <td>{formatEthiopianDate(record.createdAt)}</td>
                        <td>
                          <div className="asset-table-actions">
                            <button className="asset-action-btn-light" onClick={() => handleOpenEdit(record)} title="Edit"><Pencil size={14} /></button>
                            <button className="asset-action-btn-light asset-action-btn-danger" onClick={() => triggerDelete(record)} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span style={{ fontWeight: 500, color: '#111827' }}>
                            {i18n.language === 'am' ? (record.assetNameAmharic || record.assetName) : record.assetName}
                          </span>
                          <br />
                          <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>SN: {record.serialNumber || '-'}</span>
                        </td>
                        <td>
                           {(() => {
                              const cat = allCategories.find(c => c.id === record.assetCategoryId) || record.Category || record.assetCategory || {};
                              const en = cat.categoryName || record.categoryName || '-';
                              const am = cat.categoryNameAmharic || record.categoryNameAmharic || en;
                              return i18n.language === 'am' ? am : en;
                           })()}
                        </td>
                        <td>{record.model || '-'}</td>
                        <td>
                          <span className={`asset-status-badge asset-status-${record.status || 'AVAILABLE'}`}>
                            {record.status || 'AVAILABLE'}
                          </span>
                        </td>
                        <td>{formatEthiopianDate(record.createdAt)}</td>
                        <td>
                          <div className="asset-table-actions">
                            <button className="asset-action-btn-light" onClick={() => handleOpenEdit(record)} title="Edit"><Pencil size={14} /></button>
                            <button className="asset-action-btn-light asset-action-btn-danger" onClick={() => triggerDelete(record)} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="asset-table-footer">
          <div className="asset-page-limit-selector">
            <span>Show</span>
            <select className="asset-limit-dropdown" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
               <option value={5}>5</option>
               <option value={10}>10</option>
               <option value={20}>20</option>
            </select>
            <span>entries</span>
          </div>
          <div className="asset-pagination-controls">
            <span>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="asset-page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button>
               <button className="asset-page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="asset-modal-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="asset-modal-form-header">
              <h3>{editingData ? 'Edit' : 'Add'} {activeTab === 'categories' ? 'Category' : 'Asset'}</h3>
              <button className="asset-close-btn" onClick={closeFormModal}><X size={20} /></button>
            </div>
            
            <CommonForm 
              fields={currentFields}
              initialData={editingData || {}}
              onChange={setCurrentFormState}
              onSubmit={handleFormSubmit}
              onCancel={closeFormModal}
              twoColumns={activeTab === 'items'}
              submitText={editingData ? "Update" : "Create"}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        title={`Delete ${activeTab === 'categories' ? 'Category' : 'Asset'}`}
        message={`Are you sure you want to permanently delete "${activeTab === 'categories' ? (dataToDelete?.categoryName) : (dataToDelete?.assetName)}"? This cannot be undone.`}
        confirmText="Confirm Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default AssetList;
