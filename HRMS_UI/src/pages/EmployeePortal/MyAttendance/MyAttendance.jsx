import React, { useState, useEffect } from 'react';
import { Clock, CalendarDays, CheckCircle2, Umbrella, AlertCircle, Eye } from 'lucide-react';
import AttendanceDetailsModal from '../../HRManager/Attendance/AttendanceDetailsModal';
import { attendanceService } from '../../../services/attendanceService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../EmployeePortal.css';
import './MyAttendance.css';
import '../../HRManager/Attendance/Attendance.css';

const MyAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState({ present: 0, late: 0, absent: 0, onLeave: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const user = JSON.parse((localStorage.getItem('user') || sessionStorage.getItem('user')) || '{}');
  const employeeId = user?.employeeId;

  useEffect(() => {
    if (employeeId) {
      fetchAttendance();
    } else {
      setIsLoading(false);
    }
  }, [employeeId]);

  const fetchAttendance = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await attendanceService.getEmployeeAttendance(employeeId, { limit: 100 });
      if (res.success && res.data) {
        setAttendanceData(res.data);
        calculateSummary(res.data);
      } else {
        setErrorMsg(res.error || "Failed to fetch. Success flag was false.");
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      setErrorMsg(error.response?.data?.error || error.message || "Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = (data) => {
    let present = 0;
    let late = 0;
    let absent = 0;
    
    // Group by date to calculate accurate daily summary
    const grouped = {};
    data.forEach(record => {
      const rawDate = record.Date || record.date;
      if (!grouped[rawDate]) grouped[rawDate] = [];
      grouped[rawDate].push(record);
    });

    Object.values(grouped).forEach(dayRecords => {
      let isLate = false;
      let isPresent = false;
      dayRecords.forEach(rec => {
        const status = String(rec.status || '').toUpperCase();
        if (status === 'LATE' || rec.lateMinutes > 0) isLate = true;
        if (status === 'PRESENT' || status === 'LATE') isPresent = true;
      });

      if (isLate) late++;
      else if (isPresent) present++;
      else absent++;
    });

    setSummary({ present, late, absent, onLeave: 0 });
  };

  const groupedByDate = {};
  attendanceData.forEach(record => {
    const rawDate = record.Date || record.date;
    if (!groupedByDate[rawDate]) groupedByDate[rawDate] = [];
    groupedByDate[rawDate].push(record);
  });
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));


  return (
    <div className="employee-portal-container">

      <div className="portal-recent-activity">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Attendance Log</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarDays size={16} /> Last 30 Days
          </div>
        </div>
        
        <div className="hr-attendance-table-card" style={{ marginTop: '20px' }}>
          <div className="hr-attendance-responsive-wrapper">
             <table className="hr-attendance-data-table">
                <thead>
                   <tr>
                      <th>DATE</th>
                      <th>Morning Shift</th>
                      <th>Afternoon Shift</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                   </tr>
                </thead>
                <tbody>
               {isLoading ? (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading attendance records...</td>
                 </tr>
               ) : !employeeId ? (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#854d0e' }}>
                     <strong>No Employee Profile Linked</strong>
                     <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Your current account is not linked to an employee profile. Please log in as an actual employee to view personal attendance records.</p>
                   </td>
                 </tr>
               ) : errorMsg ? (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'red' }}>Error: {errorMsg}</td>
                 </tr>
               ) : sortedDates.length === 0 ? (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No attendance records found.</td>
                 </tr>
               ) : (
                 sortedDates.map((dateStr) => {
                   const dayRecords = groupedByDate[dateStr];
                   const morningRec = dayRecords.find(a => a.shiftName?.toLowerCase().includes("morning") || a.shiftId === "1") || {};
                   const afternoonRec = dayRecords.find(a => a.shiftName?.toLowerCase().includes("afternoon") || a.shiftId === "2") || {};

                   let displayStatus = "Absent";
                   if (dayRecords.length > 0) {
                      const mStatus = String(morningRec.status || "").toUpperCase();
                      const aStatus = String(afternoonRec.status || "").toUpperCase();
                      if (mStatus === "LATE" || aStatus === "LATE" || morningRec.lateMinutes > 0 || afternoonRec.lateMinutes > 0) {
                         displayStatus = "Late";
                      } else {
                         displayStatus = "Present";
                      }
                   }

                   return (
                     <tr key={dateStr}>
                        <td>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{formatEthiopianDate(dateStr)}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{dateStr}</span>
                           </div>
                        </td>
                        <td>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 In: <strong style={{ color: 'var(--text-primary)' }}>{morningRec.checkIn ? morningRec.checkIn.slice(0, 5) : '--:--'}</strong>
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 Out: <strong style={{ color: 'var(--text-primary)' }}>{morningRec.checkOut ? morningRec.checkOut.slice(0, 5) : '--:--'}</strong>
                              </span>
                           </div>
                        </td>
                        <td>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 In: <strong style={{ color: 'var(--text-primary)' }}>{afternoonRec.checkIn ? afternoonRec.checkIn.slice(0, 5) : '--:--'}</strong>
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                 Out: <strong style={{ color: 'var(--text-primary)' }}>{afternoonRec.checkOut ? afternoonRec.checkOut.slice(0, 5) : '--:--'}</strong>
                              </span>
                           </div>
                        </td>
                        <td>
                           <span className={`hr-attendance-badge ${displayStatus === 'Late' || displayStatus === 'Absent' ? 'hr-attendance-badge-rejected' : 'hr-attendance-badge-approved'}`}>
                              {displayStatus}
                           </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                           <button 
                             className="action-btn-light" 
                             onClick={() => setIsModalOpen(true)}
                             title="View Details"
                           >
                              <Eye size={14} />
                           </button>
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

      {isModalOpen && (
        <AttendanceDetailsModal
          employee={{ id: employeeId, firstName: user?.firstName || 'My', lastName: 'Attendance', department: { departmentName: user?.department || 'Employee' } }}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MyAttendance;
