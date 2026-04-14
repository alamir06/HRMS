import React, { useState, useEffect } from "react";
import "./Attendance.css";
import { Search, Download, Users, CheckCircle2, Clock, Umbrella, Plus, X, Sun, Cloud, CalendarDays, Lock, Check } from "lucide-react";
import { toast } from "react-toastify";
import EthiopianDateInput from "../../../components/common/EthiopianDateInput";
import { employeeService } from "../../../services/employeeService";
import { attendanceService } from "../../../services/attendanceService";
import { formatEthiopianDateTime } from "../../../utils/dateTime";

const statusOptions = ["Present", "Late", "On Leave", "Absent"];

const Attendance = () => {
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [stampTime, setStampTime] = useState("");
  
  // Data States
  const [employeesData, setEmployeesData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState({ totalStaff: 0, presentToday: 0, lateArrival: 0, onLeave: 0 });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [record, setRecord] = useState({
    employee: "",
    date: new Date().toISOString().split("T")[0],
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
    const delayDebounce = setTimeout(() => {
      loadGridData();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const loadGridData = async () => {
     setIsLoading(true);
     try {
        const empRes = await employeeService.getAllEmployees(1, 50, search);
        const emps = empRes.success ? empRes.data.data || empRes.data : [];

        const today = new Date().toISOString().split("T")[0];
        const attRes = await attendanceService.getAllAttendance({ Date: today });
        const atts = attRes.success ? attRes.data : [];

        setEmployeesData(emps);
        setAttendanceData(atts);

        const presentCount = atts.filter(a => a.status === 'Present').length;
        const lateCount = atts.filter(a => a.status === 'Late' || Number(a.lateMinutes) > 0).length;
        const leaveCount = atts.filter(a => a.status === 'On Leave' || a.status === 'Leave').length;

        setSummary({
          totalStaff: empRes.success && empRes.pagination ? empRes.pagination.total : emps.length,
          presentToday: presentCount,
          lateArrival: lateCount,
          onLeave: leaveCount
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

  const handleDirectStamp = async (fieldKey, shiftName, type, statusKey) => {
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
        payload.status = record[statusKey];
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

  const getStampButton = (fieldKey, shiftName, type, statusKey, isDependentOn = null) => {
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
       <button type="button" disabled={isSaving} className="hr-attendance-stamp-btn" onClick={() => handleDirectStamp(fieldKey, shiftName, type, statusKey)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #38a169', background: 'white', color: '#38a169', cursor: 'pointer', fontWeight: 600 }}>
           <Clock size={16} /> {stampTime}
       </button>
     )
  };

  return (
    <div className="hr-attendance-container">
      <div className="hr-attendance-summary-header">
        <div className="hr-attendance-summary-spacer" />
        <button className="hr-attendance-export-btn" style={{ marginLeft: '10px' }} onClick={() => setIsNewRecordOpen(true)}>
          <Plus size={18} style={{ marginRight: '6px' }} /> 
          New Record
        </button>
      </div>

      <div className="hr-attendance-summary-grid">
        <div className="hr-attendance-summary-card total" style={{ background: '#e0f2fe', borderColor: '#bae6fd' }}>
          <div className="hr-attendance-summary-icon" style={{ color: '#0369a1' }}><Users size={16} /></div>
          <div>
            <span className="hr-attendance-summary-label">TOTAL STAFF</span>
            <div className="hr-attendance-summary-value">{summary.totalStaff}</div>
          </div>
        </div>

        <div className="hr-attendance-summary-card approved" style={{ background: '#edf8f2', borderColor: '#d8ecdf' }}>
          <div className="hr-attendance-summary-icon" style={{ color: '#198f55' }}><CheckCircle2 size={16} /></div>
          <div>
            <span className="hr-attendance-summary-label">PRESENT TODAY</span>
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
                  <th>MORNING SHIFT (02:00 - 06:00)</th>
                  <th>AFTERNOON SHIFT (08:00 - 11:00)</th>
               </tr>
            </thead>
            <tbody>
               {isLoading ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>Loading Data...</td>
                  </tr>
               ) : employeesData.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>No Employees found.</td>
                  </tr>
               ) : (
                 employeesData.map((emp) => {
                   const attRecord = attendanceData.find(a => a.employeeId === emp.id) || {};
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
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                 <span className="hr-attendance-type-badge">
                                    IN: {attRecord.checkIn ? attRecord.checkIn.slice(0, 5) : '-:-'}
                                 </span>
                                 <span className="hr-attendance-type-badge">
                                    OUT: {attRecord.checkOut ? attRecord.checkOut.slice(0, 5) : '-:-'}
                                 </span>
                              </div>
                              <div>
                                 <span className={`hr-attendance-badge ${attRecord.status === 'On Leave' ? 'hr-attendance-badge-approved' : attRecord.status === 'Absent' ? 'hr-attendance-badge-rejected' : 'hr-attendance-badge-pending'}`}>
                                    {attRecord.status || "Absent"}
                                 </span>
                              </div>
                           </div>
                        </td>
                        <td>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                 <span className="hr-attendance-type-badge" style={{ opacity: 0.6 }}>IN: -:-</span>
                                 <span className="hr-attendance-type-badge" style={{ opacity: 0.6 }}>OUT: -:-</span>
                              </div>
                              <div>
                                 <span className="hr-attendance-badge hr-attendance-badge-rejected">Absent</span>
                              </div>
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
            <span>Showing 1 to {employeesData.length} records</span>
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
                       <input 
                         type="text"
                         className="hr-attendance-action-modal-input"
                         style={{ minHeight: '40px', padding: '8px', width: '100%' }}
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
                       {isDropdownOpen && (
                         <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            {employeesData.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())).map((emp) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 8px', background: 'var(--bg-primary)' }}>
                       <EthiopianDateInput 
                          value={record.date} 
                          onChange={(val) => handleRecordChange("date", val)} 
                       />
                       <CalendarDays size={18} color="var(--text-secondary)" />
                    </div>
                 </div>
               </div>

               <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                     <Sun size={20} color="#0b8255" />
                     <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Morning Shift</h3>
                  </div>
                  <div className="hr-attendance-detail-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)' }}>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-IN</label>
                        {getStampButton("morningCheckIn", "Morning", "checkIn", "morningStatus")}
                     </div>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-OUT</label>
                        {getStampButton("morningCheckOut", "Morning", "checkOut", null, "morningCheckIn")}
                     </div>
                     <div className="hr-attendance-detail-item">
                        <label>STATUS</label>
                        <select className="hr-attendance-action-modal-input" style={{ minHeight: '38px', padding: '8px' }} value={record.morningStatus} onChange={e => handleRecordChange("morningStatus", e.target.value)}>
                           {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                     </div>
                  </div>
               </div>

               <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                     <Cloud size={20} color="#0b8255" />
                     <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Afternoon Shift</h3>
                  </div>
                  <div className="hr-attendance-detail-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)' }}>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-IN</label>
                        {getStampButton("afternoonCheckIn", "Afternoon", "checkIn", "afternoonStatus")}
                     </div>
                     <div className="hr-attendance-detail-item">
                        <label>CHECK-OUT</label>
                        {getStampButton("afternoonCheckOut", "Afternoon", "checkOut", null, "afternoonCheckIn")}
                     </div>
                     <div className="hr-attendance-detail-item">
                        <label>STATUS</label>
                        <select className="hr-attendance-action-modal-input" style={{ minHeight: '38px', padding: '8px' }} value={record.afternoonStatus} onChange={e => handleRecordChange("afternoonStatus", e.target.value)}>
                           {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
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
    </div>
  );
};

export default Attendance;
