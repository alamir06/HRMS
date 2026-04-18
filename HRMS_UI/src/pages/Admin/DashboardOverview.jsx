import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  Users, Building2, GraduationCap, BriefcaseBusiness, Globe,
  CalendarDays, Download, Sparkles, ChevronDown
} from 'lucide-react';
import api from '../../services/api';
import { formatEthiopianDate, gregorianToEthiopian } from '../../utils/dateTime';
import './DashboardOverview.css';

const DONUT_COLORS = ['#10a36c', '#a7f3d0', '#ef4444'];

const DashboardOverview = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    totalAcademic: 0,
    totalAdministrative: 0,
    totalOutsourced: 0,
    totalColleges: 0,
    totalDepartments: 0,
  });
  
  const [leavesData, setLeavesData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [velocityData, setVelocityData] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('DAILY');
  const [liveTime, setLiveTime] = useState(new Date());
  
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef(null);

  const periodOptions = [
    { value: 'DAILY', label: isAmharic ? 'ዕለታዊ' : 'Daily' },
    { value: 'WEEKLY', label: isAmharic ? 'ሳምንታዊ' : 'Weekly' },
    { value: 'MONTHLY', label: isAmharic ? 'ወርሃዊ' : 'Monthly' },
    { value: 'YEARLY', label: isAmharic ? 'አመታዊ' : 'Yearly' },
  ];

  // Month mapping
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target)) {
        setIsPeriodMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async (selectedPeriod) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/dashboard/overview?period=${selectedPeriod}`);
      if (res.data.success) {
        const d = res.data.data;
        setMetrics(d.metrics);

        // Process Leaves
        const baseLeaves = monthNames.map(m => ({ name: m, APPROVED: 0, PENDING: 0, REJECTED: 0 }));
        d.leaves.forEach(l => {
          const mIndex = l.monthIndex - 1;
          if(baseLeaves[mIndex]) {
            baseLeaves[mIndex][l.status] = l.count;
          }
        });
        // Filter out completely empty months or show a sliding window
        // For visual parity, show last 6 months or populated ones.
        setLeavesData(baseLeaves.filter(m => m.APPROVED > 0 || m.PENDING > 0 || m.REJECTED > 0 || m.name === 'OCT' || m.name === 'NOV' || m.name === 'DEC' || m.name === 'JAN' || m.name === 'FEB' || m.name === 'MAR'));

        // Process Attendance
        let acc = { "ON_TIME": 0, "LATE": 0, "ABSENT": 0 };
        d.attendance.forEach(a => {
           if(a.status === 'ON_TIME' || Object.keys(acc).includes(a.status)) acc[a.status] += a.count;
           if(a.status === 'PRESENT') acc["ON_TIME"] += a.count; // mapping
        });
        const attData = [
          { name: 'On-Time', value: acc["ON_TIME"] },
          { name: 'Late', value: acc["LATE"] },
          { name: 'Absent', value: acc["ABSENT"] }
        ];
        setAttendanceData(attData);

        // Process Velocity
        let velData = d.velocity.map(v => {
          const gregDate = new Date(v.year, 0, 1);
          const ethYear = gregorianToEthiopian(gregDate)?.year || (v.year - 8);
          return { 
            name: ethYear.toString(), 
            employees: v.count 
          };
        });
        
        // Ensure a baseline so chart looks good
        if(velData.length === 1) velData.unshift({name: (parseInt(velData[0].name)-1).toString(), employees: 0});
        
        setVelocityData(velData);

        setRecentAppointments(d.recentAppointments || []);
        setRecentTransfers(d.recentTransfers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysAgo = (dateStr) => {
    const d = new Date(dateStr);
    const diffTime = Math.abs(new Date() - d);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? (isAmharic ? 'ዛሬ' : 'Today') : `${diffDays} days ago`;
  };

  const totalAtt = attendanceData.reduce((sum, a) => sum + a.value, 0);
  const capacityPct = totalAtt > 0 ? Math.round(((attendanceData[0]?.value || 0) + (attendanceData[1]?.value || 0)) / totalAtt * 100) : 0;

  if (isLoading) {
    return (
      <div className="dashboard-spinner">
        <h2>{isAmharic ? 'አጠቃላይ እይታን በመጫን ላይ...' : 'Loading Overview Aggregation...'}</h2>
      </div>
    );
  }

  const formatLiveDate = (d) => {
    const eth = gregorianToEthiopian(d);
    const ethMonthNamesEn = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];
    const ethMonthNamesAm = ["መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"];
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysAm = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "አርብ", "ቅዳሜ"];

    return {
      dayStr: isAmharic ? daysAm[d.getDay()] : daysEn[d.getDay()],
      dateStr: eth ? `${isAmharic ? ethMonthNamesAm[eth.month - 1] : ethMonthNamesEn[eth.month - 1]} ${eth.day}` : '',
      yearStr: eth ? eth.year.toString() : '',
      timeStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(' AM', '').replace(' PM', ''),
      ampmStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).includes('PM') ? 'PM' : 'AM',
      secStr: d.getSeconds().toString().padStart(2, '0')
    };
  };

  const live = formatLiveDate(liveTime);

  return (
    <div className="dashboard-overview-container">
      <div className="dashboard-header-bar">
        <div>
           <h1>{isAmharic ? 'ተቋማዊ አጠቃላይ እይታ' : 'Dashboard Overview'}</h1>
           <p className="dashboard-subtitle">{isAmharic ? 'ስልታዊ የሰው ኃይል ግንዛቤዎች' : 'Strategic human capital insights for the current fiscal period.'}</p>
        </div>
        
        <div className="header-actions">
           {/* Live Clock Component */}
           <div className="live-clock-card">
              <div className="clock-date">
                 <span className="clock-day">{live.dayStr}</span>
                 <span className="clock-md">{live.dateStr}</span>
                 <span className="clock-year">{live.yearStr}</span>
              </div>
              <div className="clock-divider"></div>
              <div className="clock-time">
                 <div className="time-main">
                    {live.timeStr} <span className="time-ampm">{live.ampmStr}</span><span className="time-sec">:{live.secStr}</span>
                 </div>
                 <div className="live-pill">LIVE</div>
              </div>
           </div>

           <div className="period-filter-wrapper custom-dropdown-wrap" ref={periodMenuRef}>
              <button 
                 type="button"
                 className={`period-filter-trigger ${isPeriodMenuOpen ? 'open' : ''}`}
                 onClick={() => setIsPeriodMenuOpen(prev => !prev)}
              >
                 <CalendarDays size={16} />
                 <span>
                    {periodOptions.find(opt => opt.value === period)?.label || 'Yearly'}
                 </span>
                 <ChevronDown size={14} style={{ marginLeft: '4px', opacity: 0.6 }} />
              </button>

              {isPeriodMenuOpen && (
                 <div className="period-filter-menu">
                    {periodOptions.map((item) => (
                       <button
                          key={item.value}
                          type="button"
                          className={`period-filter-option ${period === item.value ? 'active' : ''}`}
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
        </div>
      </div>

      <div className="metrics-grid">
         {/* Total Employee */}
         <div className="metric-card">
            <div className="metric-icon-wrap">
               <div className="icon-box"><Users size={20} /></div>
            </div>
            <div className="metric-value">{metrics.totalEmployees.toLocaleString()}</div>
            <div className="metric-title">{isAmharic ? 'ጠቅላላ ሰራተኛ' : 'TOTAL EMPLOYEE'}</div>
         </div>

         {/* Total College */}
         <div className="metric-card">
            <div className="metric-icon-wrap">
               <div className="icon-box"><Building2 size={20} /></div>
            </div>
            <div className="metric-value">{metrics.totalColleges.toLocaleString()}</div>
            <div className="metric-title">{isAmharic ? 'ጠቅላላ ኮሌጅ' : 'TOTAL COLLEGE'}</div>
         </div>

         {/* Total Department */}
         <div className="metric-card">
            <div className="metric-icon-wrap">
               <div className="icon-box"><Globe size={20} /></div>
            </div>
            <div className="metric-value">{metrics.totalDepartments.toLocaleString()}</div>
            <div className="metric-title">{isAmharic ? 'ጠቅላላ ዲፓርትመንት' : 'TOTAL DEPARTMENT'}</div>
         </div>

         {/* Academic Staff */}
         <div className="metric-card">
            <div className="metric-icon-wrap">
               <div className="icon-box"><GraduationCap size={20} /></div>
            </div>
            <div className="metric-value">{metrics.totalAcademic.toLocaleString()}</div>
            <div className="metric-title">{isAmharic ? 'የአካዳሚክ ሰራተኞች' : 'ACADEMIC STAFF'}</div>
         </div>

         {/* Administrative */}
         <div className="metric-card">
            <div className="metric-icon-wrap">
               <div className="icon-box"><BriefcaseBusiness size={20} /></div>
            </div>
            <div className="metric-value">{metrics.totalAdministrative.toLocaleString()}</div>
            <div className="metric-title">{isAmharic ? 'አስተዳደራዊ' : 'ADMINISTRATIVE'}</div>
         </div>

         {/* Outsourced */}
         <div className="metric-card">
            <div className="metric-icon-wrap">
               <div className="icon-box"><Users size={20} /></div>
            </div>
            <div className="metric-value">{metrics.totalOutsourced.toLocaleString()}</div>
            <div className="metric-title">{isAmharic ? 'የውጪ ሰራተኞች' : 'OUTSOURCED'}</div>
         </div>
      </div>

      <div className="charts-grid">
         <div className="chart-card leaves-chart">
            <div className="chart-header">
               <h3>{isAmharic ? 'የፈቃድ ጥያቄዎች' : 'Leave Requests by Status'}</h3>
               <div className="chart-legend">
                  <span className="legend-item"><span className="dot approved"></span> {isAmharic ? 'የተፈቀደ' : 'APPROVED'}</span>
                  <span className="legend-item"><span className="dot pending"></span> {isAmharic ? 'በመጠባበቅ ላይ' : 'PENDING'}</span>
                  <span className="legend-item"><span className="dot rejected"></span> {isAmharic ? 'ውድቅ' : 'REJECTED'}</span>
               </div>
            </div>
            <div className="chart-body">
               <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={leavesData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                     <Tooltip cursor={{fill: '#f8faf9'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 600}} dy={10} />
                     <Bar dataKey="APPROVED" fill="#10a36c" radius={[6, 6, 0, 0]} barSize={10} />
                     <Bar dataKey="PENDING" fill="#a7f3d0" radius={[6, 6, 0, 0]} barSize={10} />
                     <Bar dataKey="REJECTED" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={10} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="chart-card attendance-chart">
            <div className="chart-header center">
               <h3>{isAmharic ? 'የዛሬ ክትትል ሁኔታ' : "Today's Attendance Status"}</h3>
            </div>
            <div className="chart-body flex-row">
               <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                     <PieChart>
                        <Pie
                           data={attendanceData}
                           cx="50%" cy="50%"
                           innerRadius={70}
                           outerRadius={90}
                           paddingAngle={3}
                           dataKey="value"
                           stroke="none"
                        >
                           {attendanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-text">
                     <span className="capacity-value">{capacityPct}%</span>
                     <span className="capacity-label">CAPACITY</span>
                  </div>
               </div>
               
               <div className="attendance-legend">
                  <div className="att-legend-item">
                     <span className="dot" style={{background: DONUT_COLORS[0], marginTop: '2px'}}></span>
                     <div className="att-stats">
                        <span className="att-val">{attendanceData[0]?.value || 0}</span>
                        <span className="att-lbl">ON-TIME</span>
                     </div>
                  </div>
                  <div className="att-legend-item">
                     <span className="dot" style={{background: DONUT_COLORS[1], marginTop: '2px'}}></span>
                     <div className="att-stats">
                        <span className="att-val">{attendanceData[1]?.value || 0}</span>
                        <span className="att-lbl">LATE</span>
                     </div>
                  </div>
                  <div className="att-legend-item">
                     <span className="dot" style={{background: DONUT_COLORS[2], marginTop: '2px'}}></span>
                     <div className="att-stats">
                        <span className="att-val">{attendanceData[2]?.value || 0}</span>
                        <span className="att-lbl">ABSENT</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Workforce Velocity */}
      <div className="chart-card velocity-card">
         <div className="chart-header split">
            <div>
               <h3>{isAmharic ? 'የሰው ኃይል እድገት' : 'Workforce Velocity'}</h3>
               <p className="velocity-subtitle">{isAmharic ? 'የእድገት አዝማሚያዎች' : 'Growth trends and retention forecasting'}</p>
            </div>
         </div>
         <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
               <AreaChart data={velocityData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                     <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10a36c" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10a36c" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 13, fontWeight: 600}} dy={10} />
                  <Area type="monotone" dataKey="employees" stroke="#0b8255" strokeWidth={4} fillOpacity={1} fill="url(#colorEmployees)" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="bottom-grid-half">
         <div className="recent-appointments-card">
            <div className="card-header-split">
               <h3>{isAmharic ? 'የቅርብ ጊዜ ቀጠሮዎች' : 'Recent Academic Appointments'}</h3>
               <button className="text-btn">VIEW ALL</button>
            </div>
            
            <div className="appointments-list">
               {recentAppointments.length === 0 ? (
                  <p className="no-data-msg">No recent appointments</p>
               ) : (
                  recentAppointments.map(app => (
                     <div className="appointment-item" key={app.id}>
                        <img src={app.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.firstName)}+${encodeURIComponent(app.lastName)}&background=0B8255&color=fff`} className="app-avatar" alt="avatar" />
                        <div className="app-details">
                           <h4>{app.firstName} {app.lastName}</h4>
                           <p>{app.title} • {app.collegeName || app.departmentName}</p>
                        </div>
                        <div className="app-meta">
                           <span className="pill-tag brand-light">ON-BOARDED</span>
                           <span className="days-ago">{formatEthiopianDate(app.createdAt)}</span>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         <div className="recent-appointments-card">
            <div className="card-header-split">
               <h3>{isAmharic ? 'የቅርብ ጊዜ ዝውውሮች' : 'Recent Transfers'}</h3>
               <button className="text-btn">VIEW ALL</button>
            </div>
            
            <div className="appointments-list">
               {recentTransfers.length === 0 ? (
                  <p className="no-data-msg">No recent transfer activity found</p>
               ) : (
                  recentTransfers.map(app => (
                     <div className="appointment-item" key={app.id}>
                        <img src={app.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.firstName)}+${encodeURIComponent(app.lastName)}&background=0B8255&color=fff`} className="app-avatar" alt="avatar" />
                        <div className="app-details">
                           <h4>{app.firstName} {app.lastName}</h4>
                           <p>Transferred • {app.departmentName}</p>
                        </div>
                        <div className="app-meta">
                           <span className="pill-tag brand-light">TRANSFERRED</span>
                           <span className="days-ago">{formatEthiopianDate(app.createdAt)}</span>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
