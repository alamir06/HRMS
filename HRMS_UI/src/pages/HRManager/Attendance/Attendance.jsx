import React, { useState, useEffect, useRef } from "react";
import "./Attendance.css";
import { Search, Download, Users, CheckCircle2, Clock, Umbrella, ChevronDown, ChevronLeft, ChevronRight, Eye, Lock } from "lucide-react";
import AttendanceDetailsModal from "./AttendanceDetailsModal";
import { employeeService } from "../../../services/employeeService";
import { attendanceService } from "../../../services/attendanceService";
import { leaveService } from "../../../services/leaveService";
import { formatEthiopianDateTime, formatEthiopianDate } from "../../../utils/dateTime";

const statusOptions = ["Present", "Late", "On Leave", "Absent"];

const Attendance = () => {
  // Data States
  const [employeesData, setEmployeesData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({ totalStaff: 0, presentToday: 0, lateArrival: 0, onLeave: 0 });
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


  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadGridData();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search, timeFilter, page, limit]);

  const loadGridData = async () => {
     setIsLoading(true);
     try {
        const empRes = await employeeService.getAllEmployees(page, limit, search, "createdAt", "DESC", { period: "ALL", employeeType: 'ADMINISTRATIVE' });
        const allEmps = empRes.success ? empRes.data.data || empRes.data : [];
        setPagination(empRes.pagination || { total: allEmps.length, pages: 1 });
        const activeEmps = allEmps.filter(e => !e.employmentStatus || String(e.employmentStatus).trim().toUpperCase() !== 'TERMINATED');

        const systemEmpRes = await employeeService.getAllEmployees(1, 1000, search, "createdAt", "DESC", { period: "ALL", employeeType: 'ADMINISTRATIVE' });
        const globalEmps = systemEmpRes.success ? systemEmpRes.data.data || systemEmpRes.data : [];
        const validSystemEmps = globalEmps.filter(e => !e.employmentStatus || String(e.employmentStatus).trim().toUpperCase() !== 'TERMINATED');

        const attRes = await attendanceService.getAllAttendance({ period: timeFilter, limit: 10000 });
        const atts = attRes.success ? attRes.data : [];

        // Fetch leave data to accurately calculate "On Leave" days
        let leaves = [];
        try {
           const leaveRes = await leaveService.getAllLeaveRequests({ status: 'APPROVED', limit: 10000 });
           leaves = leaveRes.success ? leaveRes.data : [];
        } catch (e) {
           console.error("Failed fetching leaves", e);
        }

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
             
             const normalizedStatus = String(dailyStatus).trim().toUpperCase();
             if (normalizedStatus === "ABSENT" || empRecords.length === 0) calcAbsent++;
             else if (normalizedStatus === "LATE" || morningRec.lateMinutes > 0 || afternoonRec.lateMinutes > 0) calcLate++;
             else if (normalizedStatus === "ON LEAVE" || normalizedStatus === "LEAVE") calcLeave++;
             else calcPresent++;
          }
        });

        setEmployeesData(activeEmps);
        setAttendanceData(atts);
        setLeaveData(leaves);

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

  const handleExportPdf = () => {
     const printContent = document.getElementById("attendance-table-container");
     if (!printContent) return;
     const printWindow = window.open('', '_blank', 'width=1000,height=800');
     let styles = '';
     document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => { styles += el.outerHTML; });
     const dateStr = formatEthiopianDateTime(new Date());
     
     const periodText = timeFilter === 'DAILY' ? 'Daily' : timeFilter === 'WEEKLY' ? 'Weekly' : timeFilter === 'MONTHLY' ? 'Monthly' : 'Yearly';

     printWindow.document.write(`
       <html>
         <head>
           <title>Attendance Report</title>
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
             .hr-attendance-table-footer, 
             .hr-attendance-table-actions,
             .hr-attendance-page-limit-selector,
             .hr-attendance-pagination-controls { 
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
             
             .hr-attendance-avatar { display: none !important; }
             .hr-attendance-col-primary-text { gap: 2px !important; }
             
             h1 { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0 0 5px 0; font-size: 20pt; }
             .report-header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
             .report-meta { color: #64748b; font-size: 10pt; margin: 0; display: flex; justify-content: space-between; }
             
             /* Ensure responsive layout in print */
             .hr-attendance-responsive-wrapper {
               overflow: visible !important;
               width: 100% !important;
             }
             .hr-attendance-table-card {
               box-shadow: none !important;
               border: none !important;
               background: transparent !important;
             }
             
             td strong { color: #0f172a !important; }
           </style>
         </head>
         <body>
           <div class="report-header">
             <h1>Attendance Report (${periodText})</h1>
             <div class="report-meta">
               <span>Generated on: ${dateStr}</span>
               <span>Total Records: ${employeesData.length}</span>
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
     }, 800);
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
                   <th>EMPLOYEE (Leaves: {leaveData?.length || 0})</th>
                   {timeFilter === 'DAILY' ? (
                     <>
                       <th>Morning Shift</th>
                       <th>Afternoon Shift</th>
                       <th>STATUS</th>
                     </>
                   ) : (
                     <>
                       <th>PRESENT DAYS</th>
                       <th>LATE DAYS</th>
                       <th>ABSENT DAYS</th>
                       <th>ON LEAVE</th>
                     </>
                   )}
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

                   const todayStr = new Date().toISOString().slice(0, 10);
                   const empLeavesForStatus = leaveData.filter(l => l.employeeId === emp.id);
                   const hasActiveLeaveToday = empLeavesForStatus.some(l => {
                       const start = l.startDate ? l.startDate.slice(0, 10) : '';
                       const end = l.endDate ? l.endDate.slice(0, 10) : '';
                       return start && end && todayStr >= start && todayStr <= end;
                   });
                   const isEmpOnLeave = (emp.employmentStatus && String(emp.employmentStatus).trim().toUpperCase().replace(/\s+/g, '') === 'ONLEAVE') || hasActiveLeaveToday;
                   
                   let displayStatus = "Absent";
                   if (isEmpOnLeave) {
                      displayStatus = "On Leave";
                   } else if (empRecords.length > 0) {
                      const mStatus = String(morningRec.status || "").toUpperCase();
                      const aStatus = String(afternoonRec.status || "").toUpperCase();
                      
                      if (mStatus === "LATE" || aStatus === "LATE" || morningRec.lateMinutes > 0 || afternoonRec.lateMinutes > 0) {
                         displayStatus = "Late";
                      } else if (mStatus === "PRESENT" || aStatus === "PRESENT") {
                         displayStatus = "Present";
                      } else {
                         displayStatus = "Absent";
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
                        {timeFilter === 'DAILY' ? (
                          <>
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
                          </>
                        ) : (
                          (() => {
                             let presentDays = 0;
                             let lateDays = 0;
                             let absentDays = 0;
                             let leaveDays = 0;

                             
                             const groupedByDate = {};
                             empRecords.forEach(r => {
                               const date = r.Date || r.date;
                               if (!groupedByDate[date]) groupedByDate[date] = [];
                               groupedByDate[date].push(r);
                             });

                             const todayDate = new Date();
                             const empLeaves = leaveData.filter(l => l.employeeId === emp.id);
                             let periodStart = new Date(todayDate);

                             const datesSet = new Set();
                             
                             if (timeFilter === 'WEEKLY') {
                               periodStart.setDate(todayDate.getDate() - 6);
                             } else if (timeFilter === 'MONTHLY') {
                               periodStart.setDate(todayDate.getDate() - 29);
                             } else if (timeFilter === 'YEARLY') {
                               periodStart.setDate(todayDate.getDate() - 364);
                             }
                             
                             // Generate all local dates from periodStart to today
                             const getLocalDateString = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                             
                             let currDate = new Date(periodStart);
                             while (currDate <= todayDate) {
                               datesSet.add(getLocalDateString(currDate));
                               currDate.setDate(currDate.getDate() + 1);
                             }

                             // Evaluate each date for Present, Late, Absent
                             datesSet.forEach(dateStr => {
                               // Check if this date falls within the leave we just calculated
                               let isThisDateOnLeave = false;
                               if (empLeaves.length > 0) {
                                  const d = dateStr.slice(0, 10);
                                  isThisDateOnLeave = empLeaves.some(l => {
                                     const start = l.startDate ? l.startDate.slice(0, 10) : '';
                                     const end = l.endDate ? l.endDate.slice(0, 10) : '';
                                     return start && end && d >= start && d <= end;
                                  });
                               }

                               if (isThisDateOnLeave) {
                                  leaveDays++; // Always count leave days bounded to the period
                                  return; // Skip attendance checks if they were on approved leave
                               }
                               
                               const dayRecs = groupedByDate[dateStr];
                               if (dayRecs && dayRecs.length > 0) {
                                 const mRec = dayRecs.find(a => a.shiftName?.toLowerCase().includes("morning") || a.shiftId === "1") || {};
                                 const aRec = dayRecs.find(a => a.shiftName?.toLowerCase().includes("afternoon") || a.shiftId === "2") || {};

                                 const mStatus = String(mRec.status || "").toUpperCase();
                                 const aStatus = String(aRec.status || "").toUpperCase();

                                 if (mStatus === 'ON LEAVE' || aStatus === 'ON LEAVE') {
                                    leaveDays++;
                                 }
                                 else if (mStatus === 'LATE' || aStatus === 'LATE' || mRec.lateMinutes > 0 || aRec.lateMinutes > 0) lateDays++;
                                 else if (mStatus === 'PRESENT' || aStatus === 'PRESENT') presentDays++;
                                 else absentDays++;
                               } else {
                                  // No attendance record for this weekday means the employee was absent
                                  absentDays++;
                               }
                             });

                             return (
                               <>
                                 <td style={{ textAlign: 'center' }}>
                                   <strong style={{ color: '#0b8255', fontSize: '1.1rem' }}>{presentDays}</strong>
                                 </td>
                                 <td style={{ textAlign: 'center' }}>
                                   <strong style={{ color: lateDays > 0 ? '#c53030' : 'inherit', fontSize: '1.1rem' }}>{lateDays}</strong>
                                 </td>
                                 <td style={{ textAlign: 'center' }}>
                                   <strong style={{ color: absentDays > 0 ? '#c53030' : 'inherit', fontSize: '1.1rem' }}>{absentDays}</strong>
                                 </td>
                                 <td style={{ textAlign: 'center' }}>
                                   <strong style={{ color: leaveDays > 0 ? '#c66a2f' : 'inherit', fontSize: '1.1rem' }}>{leaveDays}</strong>
                                 </td>
                               </>
                             );
                          })()
                        )}
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

      {viewDetailsEmp && (
         <AttendanceDetailsModal employee={viewDetailsEmp} onClose={() => setViewDetailsEmp(null)} />
      )}
    </div>
  
  );
};

export default Attendance;
