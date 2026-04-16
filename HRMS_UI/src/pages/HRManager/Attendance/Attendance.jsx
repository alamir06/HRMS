import React, { useState, useEffect, useRef } from "react";
import "./Attendance.css";
import { Search, Download, Users, CheckCircle2, Clock, Umbrella, Plus, X, Sun, Cloud, CalendarDays, Lock, Check, ChevronDown, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "react-toastify";
import EthiopianDateInput from "../../../components/common/EthiopianDateInput";
import AttendanceDetailsModal from "./AttendanceDetailsModal";
import { employeeService } from "../../../services/employeeService";
import { attendanceService } from "../../../services/attendanceService";
import { formatEthiopianDateTime, formatEthiopianDate } from "../../../utils/dateTime";

const statusOptions = ["Present", "Late", "On Leave", "Absent"];

const Attendance = () => {
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [stampTime, setStampTime] = useState("");
  
  // Data States
  const [employeesData, setEmployeesData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState({ totalStaff: 0, presentToday: 0, lateArrival: 0, onLeave: 0 });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("DAILY");
  const periodMenuRef = useRef(null);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [viewDetailsEmp, setViewDetailsEmp] = useState(null);

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

  const periodOptions = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' },
  ];
  const selectedPeriodLabel = periodOptions.find((item) => item.value === timeFilter)?.label || 'Daily';

  const getLocalDate = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const [record, setRecord] = useState({
    employee: "",
    date: getLocalDate(),
    morningCheckIn: null,
    morningCheckOut: null,
    morningStatus: "Present",
    afternoonCheckIn: null,
    afternoonCheckOut: null,
    afternoonStatus: "Present",
    remarks: "",
  });

  useEffect(() => {
    let timerId;
    if (isNewRecordOpen) {
      setStampTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase().replace(" ", ""));
      timerId = setInterval(() => {
        setStampTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase().replace(" ", ""));
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isNewRecordOpen]);

  useEffect(() => {
    const fetchExistingRecord = async () => {
      // Always reset the shift fields when employee or date changes
      setRecord(prev => ({
        ...prev,
        morningCheckIn: null, morningCheckOut: null,
        afternoonCheckIn: null, afternoonCheckOut: null,
        remarks: ""
      }));

      if (!isNewRecordOpen || !record.employee || !record.date) {
        return;
      }
      
      try {
         const res = await attendanceService.getEmployeeAttendance(record.employee, { limit: 50 });
         if (res.success && res.data) {
           const dayRecords = res.data.filter(r => r.date === record.date);
           const morningRec = dayRecords.find(r => r.shiftName && r.shiftName.toLowerCase().includes("morning")) || dayRecords.find(r => r.shiftId === "1"); 
           const afternoonRec = dayRecords.find(r => r.shiftName && r.shiftName.toLowerCase().includes("afternoon")) || dayRecords.find(r => r.shiftId === "2");
           
           setRecord(prev => ({
             ...prev,
             morningCheckIn: morningRec?.checkIn ? morningRec.checkIn.slice(0,5) : null,
             morningCheckOut: morningRec?.checkOut ? morningRec.checkOut.slice(0,5) : null,
             afternoonCheckIn: afternoonRec?.checkIn ? afternoonRec.checkIn.slice(0,5) : null,
             afternoonCheckOut: afternoonRec?.checkOut ? afternoonRec.checkOut.slice(0,5) : null,
             remarks: morningRec?.notes || afternoonRec?.notes || ""
           }));
         }
      } catch (error) {
         // API might return 404 if no records exist, which is fine, we remain reset.
      }
    };

    fetchExistingRecord();
  }, [isNewRecordOpen, record.employee, record.date]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadGridData();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search, timeFilter, page, limit]);

  const loadGridData = async () => {
     setIsLoading(true);
     try {
        const empRes = await employeeService.getAllEmployees(page, limit, search, "createdAt", "DESC", { period: "ALL" });
        const allEmps = empRes.success ? empRes.data.data || empRes.data : [];
        setPagination(empRes.pagination || { total: allEmps.length, pages: 1 });
        const activeEmps = allEmps.filter(e => !e.employmentStatus || String(e.employmentStatus).trim().toUpperCase() !== 'TERMINATED');

        const systemEmpRes = await employeeService.getAllEmployees(1, 1000, search, "createdAt", "DESC", { period: "ALL" });
        const globalEmps = systemEmpRes.success ? systemEmpRes.data.data || systemEmpRes.data : [];
        const validSystemEmps = globalEmps.filter(e => !e.employmentStatus || String(e.employmentStatus).trim().toUpperCase() !== 'TERMINATED');

        const attRes = await attendanceService.getAllAttendance({ period: timeFilter });
        const atts = attRes.success ? attRes.data : [];

        let calcPresent = 0;
        let calcLate = 0;
        let calcLeave = 0;
        let calcAbsent = 0;

        validSystemEmps.forEach(emp => {
          const empRecords = atts.filter(a => a.employeeId === emp.id);
          const morningRec = empRecords.find(a => a.shiftName?.toLowerCase().includes("morning") || a.shiftId === "1") || {};
          const afternoonRec = empRecords.find(a => a.shiftName?.toLowerCase().includes("afternoon") || a.shiftId === "2") || {};

          const isEmpOnLeave = emp.employmentStatus && String(emp.employmentStatus).trim().toUpperCase().replace(/\s+/g, '') === 'ONLEAVE';
          let dailyStatus = "Absent";
          
          if (isEmpOnLeave) {
             dailyStatus = "On Leave";
             calcLeave++;
          } else {
             if (empRecords.length > 0) {
               dailyStatus = morningRec.status || afternoonRec.status || "Present";
             }
             if (dailyStatus === "Absent" || empRecords.length === 0) calcAbsent++;
             else if (dailyStatus === "Late" || morningRec.lateMinutes > 0 || afternoonRec.lateMinutes > 0) calcLate++;
             else if (dailyStatus === "On Leave" || dailyStatus === "Leave") calcLeave++;
             else calcPresent++;
          }
        });

        setEmployeesData(activeEmps);
        setAttendanceData(atts);

        setSummary({
           totalStaff: empRes.pagination ? empRes.pagination.total : activeEmps.length,
           absentToday: calcAbsent,
           presentToday: calcPresent,
           lateArrival: calcLate,
           onLeave: calcLeave
        });
     } catch (e) {
        console.error("Failed fetching data", e);
     } finally {
        setIsLoading(false);
     }
  };

  const handleRecordChange = (field, value) => {
    setRecord((prev) => ({ ...prev, [field]: value }));
  };

  const handleDirectStamp = async (fieldKey, shiftName, type, isDependentOn = null) => {
    if (!record.employee || !record.date) {
      toast.error("Employee and Date are required to stamp!");
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        date: record.date,
        time: stampTime,
        shiftName: shiftName,
        notes: record.remarks,
      };

      let res;
      if (type === "checkIn") {
        res = await attendanceService.checkIn(record.employee, payload);
      } else {
        res = await attendanceService.checkOut(record.employee, payload);
      }

      if(res.success) {
        toast.success(`${fieldKey.replace(/([A-Z])/g, ' $1').trim()} logged successfully!`);
        handleRecordChange(fieldKey, stampTime);
        loadGridData();
      } else {
        toast.error(res.error || "Failed to save stamp");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Error saving stamp");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = () => {
     const printContent = document.getElementById("attendance-table-container");
     if (!printContent) return;
     const printWindow = window.open('', '_blank', 'width=1000,height=800');
     let styles = '';
     document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => { styles += el.outerHTML; });
     const dateStr = formatEthiopianDateTime(new Date());
     printWindow.document.write(`
       <html>
         <head>
           <title>Attendance Ledger Export</title>
           ${styles}
           <style>
             body { padding: 40px; background: white; font-family: Inter, sans-serif; }
             .hr-attendance-table-actions { display: none !important; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
             th { border-bottom: 2px solid #cbd5e1; }
             h1 { font-family: Inter, sans-serif; color: #2d3748; margin-bottom: 10px; }
           </style>
         </head>
         <body>
           <div>
             <h1>Attendance Ledger Report</h1>
             <p>Generated on: ${dateStr}</p>
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

   const getStampButton = (fieldKey, shiftName, type, isDependentOn = null) => {
     const val = record[fieldKey];
     if (val) {
        return (
           <div className="hr-attendance-stamp-btn hr-attendance-stamped" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #9ae6b4', background: '#f0fff4', color: '#276749', fontWeight: 600 }}>
              <Check size={16} /> {val}
           </div>
        )
     }
     if (isDependentOn && !record[isDependentOn]) {
       return (
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', border: '1px dashed #e2e8f0', background: '#f7fafc', color: '#a0aec0', fontWeight: 600 }}>
            <Lock size={16} /> PENDING
         </div>
       )
     }
     return (
       <button type="button" disabled={isSaving} className="hr-attendance-stamp-btn" onClick={() => handleDirectStamp(fieldKey, shiftName, type, isDependentOn)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #38a169', background: 'white', color: '#38a169', cursor: 'pointer', fontWeight: 600 }}>
           <Clock size={16} /> {stampTime}
       </button>
     )
  };

  return (
    <div className="hr-attendance-container">
      <div className="hr-attendance-summary-header">
        <div className="hr-attendance-summary-spacer" />
        <div className="hr-attendance-period-filter-wrap" ref={periodMenuRef}>
          <button
            type="button"
            className={`hr-attendance-period-filter-trigger ${isPeriodMenuOpen ? 'open' : ''}`}
            onClick={() => setIsPeriodMenuOpen((prev) => !prev)}
          >
            <span>{selectedPeriodLabel}</span>
            <ChevronDown size={16} className="hr-attendance-period-filter-chevron" />
          </button>

          {isPeriodMenuOpen && (
            <div className="hr-attendance-period-filter-menu">
              {periodOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`hr-attendance-period-filter-option ${timeFilter === item.value ? 'active' : ''}`}
                  onClick={() => {
                    setTimeFilter(item.value);
                    setIsPeriodMenuOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="hr-attendance-export-btn" style={{ marginLeft: '10px' }} onClick={() => {
           setRecord({
              employee: "",
              date: getLocalDate(),
              morningCheckIn: null,
              morningCheckOut: null,
              morningStatus: "Present",
              afternoonCheckIn: null,
              afternoonCheckOut: null,
              afternoonStatus: "Present",
              remarks: "",
           });
           setEmployeeSearch("");
           setIsNewRecordOpen(true);
        }}>
          <Plus size={18} style={{ marginRight: '6px' }} /> 
          New Record
        </button>
      </div>

      <div className="hr-attendance-summary-grid">
        <div className="hr-attendance-summary-card total" style={{ background: '#e0f2fe', borderColor: '#bae6fd' }}>
          <div className="hr-attendance-summary-icon" style={{ color: '#0369a1' }}><Users size={16} /></div>
          <div>
            <span className="hr-attendance-summary-label">TOTAL ABSENT</span>
            <div className="hr-attendance-summary-value">{summary.absentToday}</div>
          </div>
        </div>

        <div className="hr-attendance-summary-card approved" style={{ background: '#edf8f2', borderColor: '#d8ecdf' }}>
          <div className="hr-attendance-summary-icon" style={{ color: '#198f55' }}><CheckCircle2 size={16} /></div>
          <div>
            <span className="hr-attendance-summary-label">PRESENT</span>
            <div className="hr-attendance-summary-value">{summary.presentToday}</div>
          </div>
        </div>

        <div className="hr-attendance-summary-card rejected" style={{ background: '#fef2f2', borderColor: '#f4dddd' }}>
          <div className="hr-attendance-summary-icon" style={{ color: '#c53030' }}><Clock size={16} /></div>
          <div>
            <span className="hr-attendance-summary-label">LATE ARRIVAL</span>
            <div className="hr-attendance-summary-value">{summary.lateArrival}</div>
          </div>
        </div>

        <div className="hr-attendance-summary-card pending" style={{ background: '#fdf8ea', borderColor: '#f2e5be' }}>
          <div className="hr-attendance-summary-icon" style={{ color: '#c66a2f' }}><Umbrella size={16} /></div>
          <div>
            <span className="hr-attendance-summary-label">ON LEAVE</span>
            <div className="hr-attendance-summary-value">{summary.onLeave}</div>
          </div>
        </div>
      </div>

      <div className="hr-attendance-top-toolbar">
         <label className="hr-attendance-search-wrapper" htmlFor="searchAttendance">
            <Search size={18} color="var(--text-secondary)" />
            <input 
               id="searchAttendance" 
               type="text" 
               placeholder="Search by employee name or ID..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </label>
         <button className="hr-attendance-export-btn" onClick={handleExportPdf}>
            <Download size={18} style={{ marginRight: '6px' }} /> 
            Export as PDF
         </button>
      </div>

      <div className="hr-attendance-table-card" id="attendance-table-container">
        <div className="hr-attendance-responsive-wrapper">
         <table className="hr-attendance-data-table">
            <thead>
               <tr>
                  <th>EMPLOYEE</th>
                  <th>M. SHIFT</th>
                  <th>A. SHIFT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
               </tr>
            </thead>
            <tbody>
               {isLoading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading Data...</td>
                  </tr>
               ) : employeesData.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No Employees found.</td>
                  </tr>
               ) : (
                 employeesData.map((emp) => {
                   const empRecords = attendanceData.filter(a => a.employeeId === emp.id);
                   const morningRec = empRecords.find(a => a.shiftName?.toLowerCase().includes("morning") || a.shiftId === "1") || {};
                   const afternoonRec = empRecords.find(a => a.shiftName?.toLowerCase().includes("afternoon") || a.shiftId === "2") || {};

                   const isEmpOnLeave = emp.employmentStatus && String(emp.employmentStatus).trim().toUpperCase().replace(/\s+/g, '') === 'ONLEAVE';
                   
                   let displayStatus = "Absent";
                   if (isEmpOnLeave) {
                      displayStatus = "On Leave";
                   } else if (empRecords.length > 0) {
                      const mStatus = String(morningRec.status || "").toUpperCase();
                      const aStatus = String(afternoonRec.status || "").toUpperCase();
                      if (mStatus === "LATE" || aStatus === "LATE" || morningRec.lateMinutes > 0 || afternoonRec.lateMinutes > 0) {
                         displayStatus = "Late";
                      } else {
                         displayStatus = "Present";
                      }
                   }
                   
                   const showAsRejected = !isEmpOnLeave && (empRecords.length === 0 || displayStatus === "Absent");
                   
                   return (
                     <tr key={emp.id}>
                        <td>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="hr-attendance-avatar">
                                 <img src={emp.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((emp.firstName || "") + ' ' + (emp.lastName || ""))}&background=0B8255&color=fff`} alt="avatar"/>
                              </div>
                              <div className="hr-attendance-col-primary-text" style={{ display: 'flex', flexDirection: 'column' }}>
                                 <strong>{emp.firstName} {emp.lastName}</strong>
                                 <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.department?.departmentName || "General Staff"}</span>
                              </div>
                           </div>
                        </td>
                        <td>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 In: <strong style={{ color: 'var(--text-primary)' }}>{isEmpOnLeave ? '--:--' : morningRec.checkIn || '--:--'}</strong>
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 Out: <strong style={{ color: 'var(--text-primary)' }}>{isEmpOnLeave ? '--:--' : morningRec.checkOut || '--:--'}</strong>
                              </span>
                           </div>
                        </td>
                        <td>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 In: <strong style={{ color: 'var(--text-primary)' }}>{isEmpOnLeave ? '--:--' : afternoonRec.checkIn || '--:--'}</strong>
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 Out: <strong style={{ color: 'var(--text-primary)' }}>{isEmpOnLeave ? '--:--' : afternoonRec.checkOut || '--:--'}</strong>
                              </span>
                           </div>
                        </td>
                        <td>
                           <span className={`hr-attendance-badge ${displayStatus === 'On Leave' ? 'hr-attendance-badge-pending' : displayStatus === 'Late' ? 'hr-attendance-badge-info' : displayStatus === 'Present' ? 'hr-attendance-badge-approved' : 'hr-attendance-badge-rejected'}`}>
                              {displayStatus}
                           </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hr-attendance-table-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                             {isEmpOnLeave ? (
                                <button className="hr-attendance-action-btn-light" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Employee On Leave">
                                   <Lock size={14} />
                                </button>
                             ) : (
                                <button className="hr-attendance-action-btn-light" onClick={() => setViewDetailsEmp(emp)} title="View Details">
                                   <Eye size={14} />
                                </button>
                             )}
                          </div>
                        </td>
                     </tr>
                   );
                 })
               )}
            </tbody>
         </table>
        </div>
        <div className="hr-attendance-table-footer">
          <div className="hr-attendance-page-limit-selector">
            <span>Show</span>
            <select className="hr-attendance-limit-dropdown" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="hr-attendance-pagination-controls">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="hr-attendance-page-btn" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button>
               <button className="hr-attendance-page-btn" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {isNewRecordOpen && (
        <div className="hr-attendance-modal-overlay" onClick={() => setIsNewRecordOpen(false)}>
          <div className="hr-attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-attendance-modal-header">
               <h2>New Attendance Record</h2>
               <button className="hr-attendance-modal-close" onClick={() => setIsNewRecordOpen(false)}>
                  <X size={20} />
               </button>
            </div>

            <div className="hr-attendance-modal-body">
               <div className="hr-attendance-detail-grid">
                 <div className="hr-attendance-detail-item">
                    <label>Employee Name</label>
                    <div style={{ position: 'relative' }}>
                        <label htmlFor="modalEmployeeSearch" style={{ margin: 0, width: '100%', padding: '0 12px', minHeight: '40px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)' }}>
                          <Search size={18} color="var(--text-secondary)" />
                          <input 
                            id="modalEmployeeSearch"
                            type="text"
                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: '8px 0' }}
                            placeholder="Type to search..."
                            value={employeeSearch}
                            onChange={e => {
                               setEmployeeSearch(e.target.value);
                               if(!isDropdownOpen) setIsDropdownOpen(true);
                               if (e.target.value === '') handleRecordChange("employee", "");
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                          />
                        </label>
                       {isDropdownOpen && (
                         <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            {employeesData.filter(emp => {
                               const isNotOnLeave = !(emp.employmentStatus && String(emp.employmentStatus).trim().toUpperCase().replace(/\s+/g, '') === 'ONLEAVE');
                               const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase());
                               return isNotOnLeave && matchesSearch;
                            }).map((emp) => (
                               <div 
                                 key={emp.id} 
                                 style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                 onMouseDown={() => {
                                    handleRecordChange("employee", emp.id);
                                    setEmployeeSearch(`${emp.firstName} ${emp.lastName}`);
                                    setIsDropdownOpen(false);
                                 }}
                               >
                                  {emp.firstName} {emp.lastName}
                               </div>
                            ))}
                            {employeesData.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                               <div style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>No matches found...</div>
                            )}
                         </div>
                       )}
                    </div>
                 </div>
                 <div className="hr-attendance-detail-item">
                    <label>Entry Date</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#4a5568', fontWeight: 600, width: '100%', cursor: 'not-allowed', height: '40px' }}>
                        <CalendarDays size={18} /> {formatEthiopianDate(record.date)}
                     </div>
                  </div>
               </div>

               <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                     <Sun size={20} color="#0b8255" />
                     <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Morning Shift</h3>
                  </div>
                  <div className="hr-attendance-detail-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-IN</label>
                        {getStampButton("morningCheckIn", "Morning", "checkIn")}
                     </div>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-OUT</label>
                        {getStampButton("morningCheckOut", "Morning", "checkOut", "morningCheckIn")}
                     </div>
                  </div>
               </div>

               <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                     <Cloud size={20} color="#0b8255" />
                     <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Afternoon Shift</h3>
                  </div>
                  <div className="hr-attendance-detail-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-IN</label>
                        {getStampButton("afternoonCheckIn", "Afternoon", "checkIn")}
                     </div>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-OUT</label>
                        {getStampButton("afternoonCheckOut", "Afternoon", "checkOut", "afternoonCheckIn")}
                     </div>
                  </div>
               </div>

               <div className="hr-attendance-detail-item">
                  <label>Internal Remarks</label>
                  <textarea 
                     className="hr-attendance-action-modal-input"
                     placeholder="Any notable observations for this entry..."
                     value={record.remarks}
                     onChange={e => handleRecordChange("remarks", e.target.value)}
                     rows={3}
                  ></textarea>
               </div>
            </div>
            
            <div className="hr-attendance-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Secure Ledger Entry
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                 <button 
                    style={{ padding: '8px 24px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                    onClick={() => setIsNewRecordOpen(false)}
                 >
                    Done
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {viewDetailsEmp && (
         <AttendanceDetailsModal employee={viewDetailsEmp} onClose={() => setViewDetailsEmp(null)} />
      )}
    </div>
  
  );
};

export default Attendance;
