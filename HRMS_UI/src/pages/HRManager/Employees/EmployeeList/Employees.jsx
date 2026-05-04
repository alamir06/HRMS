import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, RefreshCw, Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp, Download, ChevronDown, Users, GraduationCap, BriefcaseBusiness, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { employeeService } from '../../../../services/employeeService';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import EmployeeWizard from '../EmployeeWizard/EmployeeWizard';
import EmployeeProfileModal from '../EmployeeProfile/EmployeeProfile';
import { formatEthiopianDate, getAddisNowDate } from '../../../../utils/dateTime';
import './Employees.css';

const Employees = () => {
  const { i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    academic: 0,
    administrative: 0,
    outsource: 0,
  });
  const [period, setPeriod] = useState('ALL');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef(null);

  // Multi-step Wizard States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [viewEmployeeId, setViewEmployeeId] = useState(null);
  
  // Delete confirm states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [terminationReason, setTerminationReason] = useState('');

  const displayEthDate = (ethValue, gregValue) => {
    if (ethValue) return ethValue;
    return formatEthiopianDate(gregValue);
  };

  const getLocalizedText = (enValue, amValue) => {
    if (isAmharic && amValue) return amValue;
    return enValue || amValue || '';
  };

  const getEmployeeDisplayName = (emp) => {
    const enName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    const amName = `${emp.firstNameAmharic || ''} ${emp.lastNameAmharic || ''}`.trim();
    return getLocalizedText(enName, amName) || (isAmharic ? 'ሰራተኛ' : 'Employee');
  };

  const getEmployeeTypeLabel = (value) => {
    const map = {
      ACADEMIC: { en: 'ACADEMIC', am: 'አካዳሚክ' },
      ADMINISTRATIVE: { en: 'ADMINISTRATIVE', am: 'አስተዳደራዊ' },
      OUTSOURCE: { en: 'OUTSOURCE', am: 'ውጭ' },
    };
    if (!value) return '';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  const getEmploymentTypeLabel = (value) => {
    const map = {
      FULLTIME: { en: 'FULLTIME', am: 'ሙሉ ጊዜ' },
      FULL_TIME: { en: 'FULLTIME', am: 'ሙሉ ጊዜ' },
      PARTTIME: { en: 'PARTTIME', am: 'ተከፋፈል ጊዜ' },
      CONTRACT: { en: 'CONTRACT', am: 'ውል' },
      INTERN: { en: 'INTERN', am: 'ስልጠና' },
    };
    if (!value) return '';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  const getEmploymentStatusLabel = (value) => {
    const map = {
      ACTIVE: { en: 'ACTIVE', am: 'ገባሪ' },
      ONLEAVE: { en: 'ON LEAVE', am: 'በፈቃድ' },
      TERMINATED: { en: 'TERMINATED', am: 'ተቋርጧል' },
      RESIGNED: { en: 'RESIGNED', am: 'ተቋርጧል' },
      INACTIVE: { en: 'INACTIVE', am: 'የማይሰራ' },
    };
    if (!value) return '';
    return isAmharic ? map[value]?.am || value : map[value]?.en || value;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target)) {
        setIsPeriodMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await employeeService.getAllEmployees(
        page,
        limit,
        debouncedSearch,
        sortBy,
        sortOrder,
        { period }
      );
      if (res.success) {
        setEmployees(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
        setSummary(res.summary || { totalEmployees: 0, academic: 0, administrative: 0, outsource: 0 });
      } else {
        toast.error("Failed to load employees");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy, sortOrder, period]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

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

  const triggerDelete = (emp) => {
    setEmployeeToDelete(emp);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      const resp = await employeeService.terminateEmployee(employeeToDelete.id, terminationReason);
      if (resp.success) {
        toast.success("Employee terminated successfully.");
        loadEmployees();
      } else {
        toast.error(resp.message || "Failed to terminate employee.");
      }
    } catch (error) {
      toast.error("Failed to terminate from server");
    } finally {
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
      setTerminationReason('');
    }
  };

  const viewDetails = (id) => {
    setViewEmployeeId(id);
  };
  
  const triggerEdit = (emp) => {
     setEditEmployeeId(emp.id);
     setIsWizardOpen(true);
  };

  const handleExportPdf = () => {
    const printContent = document.getElementById('employees-table-card-container');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
      styles += el.outerHTML;
    });

    const dateStr = getAddisNowDate();

    printWindow.document.write(`
      <html>
        <head>
          <title>Employee Directory Report</title>
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
             /* Hide irrelevant details */
             .table-footer, 
             .table-actions,
             .page-limit-selector,
             .pagination-controls { 
               display: none !important; 
             }
             /* Hide Actions column entirely */
             th:last-child, td:last-child { display: none !important; }
             
             /* Clean up table style */
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
               vertical-align: middle !important;
             }
             th { 
               background-color: #f8fafc !important; 
               color: #334155 !important; 
               font-weight: 700 !important; 
               text-transform: uppercase !important; 
               font-size: 9pt !important;
             }
             
             .table-avatar { display: none !important; }
             .col-primary-text { gap: 2px !important; }
             
             h1 { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0 0 5px 0; font-size: 20pt; }
             .report-header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
             .report-meta { color: #64748b; font-size: 10pt; margin: 0; display: flex; justify-content: space-between; }
             
             /* Ensure responsive layout in print */
             .table-responsive-wrapper {
               overflow: visible !important;
               width: 100% !important;
             }
             .employees-table-card {
               box-shadow: none !important;
               border: none !important;
               background: transparent !important;
             }
             
             td strong { color: #0f172a !important; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>Employee Directory Report</h1>
            <div class="report-meta">
              <span>Generated on: ${dateStr}</span>
              <span>Total Records: ${employees.length}</span>
            </div>
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

  const periodOptions = [
    { value: 'ALL', label: isAmharic ? 'ሁሉንም አሳይ' : 'All Time' },
    { value: 'DAILY', label: isAmharic ? 'ዕለታዊ' : 'Daily' },
    { value: 'WEEKLY', label: isAmharic ? 'ሳምንታዊ' : 'Weekly' },
    { value: 'MONTHLY', label: isAmharic ? 'ወርሃዊ' : 'Monthly' },
    { value: 'YEARLY', label: isAmharic ? 'አመታዊ' : 'Yearly' },
  ];

  const selectedPeriodLabel = periodOptions.find((item) => item.value === period)?.label || (isAmharic ? 'ሁሉንም አሳይ' : 'All Time');

  return (
    <div className="employees-container">
      <div className="employees-directory-header">
        <div className="employees-directory-title-block">
          <h2>{isAmharic ? 'የሰራተኞች ማውጫ' : 'Employee Directory'}</h2>
          <p>{isAmharic ? 'የድርጅቱ ሰራተኞችን ይቆጣጠሩ እና ያስተዳድሩ' : 'Monitor and manage your organization workforce'}</p>
        </div>

        <div className="employees-directory-actions">
          <div className="employees-period-filter-wrap" ref={periodMenuRef}>
            <button
              type="button"
              className={`employees-period-filter-trigger ${isPeriodMenuOpen ? 'open' : ''}`}
              onClick={() => setIsPeriodMenuOpen((prev) => !prev)}
            >
              <span>{selectedPeriodLabel}</span>
              <ChevronDown size={16} className="employees-period-filter-chevron" />
            </button>

            {isPeriodMenuOpen && (
              <div className="employees-period-filter-menu">
                {periodOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`employees-period-filter-option ${period === item.value ? 'active' : ''}`}
                    onClick={() => {
                      setPeriod(item.value);
                      setPage(1);
                      setIsPeriodMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-add-employee" onClick={() => { setEditEmployeeId(null); setIsWizardOpen(true); }}>
            <Plus size={18} /> {isAmharic ? 'ሰራተኛ አክል' : 'Add Employee'}
          </button>
        </div>
      </div>

      <div className="employees-summary-grid">
        <div className="employees-summary-card">
          <div className="employees-summary-icon"><Users size={18} /></div>
          <div className="employees-summary-content">
            <span className="employees-summary-kicker">{isAmharic ? 'አጠቃላይ' : 'All Employees'}</span>
            <div className="employees-summary-value">{summary.totalEmployees}</div>
            <span className="employees-summary-label">{isAmharic ? 'ጠቅላላ ሰራተኞች' : 'Total Employees'}</span>
          </div>
        </div>

        <div className="employees-summary-card">
          <div className="employees-summary-icon"><GraduationCap size={18} /></div>
          <div className="employees-summary-content">
            <span className="employees-summary-kicker">{isAmharic ? 'አካዳሚክ' : 'TENURED'}</span>
            <div className="employees-summary-value">{summary.academic}</div>
            <span className="employees-summary-label">{isAmharic ? 'ጠቅላላ አካዳሚክ' : 'Total Academic'}</span>
          </div>
        </div>

        <div className="employees-summary-card">
          <div className="employees-summary-icon"><BriefcaseBusiness size={18} /></div>
          <div className="employees-summary-content">
            <span className="employees-summary-kicker">{isAmharic ? 'ኦፕሬሽናል' : 'OPERATIONAL'}</span>
            <div className="employees-summary-value">{summary.administrative}</div>
            <span className="employees-summary-label">{isAmharic ? 'ጠቅላላ አስተዳደራዊ' : 'Total Administrative'}</span>
          </div>
        </div>

        <div className="employees-summary-card">
          <div className="employees-summary-icon"><Building2 size={18} /></div>
          <div className="employees-summary-content">
            <span className="employees-summary-kicker">{isAmharic ? 'ውጭ ኮንትራክት' : 'CONTRACTUAL'}</span>
            <div className="employees-summary-value">{summary.outsource}</div>
            <span className="employees-summary-label">{isAmharic ? 'ጠቅላላ ውጭ ሰራተኛ' : 'Total Outsource'}</span>
          </div>
        </div>
      </div>

      <div className="employees-top-toolbar">
        <label className="search-wrapper-emp" htmlFor="searchEmployee">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            id="searchEmployee" 
            type="text" 
              placeholder={isAmharic ? 'ሰራተኞችን በስም፣ በኢሜል ወይም በመለያ ያግኙ...' : 'Search employees by name, email, or ID...'} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="employees-export-btn" onClick={handleExportPdf}>
          <Download size={18} /> {isAmharic ? 'ወደ ፒዲኤፍ ላክ' : 'Export as PDF'}
        </button>
      </div>

      <div className="employees-table-card" id="employees-table-card-container">
        <div className="table-responsive-wrapper">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th>{isAmharic ? 'መገለጫ' : 'Profile'}</th>
                {isAmharic ? (
                  <th className="sortable-header" onClick={() => handleSort('firstNameAmharic')}>
                    <div className="th-content">ስም {renderSortIcon('firstNameAmharic')}</div>
                  </th>
                ) : (
                  <th className="sortable-header" onClick={() => handleSort('firstName')}>
                    <div className="th-content">Name {renderSortIcon('firstName')}</div>
                  </th>
                )}

                <th>{isAmharic ? 'ሚና/ዲፓርትመንት' : 'Role/Department'}</th>
                <th>{isAmharic ? 'ሁኔታ' : 'Status'}</th>
                <th className="sortable-header" onClick={() => handleSort('hireDate')}>
                  <div className="th-content">{isAmharic ? 'የተቀጠረበት ቀን' : 'Hire Date'} {renderSortIcon('hireDate')}</div>
                </th>
                <th>{isAmharic ? 'ድርጊቶች' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>{isAmharic ? 'ሰራተኞችን በመጫን ላይ...' : 'Loading...'}</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>{isAmharic ? 'ምንም ሰራተኛ አልተገኘም.' : 'No employees found.'}</td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div className="table-avatar">
                        {(() => {
                          const displayName = getEmployeeDisplayName(emp);
                          return (
                        <img 
                           src={emp.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0B8255&color=fff`} 
                           alt="avatar" 
                           onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0B8255&color=fff` }}
                        />
                          );
                        })()}
                      </div>
                    </td>
                    <td className="col-primary-text">
                       {getEmployeeDisplayName(emp)}
                       <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #6b7280)', fontWeight: 'normal'}}>
                         {emp.officialEmail || emp.personalEmail || (isAmharic ? "ኢሜል አልተገኘም" : "No Email")}
                       </span>
                    </td>

                    <td>
                      {getLocalizedText(emp.departmentName, emp.departmentNameAmharic) || (isAmharic ? "ዲፓርትመንት አልተመደበም" : "No Department")}
                    </td>
                    <td>
                      <span className={`badge ${emp.employmentStatus === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {getEmploymentStatusLabel(emp.employmentStatus || 'ACTIVE')}
                      </span>
                    </td>
                    <td>{displayEthDate(emp.hireDateEth, emp.hireDate) || (isAmharic ? 'አልተገኘም' : 'N/A')}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn-light" onClick={() => viewDetails(emp.id)} title={isAmharic ? 'ዝርዝሮችን ይመልከቱ' : "View Details"}>
                          <Eye size={14} />
                        </button>
                        <button className="action-btn-light" onClick={() => triggerEdit(emp)} title={isAmharic ? 'አስተካክል' : "Edit"}>
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn-light action-btn-danger" onClick={() => triggerDelete(emp)} title={isAmharic ? 'ሁኔታ አዘምን' : "Update Status"}>
                          <RefreshCw size={14} />
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
                 ? `ከ ${(page - 1) * limit + 1} እስከ ${Math.min(page * limit, pagination.total)} ከ ${pagination.total} ይታያል`
                 : `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, pagination.total)} of ${pagination.total}`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button>
               <button className="page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-step Modal Form for Employee Creation/Editing */}
      {isWizardOpen && (
        <EmployeeWizard 
          editEmployeeId={editEmployeeId}
          onClose={() => {
            setIsWizardOpen(false);
            setEditEmployeeId(null);
          }} 
          onSuccess={() => {
            setIsWizardOpen(false);
            setEditEmployeeId(null);
            loadEmployees();
          }} 
        />
      )}

      {/* Complex View Dashboard Overlay */}
      {viewEmployeeId && (
         <EmployeeProfileModal 
            employeeId={viewEmployeeId} 
            onClose={() => setViewEmployeeId(null)} 
         />
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        title={i18n.language === 'am' ? "የሰራተኛ ሁኔታን አዘምን" : "Update Employee Status"}
        content={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', textAlign: 'left' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {i18n.language === 'am' 
                ? `የ "${employeeToDelete?.firstNameAmharic || employeeToDelete?.firstName} ${employeeToDelete?.lastNameAmharic || employeeToDelete?.lastName}" ሁኔታን መቀየር እንደሚፈልጉ እርግጠኛ ነዎት?`
                : `Are you sure you want to update the status to TERMINATED for "${employeeToDelete?.firstName} ${employeeToDelete?.lastName}"?`}
            </p>
            <div className="premium-form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>
                {i18n.language === 'am' ? 'የማቋረጥ ምክንያት' : 'Termination Reason'} <span className="req">*</span>
              </label>
              <div className="premium-input-wrap">
                <textarea 
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder={i18n.language === 'am' ? 'ምክንያትዎን ያስገቡ...' : 'Enter termination reason...'}
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit' }}
                  required
                />
              </div>
            </div>
          </div>
        }
        confirmText={i18n.language === 'am' ? "አረጋግጥ" : "Confirm Update"}
        isDestructive={true}
        confirmDisabled={!terminationReason.trim()}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setTerminationReason('');
        }}
      />
    </div>
  );
};

export default Employees;
