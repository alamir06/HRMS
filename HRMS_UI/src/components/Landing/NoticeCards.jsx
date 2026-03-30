import React from 'react';
import { Bell, Calendar, FileText } from 'lucide-react';
import './NoticeCards.css';

const NoticeCards = () => {
  const notices = [
    {
      id: 1,
      type: "notice",
      icon: <Bell size={24} color="var(--primary-color)" />,
      date: "Oct 12, 2026",
      title: "New Employee Onboarding Session",
      desc: "All new staff from September must attend the orientation."
    },
    {
      id: 2,
      type: "event",
      icon: <Calendar size={24} color="var(--primary-color)" />,
      date: "Nov 01, 2026",
      title: "Annual Benefit Enrollment",
      desc: "Open enrollment for medical and dental starts next month."
    },
    {
      id: 3,
      type: "policy",
      icon: <FileText size={24} color="var(--primary-color)" />,
      date: "Sep 25, 2026",
      title: "Updated Leave Policy",
      desc: "Please review the updated guidelines for annual leave requests."
    }
  ];

  return (
    <section className="notices-section">
      <div className="container">
        <div className="notices-header">
          <h2>Recent Updates & Notices</h2>
          <button className="btn-view-all">View All</button>
        </div>
        
        <div className="notices-grid">
          {notices.map((notice) => (
            <div key={notice.id} className="notice-card">
              <div className="card-top">
                <div className="card-icon">{notice.icon}</div>
                <span className="card-date">{notice.date}</span>
              </div>
              <h4 className="card-title">{notice.title}</h4>
              <p className="card-desc">{notice.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NoticeCards;
