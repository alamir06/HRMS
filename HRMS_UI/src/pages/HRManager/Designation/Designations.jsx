import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, ArrowUpDown, ArrowDown, ArrowUp, Download, Users, GraduationCap, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { formatEthiopianDate } from '../../../utils/dateTime';
import DesignationForm from './DesignationForm';
import ConfirmModal from '../../../components/common/ConfirmModal';
import './Designations.css';

const Designations = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  
  const [period, setPeriod] = useState('ALL');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef(null);

  // Custom Modal States
  const [viewDesignation, setViewDesignation] = useState(null);
  const [editDesignation, setEditDesignation] = useState(null);
  const [deleteDesignation, setDeleteDesignation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const periodOptions = [
    { label: isAmharic ? 'የዛሬ' : 'Daily', value: 'DAILY' },
    { label: isAmharic ? 'የዚህ ሳምንት' : 'Weekly', value: 'WEEKLY' },
    { label: isAmharic ? 'የዚህ ወር' : 'Monthly', value: 'MONTHLY' },
    { label: isAmharic ? 'የዚህ ዓመት' : 'Yearly', value: 'YEARLY' },
    { label: isAmharic ? 'ሁሉም ጊዜ' : 'All Time', value: 'ALL' }
  ];
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target)) {
        setIsPeriodMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [stats, setStats] = useState({
    totalHeads: 0,
    newHeads: 0,
    totalDeans: 0,
    activeDeans: 0,
    totalOthers: 0,
    othersInactive: 0,
  });

  const getLocalizedText = (enValue, amValue) => {
    if (isAmharic && amValue) return amValue;
    return enValue || amValue || '';
  };

  const getEmployeeDisplayName = (emp) => {
    if (!emp.firstName && !emp.lastName) return (isAmharic ? 'አልተመደበም' : 'Unassigned');
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    return name;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/designations/stats/dashboard');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const loadDesignations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/designations/search/global', {
        params: {
          page,
          limit,
          query: debouncedSearch,
          period: period !== 'ALL' ? period : undefined
        }
      });
      if (res.data.success) {
        setDesignations(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      } else {
        toast.error("Failed to load designations");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, period]);

  useEffect(() => {
    fetchStats();
    loadDesignations();
  }, [loadDesignations]);

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

  const calculateDuration = (createdAt) => {
    if (!createdAt) return "Unknown";
    const start = new Date(createdAt);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    const displayYears = Math.floor(totalMonths / 12);
    const displayMonths = totalMonths % 12;
    
    let durationStr = "";
    if (displayYears > 0) durationStr += `${displayYears} year${displayYears > 1 ? 's' : ''}`;
    if (displayMonths > 0) durationStr += `${durationStr ? ', ' : ''}${displayMonths} month${displayMonths > 1 ? 's' : ''}`;
    
    return durationStr || "Just Started";
  };

  const handleExportPdf = () => {
    const printContent = document.getElementById('designations-table-card-container');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
      styles += el.outerHTML;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${isAmharic ? 'የስራ መደብ መዝገብ' : 'Designation Registry Report'}</title>
          ${styles}
          <style>
            body { padding: 40px; background: white; font-family: Inter, sans-serif; }
            .table-actions, .table-footer { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { border-bottom: 2px solid #cbd5e1; }
            h1 { color: #2d3748; margin-bottom: 10px; }
            .report-header { margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>${isAmharic ? 'የስራ መደብ መዝገብ ሪፖርት' : 'Designation Registry Report'}</h1>
            <p>${isAmharic ? 'ቀን:' : 'Generated on:'} ${new Date().toLocaleDateString(isAmharic ? 'am-ET' : 'en-US')}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="designations-container registry-override">
      {/* Design requested removal of the top/bottom text, leaving the core structural header aligned */}
      
      <div className="designations-header-section">
        <div className="header-breadcrumbs">
          {/* Breadcrumbs matching layout */}
        </div>
        <div className="header-title-row">
          <div>
            <h1 className="page-title">{isAmharic ? 'የስራ መደብ መዝገብ' : 'Designation Registry'}</h1>
            <p className="page-subtitle">
              {isAmharic ? 'የአካዳሚክ እና የአስተዳደር መደቦች የጥልቅ መረጃ መዝገብ።' : 'A comprehensive ledger of academic appointments and administrative roles across the university ecosystem.'}
            </p>
          </div>
          <button className="designation-add-btn" onClick={() => setIsFormOpen(true)}>
            <Plus size={18} />
            <span>{isAmharic ? 'መደብ አክል' : 'Add Designation'}</span>
          </button>
        </div>
      </div>

      <div className="designations-summary-cards">
        <div className="designations-summary-card">
          <div className="designations-summary-icon"><BriefcaseBusiness size={18} /></div>
          <div className="designations-summary-content">
            <span className="designations-summary-kicker">{isAmharic ? 'አዲስ በዚህ ሴሚስተር' : 'NEW THIS SEMESTER'}</span>
            <div className="designations-summary-value">{stats.totalHeads < 10 ? `0${stats.totalHeads}` : stats.totalHeads}</div>
            <span className="designations-summary-label">{isAmharic ? 'ጠቅላላ ኃላፊዎች' : 'Total Heads'}</span>
          </div>
        </div>

        <div className="designations-summary-card">
          <div className="designations-summary-icon"><Building2 size={18} /></div>
          <div className="designations-summary-content">
            <span className="designations-summary-kicker">{isAmharic ? 'ገባሪ የአካዳሚክ ቦርድ' : 'ACTIVE FACULTY BOARD'}</span>
            <div className="designations-summary-value">{stats.totalDeans < 10 ? `0${stats.totalDeans}` : stats.totalDeans}</div>
            <span className="designations-summary-label">{isAmharic ? 'ጠቅላላ ዲኖች' : 'Total Deans'}</span>
          </div>
        </div>

        <div className="designations-summary-card">
          <div className="designations-summary-icon"><GraduationCap size={18} /></div>
          <div className="designations-summary-content">
            <span className="designations-summary-kicker">{isAmharic ? 'መዝገቦች ኦዲት ይፈልጋሉ' : 'RECORDS PENDING AUDIT'}</span>
            <div className="designations-summary-value">{stats.totalOthers < 10 ? `0${stats.totalOthers}` : stats.totalOthers}</div>
            <span className="designations-summary-label">{isAmharic ? 'ጠቅላላ አስተዳደር' : 'Total Administrative'}</span>
          </div>
        </div>
      </div>

      <div className="designations-top-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
         <div className="hr-attendance-period-filter-wrap" ref={periodMenuRef}>
           <button
             type="button"
             className={`hr-attendance-period-filter-trigger ${isPeriodMenuOpen ? 'open' : ''}`}
             onClick={() => setIsPeriodMenuOpen((prev) => !prev)}
           >
             <span>{periodOptions.find(o => o.value === period)?.label || 'All Time'}</span>
             <ChevronDown size={16} className="hr-attendance-period-filter-chevron" />
           </button>

           {isPeriodMenuOpen && (
             <div className="hr-attendance-period-filter-menu">
               {periodOptions.map((item) => (
                 <button
                   key={item.value}
                   type="button"
                   className={`hr-attendance-period-filter-option ${period === item.value ? 'active' : ''}`}
                   onClick={() => {
                     setPeriod(item.value);
                     setIsPeriodMenuOpen(false);
                   }}
                 >
                   {item.label}
                 </button>
               ))}
             </div>
           )}
         </div>

         <label className="hr-attendance-search-wrapper" htmlFor="searchDesignation">
           <Search size={18} color="var(--text-secondary)" />
           <input 
             id="searchDesignation" 
             type="text" 
             placeholder={isAmharic ? 'ምደባዎችን ይልጉ...' : 'Search appointments...'} 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </label>
         <button className="hr-attendance-export-btn" onClick={handleExportPdf}>
             <Download size={18} style={{ marginRight: '6px' }} /> {isAmharic ? 'ወደ ፒዲኤፍ ላክ' : 'Export as PDF'}
         </button>
      </div>

      <div id="designations-table-card-container" className="designations-table-card registry-table-card">
        <div className="table-responsive-wrapper">
          <table className="modern-data-table registry-table">
            <thead>
              <tr>
                <th>{isAmharic ? 'ሰራተኛ' : 'EMPLOYEE'}</th>
                <th>{isAmharic ? 'ስራ መደብ' : 'DESIGNATION'}</th>
                <th>{isAmharic ? 'የቆይታ ጊዜ' : 'DURATION & TENURE'}</th>
                <th>{isAmharic ? 'ሁኔታ' : 'STATUS'}</th>
                <th>{isAmharic ? 'ድርጊቶች' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>{isAmharic ? 'መረጃ በመጫን ላይ...' : 'Loading...'}</td>
                </tr>
              ) : designations.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>{isAmharic ? 'ምንም መዝገብ አልተገኘም.' : 'No records found.'}</td>
                </tr>
              ) : (
                designations.map(des => (
                  <tr key={des.id}>
                    <td>
                      <div className="registry-employee-cell">
                         <div className="registry-avatar">
                           <img 
                              src={des.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(getEmployeeDisplayName(des))}&background=0B8255&color=fff`} 
                              alt="avatar" 
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getEmployeeDisplayName(des))}&background=0B8255&color=fff` }}
                           />
                         </div>
                         <div className="registry-emp-info">
                             <span className="registry-emp-name">{getEmployeeDisplayName(des)}</span>
                             <span className="registry-emp-email">{des.personalEmail || "No Email Provided"}</span>
                         </div>
                      </div>
                    </td>
                    <td className="col-primary-text" style={{ fontStyle: 'italic', fontWeight: '500' }}>
                       {getLocalizedText(des.title, des.titleAmharic)}
                    </td>
                    <td>
                      <div className="registry-duration-cell">
                          <span className="registry-duration-date">
                             {formatEthiopianDate(des.createdAt)} — {isAmharic ? 'እስካሁን' : 'Present'}
                          </span>
                          <span className="registry-duration-text">{calculateDuration(des.createdAt)} active</span>
                      </div>
                    </td>
                    <td>
                      <span className={`registry-badge badge-${(des.status || 'ACTIVE').toLowerCase()}`}>
                        {(des.status || 'ACTIVE')}
                      </span>
                    </td>
                    <td>
                       <div className="table-actions">
                         <button className="action-btn-light" title={isAmharic ? 'ዝርዝር እይ' : 'View Details'} onClick={() => setViewDesignation(des)}>
                           <Eye size={14} />
                         </button>
                         <button className="action-btn-light" title={isAmharic ? 'አስተካክል' : 'Edit'} onClick={() => setEditDesignation(des)}>
                           <Pencil size={14} />
                         </button>
                         <button 
                           className="action-btn-light action-btn-danger" 
                           title={isAmharic ? 'ሰርዝ' : 'Delete'} 
                           onClick={() => setDeleteDesignation(des)}
                         >
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
            <span>{isAmharic ? 'አሳይ' : 'Show'}</span>
            <select className="limit-dropdown" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>{i18n.language === 'am' ? 'ገፆች' : 'entries'}</span>
          </div>

          <div className="pagination-controls">
            <span>
              {i18n.language === 'am' 
                 ? `ከ ${designations.length === 0 ? 0 : (page - 1) * limit + 1} እስከ ${Math.min(page * limit, pagination.total)} ከ ${pagination.total} ይታያል`
                 : `Showing ${designations.length === 0 ? 0 : (page - 1) * limit + 1} to ${Math.min(page * limit, pagination.total)} of ${pagination.total}`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button>
               <button className="page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages || pagination.pages === 0}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
      
      {isFormOpen && (
        <DesignationForm 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => {
            setIsFormOpen(false);
            fetchStats();
            loadDesignations();
          }} 
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteDesignation}
        title={isAmharic ? 'ምደባን ሰርዝ' : 'Delete Designation'}
        message={isAmharic 
          ? `የ ${deleteDesignation && getEmployeeDisplayName(deleteDesignation)} መዝገብን መሰረዝ እርግጠኛ ነዎት? ይህ እርምጃ ሊቀለበስ አይችልም።` 
          : `Are you sure you want to delete the designation record for ${deleteDesignation && getEmployeeDisplayName(deleteDesignation)}? This action cannot be undone.`}
        onConfirm={async () => {
           try {
              const res = await api.delete(`/designations/${deleteDesignation.id}`);
              if(res.data.success) {
                 toast.success(isAmharic ? 'መዝገቡ ተሰርዟል!' : 'Record deleted successfully.');
                 loadDesignations();
                 fetchStats();
              } else {
                 toast.error(res.data.error || 'Failed to delete designation.');
              }
           } catch(err) {
              toast.error('Error occurred while deleting designation.');
           } finally {
              setDeleteDesignation(null);
           }
        }}
        onCancel={() => setDeleteDesignation(null)}
        isDestructive={true}
        confirmText={isAmharic ? 'ሰርዝ' : 'Delete'}
      />

      {viewDesignation && (
        <div className="modal-overlay" onClick={() => setViewDesignation(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
               <h2>{isAmharic ? 'የምደባ ዝርዝሮች' : 'Designation Details'}</h2>
               <button className="modal-close" onClick={() => setViewDesignation(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getEmployeeDisplayName(viewDesignation))}&background=0B8255&color=fff`} 
                    alt="avatar" 
                    style={{ width: '64px', height: '64px', borderRadius: '50%' }} 
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{getEmployeeDisplayName(viewDesignation)}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{viewDesignation.personalEmail || 'No Email'}</p>
                  </div>
               </div>
               <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
                     <div>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display:'block', marginBottom:'4px' }}>{isAmharic ? 'ስራ መደብ' : 'Title'}</span>
                       <div style={{ fontWeight: '500', color: 'var(--primary-color)' }}>{getLocalizedText(viewDesignation.title, viewDesignation.titleAmharic)}</div>
                     </div>
                     <div>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display:'block', marginBottom:'4px' }}>{isAmharic ? 'ሁኔታ' : 'Status'}</span>
                       <div><span className={`registry-badge badge-${(viewDesignation.status || 'ACTIVE').toLowerCase()}`}>{viewDesignation.status || 'ACTIVE'}</span></div>
                     </div>
                     <div style={{ gridColumn: 'span 2' }}>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display:'block', marginBottom:'4px' }}>{isAmharic ? 'ዲፓርትመንት/ኮሌጅ' : 'Department/College'}</span>
                       <div style={{ fontWeight: '500' }}>{getLocalizedText(viewDesignation.departmentName || viewDesignation.collegeName, viewDesignation.departmentName || viewDesignation.collegeName)}</div>
                     </div>
                     <div style={{ gridColumn: 'span 2' }}>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display:'block', marginBottom:'4px' }}>{isAmharic ? 'የተመደበበት ጊዜ' : 'Appointed'}</span>
                       <div style={{ fontWeight: '500' }}>{formatEthiopianDate(viewDesignation.createdAt)}</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {editDesignation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
               <h2>{isAmharic ? 'ምደባን አስተካክል' : 'Edit Designation'}</h2>
               <button className="modal-close" onClick={() => setEditDesignation(null)} disabled={isSubmitting}><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => {
               e.preventDefault();
               setIsSubmitting(true);
               try {
                 const res = await api.put(`/designations/${editDesignation.id}`, { status: editDesignation.status });
                 if(res.data.success) {
                    toast.success(isAmharic ? 'በተሳካ ሁኔታ ተስተካክሏል!' : 'Updated successfully!');
                    loadDesignations();
                    fetchStats();
                    setEditDesignation(null);
                 } else {
                    toast.error(res.data.error || 'Update failed.');
                 }
               } catch (err) {
                 toast.error('An error occurred during update.');
               } finally {
                 setIsSubmitting(false);
               }
            }}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                 <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>{isAmharic ? 'የስራ መደብ ሁኔታ' : 'Assignment Status'}</label>
                    <select 
                      className="hr-attendance-period-filter-trigger" 
                      value={editDesignation.status || 'ACTIVE'} 
                      onChange={(e) => setEditDesignation({...editDesignation, status: e.target.value})}
                      style={{ width: '100%', appearance: 'auto' }}
                    >
                       <option value="ACTIVE">{isAmharic ? 'ገባሪ (Active)' : 'Active'}</option>
                       <option value="INACTIVE">{isAmharic ? 'የማይሰራ (Inactive)' : 'Inactive'}</option>
                       <option value="COMPLETED">{isAmharic ? 'የተጠናቀቀ (Completed)' : 'Completed'}</option>
                    </select>
                 </div>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {isAmharic ? 'ማስታወሻ፡ የስራ መደብ ርዕስ ወይም ዲፓርትመንት ለመቀየር አዲስ የተለየ ምደባ ይመዝግቡ።' : 'Note: To change the assignment title or target department natively, please create a new explicit designation action.'}
                 </p>
              </div>
              <div className="modal-footer" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', borderTop: '1px solid var(--border-color)' }}>
                 <button type="button" className="btn-secondary" onClick={() => setEditDesignation(null)} disabled={isSubmitting} style={{ width: '100%' }}>{isAmharic ? 'ሰርዝ' : 'Cancel'}</button>
                 <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%' }}>{isSubmitting ? 'Processing...' : (isAmharic ? 'አስተካክል' : 'Save Changes')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Designations;
