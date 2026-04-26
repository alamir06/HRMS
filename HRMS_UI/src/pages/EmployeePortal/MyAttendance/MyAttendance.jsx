import React, { useState, useEffect } from 'react';
import { Clock, CalendarDays, CheckCircle2, Umbrella, AlertCircle } from 'lucide-react';
import { attendanceService } from '../../../services/attendanceService';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../EmployeePortal.css';
import './MyAttendance.css';

const MyAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState({ present: 0, late: 0, absent: 0, onLeave: 0 });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
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
    
    // Simplistic summary for the fetched period
    data.forEach(record => {
      const status = String(record.status || '').toUpperCase();
      if (status === 'PRESENT') present++;
      else if (status === 'LATE') late++;
      else if (status === 'ABSENT') absent++;
    });

    setSummary({ present, late, absent, onLeave: 0 });
  };

  return (
    <div className="employee-portal-container">
      <div className="portal-header">
        <h1>My Attendance</h1>
        <p>Monitor your daily clock-ins, clock-outs, and accumulated hours automatically synced with your login activity.</p>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>Debug ID: {employeeId || 'None'}</p>
      </div>

      <div className="my-attendance-summary-grid">
        <div className="my-attendance-summary-card approved">
          <div className="my-attendance-summary-icon"><CheckCircle2 size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">PRESENT</span>
            <div className="my-attendance-summary-value">{summary.present}</div>
          </div>
        </div>

        <div className="my-attendance-summary-card rejected">
          <div className="my-attendance-summary-icon"><Clock size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">LATE ARRIVALS</span>
            <div className="my-attendance-summary-value">{summary.late}</div>
          </div>
        </div>

        <div className="my-attendance-summary-card total">
          <div className="my-attendance-summary-icon"><AlertCircle size={24} /></div>
          <div>
            <span className="my-attendance-summary-label">ABSENCES</span>
            <div className="my-attendance-summary-value">{summary.absent}</div>
          </div>
        </div>
      </div>

      <div className="portal-recent-activity">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Attendance Log</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarDays size={16} /> Last 30 Days
          </div>
        </div>
        
        <div className="my-attendance-table-wrapper">
          <table className="my-attendance-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>SHIFT</th>
                <th>CHECK IN</th>
                <th>CHECK OUT</th>
                <th>LATE MINS</th>
                <th>OVERTIME</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading attendance records...</td>
                </tr>
              ) : !employeeId ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#854d0e' }}>
                    <strong>No Employee Profile Linked</strong>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Your current account is not linked to an employee profile. Please log in as an actual employee to view personal attendance records.</p>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Error: {errorMsg}</td>
                </tr>
              ) : attendanceData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No attendance records found.</td>
                </tr>
              ) : (
                attendanceData.map(record => (
                  <tr key={record.id}>
                    <td>
                      <strong>{formatEthiopianDate(record.Date || record.date)}</strong>
                    </td>
                    <td>{record.shiftName || 'Standard Shift'}</td>
                    <td>{record.checkIn ? record.checkIn.slice(0, 5) : '--:--'}</td>
                    <td>{record.checkOut ? record.checkOut.slice(0, 5) : '--:--'}</td>
                    <td style={{ color: record.lateMinutes > 0 ? '#e53e3e' : 'inherit' }}>
                      {record.lateMinutes} mins
                    </td>
                    <td style={{ color: record.overtimeMinutes > 0 ? '#38a169' : 'inherit' }}>
                      {record.overtimeMinutes} mins
                    </td>
                    <td>
                      <span className={`my-attendance-badge ${String(record.status).toUpperCase() === 'LATE' ? 'late' : String(record.status).toUpperCase() === 'PRESENT' ? 'present' : 'absent'}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
