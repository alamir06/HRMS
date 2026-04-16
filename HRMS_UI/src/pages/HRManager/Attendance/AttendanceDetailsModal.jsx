import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Clock, CheckCircle2 } from 'lucide-react';
import { attendanceService } from '../../../services/attendanceService';
import { formatEthiopianDate } from '../../../utils/dateTime';

const AttendanceDetailsModal = ({ employee, onClose }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await attendanceService.getEmployeeAttendance(employee.id, { limit: 50 });
        if (res.success) {
          setRecords(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch detailed records", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (employee?.id) {
      fetchRecords();
    }
  }, [employee]);

  return (
    <div className="hr-attendance-modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', position: 'fixed', inset: 0 }}>
      <div className="hr-attendance-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', width: '95%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div className="hr-attendance-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
           <div>
             <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1a202c' }}>Attendance History</h2>
             <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '0.9rem' }}>{employee.firstName} {employee.lastName} • {employee.department?.departmentName || "General Staff"}</p>
           </div>
           <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>
              <X size={20} />
           </button>
        </div>

        <div className="hr-attendance-modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f7fafc' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
             <table className="hr-attendance-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                   <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>DATE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>M. SHIFT</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>A. SHIFT</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>LATE (MINS)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>OVERTIME</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#4a5568', fontSize: '0.85rem' }}>NOTES</th>
                   </tr>
                </thead>
                <tbody>
                   {isLoading ? (
                     <tr>
                        <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#718096' }}>Loading records...</td>
                     </tr>
                   ) : records.length === 0 ? (
                     <tr>
                        <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#718096' }}>No attendance records found for this employee.</td>
                     </tr>
                   ) : (
                     Object.values(records.reduce((acc, rec) => {
                       if (!acc[rec.date]) acc[rec.date] = { date: rec.date, dateEth: rec.dateEth, shifts: [] };
                       acc[rec.date].shifts.push(rec);
                       return acc;
                     }, {})).sort((a, b) => new Date(b.date) - new Date(a.date)).map((group) => {
                       const morningRec = group.shifts.find(s => s.shiftName?.toLowerCase().includes("morning") || s.shiftId === "1") || {};
                       const afternoonRec = group.shifts.find(s => s.shiftName?.toLowerCase().includes("afternoon") || s.shiftId === "2") || {};
                       
                       const totalLate = group.shifts.reduce((sum, s) => sum + (Number(s.lateMinutes) || 0), 0);
                       const totalOvertime = group.shifts.reduce((sum, s) => sum + (Number(s.overtimeMinutes) || 0), 0);
                       
                       const displayStatus = morningRec.status || afternoonRec.status || "Present";
                       const notes = morningRec.notes || afternoonRec.notes || "";

                       return (
                         <tr key={group.date} style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontWeight: 500, color: '#2d3748' }}>{group.dateEth || formatEthiopianDate(group.date)}</span>
                                 <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{group.date} (GC)</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>In: <strong style={{ color: '#2d3748' }}>{morningRec.checkIn || '--:--'}</strong></span>
                                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>Out: <strong style={{ color: '#2d3748' }}>{morningRec.checkOut || '--:--'}</strong></span>
                               </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>In: <strong style={{ color: '#2d3748' }}>{afternoonRec.checkIn || '--:--'}</strong></span>
                                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>Out: <strong style={{ color: '#2d3748' }}>{afternoonRec.checkOut || '--:--'}</strong></span>
                               </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>{totalLate > 0 ? <span style={{ color: '#c53030', fontWeight: 600 }}>{totalLate}</span> : <span style={{ color: '#a0aec0' }}>0</span>}</td>
                            <td style={{ padding: '12px 16px' }}>{totalOvertime > 0 ? <span style={{ color: '#0b8255', fontWeight: 600 }}>{totalOvertime}</span> : <span style={{ color: '#a0aec0' }}>0</span>}</td>
                            <td style={{ padding: '12px 16px' }}>
                               <span className={`hr-attendance-badge ${displayStatus === 'Late' || displayStatus === 'Absent' ? 'hr-attendance-badge-rejected' : 'hr-attendance-badge-approved'}`}>
                                  {displayStatus}
                               </span>
                            </td>
                            <td style={{ padding: '12px 16px', maxWidth: '150px' }}>
                               <div style={{ fontSize: '0.85rem', color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={notes}>
                                 {notes || "-"}
                               </div>
                            </td>
                         </tr>
                       );
                     })
                   )}
                </tbody>
             </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AttendanceDetailsModal;
