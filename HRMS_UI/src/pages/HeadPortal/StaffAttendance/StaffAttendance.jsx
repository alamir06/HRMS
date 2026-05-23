import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Search, Filter, AlertCircle, User, ChevronDown } from 'lucide-react';
import api from '../../../services/api';
import { formatEthiopianDate } from '../../../utils/dateTime';
import '../../EmployeePortal/EmployeePortal.css';
import '../../HRManager/Attendance/Attendance.css';

const StaffAttendance = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);

  const [periodFilter, setPeriodFilter] = useState('DAILY'); // Default to today
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef(null);
  
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target)) {
        setIsPeriodMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [statusFilter, periodFilter, pagination.page]);

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (periodFilter) params.append('period', periodFilter);

      const res = await api.get(`/attendance?${params.toString()}`);
      if (res.data && res.data.success) {
        setAttendance(res.data.data || []);
        setPagination(prev => ({ ...prev, total: res.data.pagination.total }));
      }
    } catch (e) {
      console.error(e);
      toast.error(isAmharic ? 'መረጃ ማምጣት አልተቻለም' : 'Failed to fetch attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalizedText = (en, am) => {
    if (isAmharic && am) return am;
    return en || am || '';
  };

  const getFullName = (record) => {
    const enName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
    return enName || 'Employee';
  };

  const periodOptions = [
    { value: 'DAILY', label: isAmharic ? 'የዛሬ' : 'Today (Daily)' },
    { value: 'WEEKLY', label: isAmharic ? 'የዚህ ሳምንት' : 'This Week' },
    { value: 'MONTHLY', label: isAmharic ? 'የዚህ ወር' : 'This Month' },
    { value: '', label: isAmharic ? 'ሁሉም ጊዜ' : 'All Time' },
  ];
  const selectedPeriodLabel = periodOptions.find((item) => item.value === periodFilter)?.label || 'Today (Daily)';

  const statusOptions = [
    { value: '', label: isAmharic ? 'ሁሉም ሁኔታዎች' : 'All Statuses' },
    { value: 'PRESENT', label: isAmharic ? 'የመጣ' : 'Present' },
    { value: 'LATE', label: isAmharic ? 'ያረፈደ' : 'Late' },
    { value: 'ABSENT', label: isAmharic ? 'የቀረ' : 'Absent' },
    { value: 'HALFDAY', label: isAmharic ? 'ግማሽ ቀን' : 'Half Day' },
  ];
  const selectedStatusLabel = statusOptions.find((item) => item.value === statusFilter)?.label || 'All Statuses';

  return (
    <div className="employee-portal-container hr-attendance-container" style={{ padding: 0 }}>
      <div className="portal-header hr-attendance-summary-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
        <div>
          <h1>{isAmharic ? 'የሰራተኞች ክትትል' : 'Staff Attendance'}</h1>
          <p>{isAmharic ? 'በእርስዎ ስር ያሉ የሰራተኞች የዕለት ተዕለት ክትትል' : 'Daily attendance records for your staff.'}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    className={`hr-attendance-period-filter-option ${periodFilter === item.value ? 'active' : ''}`}
                    onClick={() => {
                      setPeriodFilter(item.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                      setIsPeriodMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hr-attendance-period-filter-wrap" ref={statusMenuRef}>
            <button
              type="button"
              className={`hr-attendance-period-filter-trigger ${isStatusMenuOpen ? 'open' : ''}`}
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
            >
              <span>{selectedStatusLabel}</span>
              <ChevronDown size={16} className="hr-attendance-period-filter-chevron" />
            </button>

            {isStatusMenuOpen && (
              <div className="hr-attendance-period-filter-menu">
                {statusOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`hr-attendance-period-filter-option ${statusFilter === item.value ? 'active' : ''}`}
                    onClick={() => {
                      setStatusFilter(item.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                      setIsStatusMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hr-attendance-table-card">
        <div className="hr-attendance-responsive-wrapper">
          <table className="hr-attendance-data-table">
          <thead>
            <tr>
              <th>{isAmharic ? 'ስም' : 'Employee Name'}</th>
              <th>{isAmharic ? 'ቀን' : 'Date'}</th>
              <th>Morning Shift</th>
              <th>Afternoon Shift</th>
              <th>{isAmharic ? 'ሁኔታ' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  {isAmharic ? 'በመጫን ላይ...' : 'Loading...'}
                </td>
              </tr>
            ) : attendance.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 10px', display: 'block' }} />
                  {isAmharic ? 'ምንም መረጃ አልተገኘም' : 'No attendance records found for this period.'}
                </td>
              </tr>
            ) : (
              (() => {
                const groupedAttendance = [];
                const map = new Map();

                attendance.forEach(record => {
                  const key = `${record.employeeId}_${record.date}`;
                  if (!map.has(key)) {
                    map.set(key, {
                      id: record.id,
                      employeeId: record.employeeId,
                      firstName: record.firstName,
                      lastName: record.lastName,
                      date: record.date,
                      morning: {},
                      afternoon: {}
                    });
                    groupedAttendance.push(map.get(key));
                  }
                  
                  const entry = map.get(key);
                  const sName = record.shiftName?.toLowerCase() || '';
                  if (sName.includes("morning") || record.shiftId === "1" || record.shiftId === "032ec84d-2a1d-11ef-9366-c8d9d20cba48") {
                    entry.morning = record;
                  } else {
                    entry.afternoon = record;
                  }
                  
                  const mStatus = String(entry.morning.status || "").toUpperCase();
                  const aStatus = String(entry.afternoon.status || "").toUpperCase();
                  
                  if (mStatus.includes("LEAVE") || aStatus.includes("LEAVE")) {
                    entry.overallStatus = "On Leave";
                  } else if (mStatus === "LATE" || aStatus === "LATE" || (entry.morning.lateMinutes > 0) || (entry.afternoon.lateMinutes > 0)) {
                    entry.overallStatus = "Late";
                  } else if (mStatus === "PRESENT" || aStatus === "PRESENT") {
                    entry.overallStatus = "Present";
                  } else {
                    entry.overallStatus = "Absent";
                  }
                });

                return groupedAttendance.map(entry => {
                  let badgeClass = 'hr-attendance-badge-rejected';
                  if (entry.overallStatus === 'Present') badgeClass = 'hr-attendance-badge-approved';
                  else if (entry.overallStatus === 'Late') badgeClass = 'hr-attendance-badge-info';
                  else if (entry.overallStatus === 'On Leave') badgeClass = 'hr-attendance-badge-pending';
                  
                  return (
                    <tr key={entry.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="hr-attendance-avatar">
                            <img src={`${import.meta.env.VITE_AVATAR_API_URL}?name=${encodeURIComponent(getFullName(entry))}&background=0B8255&color=fff`} alt="avatar"/>
                          </div>
                          <div className="hr-attendance-col-primary-text" style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong>{getFullName(entry)}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{formatEthiopianDate(entry.date)}</td>
                      <td>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                               In: <strong style={{ color: 'var(--text-primary)' }}>{entry.morning.checkIn || '--:--'}</strong>
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                               Out: <strong style={{ color: 'var(--text-primary)' }}>{entry.morning.checkOut || '--:--'}</strong>
                            </span>
                         </div>
                      </td>
                      <td>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                               In: <strong style={{ color: 'var(--text-primary)' }}>{entry.afternoon.checkIn || '--:--'}</strong>
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                               Out: <strong style={{ color: 'var(--text-primary)' }}>{entry.afternoon.checkOut || '--:--'}</strong>
                            </span>
                         </div>
                      </td>
                      <td>
                        <span className={`hr-attendance-badge ${badgeClass}`}>
                          {entry.overallStatus}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;
