import React, { useState, useEffect } from 'react';
import { Bell, Calendar, FileText } from 'lucide-react';
import api from '../../services/api';
import './NoticeCards.css';

const NoticeCards = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicNotices = async () => {
      try {
        const response = await api.get('/notices/public');
        if (response.data?.success) {
          setNotices(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching public notices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicNotices();
  }, []);

  const getIcon = (type) => {
    if (type === 'EVENT') return <Calendar size={24} color="var(--primary-color)" />;
    if (type === 'POLICY') return <FileText size={24} color="var(--primary-color)" />;
    return <Bell size={24} color="var(--primary-color)" />;
  };

  return (
    <section className="notices-section">
      <div className="container">
        <div className="notices-header">
          <h2>Recent Updates & Notices</h2>
          <button className="btn-view-all">View All</button>
        </div>
        
        <div className="notices-grid">
          {loading ? (
            <p>Loading notices...</p>
          ) : notices.length > 0 ? (
            notices.map((notice) => (
              <div key={notice.id} className="notice-card">
                <div className="card-top">
                  <div className="card-icon">{getIcon(notice.noticeType)}</div>
                  <span className="card-date">{new Date(notice.publishDate).toLocaleDateString()}</span>
                </div>
                <h4 className="card-title">{notice.title}</h4>
                <p className="card-desc" style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>{notice.content}</p>
              </div>
            ))
          ) : (
            <p>No recent notices found.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default NoticeCards;
