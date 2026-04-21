import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, ArrowUpDown, ArrowDown, ArrowUp, Undo2, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { assetService } from '../../../../services/assetService';
import { employeeService } from '../../../../services/employeeService';
import { formatEthiopianDate } from '../../../../utils/dateTime';
import CommonForm from '../../../../components/common/CommonForm';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import '../AssetList/AssetList.css'; // Reusing some base styles
import './AssetAssignment.css';

const AssetAssignment = () => {
  const { t, i18n } = useTranslation();
  
  // Data States
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirm states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Assignments
  const loadAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await assetService.getAllAssignments(page, limit, debouncedSearch, sortBy, sortOrder);
      if (res.success) {
        setAssignments(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
      } else {
        toast.error("Failed to load assignments");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  // Fetch Dependencies
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const empRes = await employeeService.getAllEmployees(1, 200);
        if (empRes?.success) setEmployees(empRes.data || []);
      } catch (e) {
        console.error("Failed to load employees for assignment form");
      }
      try {
        const astRes = await assetService.getAvailableAssets();
        if (astRes?.success) setAvailableAssets(astRes.data || []);
      } catch(e) {
        console.error("Failed to load available assets");
      }
    };
    loadDependencies();
  }, [isAssignModalOpen]); // Reload assets when opening modal

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

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

  const handleOpenAssign = () => setIsAssignModalOpen(true);
  const handleOpenReturn = (assignment) => {
    setSelectedAssignment(assignment);
    setIsReturnModalOpen(true);
  };

  const closeModals = () => {
    setIsAssignModalOpen(false);
    setIsReturnModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleAssignSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      const authUser = JSON.parse(localStorage.getItem('user'));
      
      const payload = {
        ...formData,
        assignedBy: authUser?.id || authUser?.employeeId || null,
      };

      const res = await assetService.assignAsset(payload);
      if (res?.success) {
        toast.success("Asset assigned successfully");
        closeModals();
        loadAssignments();
      } else {
        toast.error(res?.error || "Assignment failed");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnSubmit = async (formData) => {
    if (!selectedAssignment) return;
    try {
      setIsSubmitting(true);
      const res = await assetService.returnAsset(selectedAssignment.id, formData);
      if (res?.success) {
        toast.success("Asset returned successfully");
        closeModals();
        loadAssignments();
      } else {
        toast.error(res?.error || "Return failed");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (data) => {
    setAssignmentToDelete(data);
    setDeleteModalOpen(true);
  };

  // Forms definition
  const assignFormFields = useMemo(() => {
    const fields = [
      { 
        name: 'employeeId', 
        label: i18n.language === 'am' ? 'ሠራተኛ' : 'Employee', 
        type: 'select', 
        required: true, 
        options: employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeId})` })) 
      },
      { 
        name: 'assetId', 
        label: i18n.language === 'am' ? 'ንብረት' : 'Asset', 
        type: 'select', 
        required: true, 
        options: availableAssets.map(a => ({ value: a.id, label: `${a.assetName} - ${a.serialNumber || 'N/A'}` })) 
      },
      { name: 'assignedDate', label: i18n.language === 'am' ? 'የተሰጠበት ቀን' : 'Assigned Date', type: 'date', required: true },
      { name: 'expectedReturnDate', label: i18n.language === 'am' ? 'የሚመለስበት ቀን' : 'Expected Return Date', type: 'date' },
      { name: 'conditionAssigned', label: i18n.language === 'am' ? 'የንብረቱ ሁኔታ' : 'Condition Assigned', type: 'text' },
      { name: 'assignmentReason', label: i18n.language === 'am' ? 'ምክንያት' : 'Reason for Assignment', type: 'textarea' }
    ];
    if (i18n.language === 'am') {
      fields.splice(4, 0, { name: 'conditionAssignedAmharic', label: 'ሁኔታ (Amharic)', type: 'text' });
      fields.push({ name: 'assignmentReasonAmharic', label: 'ምክንያት (Amharic)', type: 'textarea' });
    }
    return fields;
  }, [i18n.language, employees, availableAssets]);

  const returnFormFields = useMemo(() => {
    const fields = [
      { name: 'actualReturnDate', label: i18n.language === 'am' ? 'የተመለሰበት ቀን' : 'Actual Return Date', type: 'date', required: true },
      { name: 'conditionReturned', label: i18n.language === 'am' ? 'የተመለሰበት ሁኔታ' : 'Condition Returned', type: 'text' },
      { 
        name: 'status', 
        label: i18n.language === 'am' ? 'ሁኔታ' : 'Return Status', 
        type: 'select', 
        required: true, 
        options: [
          { value: 'RETURNED', label: 'Returned' },
          { value: 'OVERDUE', label: 'Returned Overdue' }
        ] 
      }
    ];
    if (i18n.language === 'am') {
      fields.splice(2, 0, { name: 'conditionReturnedAmharic', label: 'ሁኔታ (Amharic)', type: 'text' });
    }
    return fields;
  }, [i18n.language]);

  return (
    <div className="asset-assign-container">
      <div className="asset-top-toolbar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', width: '100%' }}>
        <label className="asset-search-wrapper" htmlFor="searchAssignment">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchAssignment" 
            type="text" 
            placeholder={i18n.language === 'am' ? "በሠራተኛ ወይም በንብረት ስም ፈልግ..." : "Search by employee or asset..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="asset-export-btn" onClick={() => toast.info('Export not fully implemented yet.')}>
          <Download size={18} /> {i18n.language === 'am' ? 'ወደ ፒዲኤፍ ላክ' : 'Export as PDF'}
        </button>
        <button className="asset-btn-add" onClick={handleOpenAssign}>
          <Plus size={18} /> {i18n.language === 'am' ? 'ንብረት መድብ' : 'Assign Asset'}
        </button>
      </div>

      <div className="asset-table-card">
        <div className="asset-table-responsive-wrapper">
          <table className="asset-modern-data-table">
            <thead>
              <tr>
                <th className="asset-sortable-header" onClick={() => handleSort('assetId')}>
                  <div className="asset-th-content">{i18n.language === 'am' ? "ንብረት" : "Asset"} {renderSortIcon('assetId')}</div>
                </th>
                <th>{i18n.language === 'am' ? "ሠራተኛ" : "Employee"}</th>
                <th className="asset-sortable-header" onClick={() => handleSort('assignedDate')}>
                  <div className="asset-th-content">{i18n.language === 'am' ? "የተሰጠበት ቀን" : "Assigned Date"} {renderSortIcon('assignedDate')}</div>
                </th>
                <th className="asset-sortable-header" onClick={() => handleSort('expectedReturnDate')}>
                  <div className="asset-th-content">{i18n.language === 'am' ? "የሚመለስበት ቀን" : "Expected Return"} {renderSortIcon('expectedReturnDate')}</div>
                </th>
                <th>{i18n.language === 'am' ? "የተመለሰበት ቀን" : "Actual Return"}</th>
                <th>{i18n.language === 'am' ? "የንብረቱ ሁኔታ" : "Status"}</th>
                <th>{i18n.language === 'am' ? "እርምጃዎች" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No assignments found.</td></tr>
              ) : (
                assignments.map((assign, index) => {
                  const isReturned = assign.Asset?.status === 'AVAILABLE' || assign.actualReturnDate;
                  
                  return (
                    <tr key={assign.id || index}>
                      <td className="col-primary-text">
                         {(() => {
                            const ast = availableAssets.find(a => a.id === assign.assetId) || assign.Asset || assign.asset || {};
                            const enAst = assign.assetName || ast.assetName || `Asset (ID: ${assign.assetId?.substring(0,8)})`;
                            const amAst = assign.assetNameAmharic || ast.assetNameAmharic || enAst;
                            return i18n.language === 'am' ? amAst : enAst;
                         })()}
                      </td>
                      <td>
                         {(() => {
                            const emp = employees.find(e => e.id === assign.employeeId) || assign.Employee || assign.employee || {};
                            const enName = assign.employeeName || (emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : null) || `Employee (ID: ${assign.employeeId?.substring(0,6)})`;
                            const amName = assign.employeeNameAmharic || (emp.firstNameAmharic ? `${emp.firstNameAmharic} ${emp.lastNameAmharic}`.trim() : null) || enName;
                            return i18n.language === 'am' ? amName : enName;
                         })()}
                      </td>
                      <td>{formatEthiopianDate(assign.assignedDate)}</td>
                      <td>{assign.expectedReturnDate ? formatEthiopianDate(assign.expectedReturnDate) : '-'}</td>
                      <td>{assign.actualReturnDate ? formatEthiopianDate(assign.actualReturnDate) : '-'}</td>
                      <td>
                        {isReturned ? (
                          <span className="asset-status-badge asset-status-AVAILABLE">Returned</span>
                        ) : (
                          <span className="asset-status-badge asset-status-ASSIGNED">Active</span>
                        )}
                      </td>
                      <td>
                        <div className="asset-table-actions">
                          {!isReturned && (
                            <button 
                              className="asset-action-btn-light" 
                              onClick={() => handleOpenReturn(assign)} 
                              title={i18n.language === 'am' ? "ንብረት መልስ" : "Return Asset"}
                            >
                              <Undo2 size={14} />
                            </button>
                          )}
                          <button 
                            className="asset-action-btn-light asset-action-btn-danger" 
                            onClick={() => triggerDelete(assign)} 
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

      {isAssignModalOpen && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="asset-modal-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="asset-modal-form-header">
              <h3>{i18n.language === 'am' ? 'አዲስ ንብረት መድብ' : 'Assign New Asset'}</h3>
              <button className="asset-close-btn" onClick={closeModals}><X size={20} /></button>
            </div>
            <CommonForm 
              fields={assignFormFields}
              initialData={{}}
              onSubmit={handleAssignSubmit}
              onCancel={closeModals}
              twoColumns={true}
              submitText={i18n.language === 'am' ? 'መድብ' : 'Assign'}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      {isReturnModalOpen && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="asset-modal-form-wrapper" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="asset-modal-form-header">
              <h3>{i18n.language === 'am' ? 'ንብረት መልስ' : 'Return Asset'}</h3>
              <button className="asset-close-btn" onClick={closeModals}><X size={20} /></button>
            </div>
            <CommonForm 
              fields={returnFormFields}
              initialData={{
                status: 'RETURNED', 
                actualReturnDate: new Date().toISOString().substring(0, 10)
              }}
              onSubmit={handleReturnSubmit}
              onCancel={closeModals}
              twoColumns={false}
              submitText={i18n.language === 'am' ? 'መዝግብ' : 'Record Return'}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        title="Delete Assignment Record"
        message="Are you sure you want to delete this assignment record? This will not remove the main asset data."
        confirmText="Confirm Delete"
        isDestructive={true}
        onConfirm={async () => {
          // Note: we don't have delete assignment in service currently. I will implement it real quick.
          setDeleteModalOpen(false);
          toast.warning("Delete assignment is not fully implemented on server side yet.");
        }}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default AssetAssignment;
