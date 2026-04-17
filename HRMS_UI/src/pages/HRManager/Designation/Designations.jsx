import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, ArrowUpDown, ArrowDown, ArrowUp, Download, Users, GraduationCap, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { formatEthiopianDate } from '../../../utils/dateTime';
import DesignationForm from './DesignationForm';
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
  }, [page, limit, debouncedSearch]);

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

      <div className="designations-top-toolbar">
         <label className="search-wrapper-designation" htmlFor="searchDesignation">
           <Search size={18} color="var(--text-secondary)" />
           <input 
             id="searchDesignation" 
             type="text" 
             placeholder={isAmharic ? 'ምደባዎችን ይፈልጉ...' : 'Search appointments...'} 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </label>
         <button className="designations-export-btn" onClick={handleExportPdf}>
             <Download size={18} /> {isAmharic ? 'ወደ ፒዲኤፍ ላክ' : 'Export as PDF'}
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
                <th style={{textAlign: 'right'}}>{isAmharic ? 'ድርጊቶች' : 'ACTIONS'}</th>
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
                             {new Date(des.createdAt).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})} — {'Present'}
                          </span>
                          <span className="registry-duration-text">{calculateDuration(des.createdAt)} active</span>
                      </div>
                    </td>
                    <td>
                      <span className={`registry-badge badge-${(des.status || 'ACTIVE').toLowerCase()}`}>
                        {(des.status || 'ACTIVE')}
                      </span>
                    </td>
                    <td style={{textAlign: 'right'}}>
                         "Actions"
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
    </div>
  );
};

export default Designations;
