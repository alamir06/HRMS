import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Bell, AlertTriangle, Info, XCircle, X, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { notificationService } from '../../services/notificationService';
import './NotificationModule.css';

const NotificationModule = () => {
  const { i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?.id;

  const fetchNotifications = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const result = await notificationService.getUserNotifications(userId);
      if (result.success) {
        setNotifications(result.data || []);
      } else {
        toast.error('Failed to load notifications');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead(userId);
      if (result.success) {
        toast.success(i18n.language === 'am' ? 'ሁሉም እንደተነበበ ምልክት ተደርጎባቸዋል' : 'All marked as read');
        fetchNotifications();
      } else {
        toast.error('Failed to mark all as read');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    }
  };

  const handleRowClick = async (notification) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      // Mark as read in backend
      await notificationService.markAsRead(notification.id);
      // Update local state to reflect UI instantly
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const result = await notificationService.markAsRead(id);
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeNotificationModal = () => {
    setSelectedNotification(null);
  };

  // Filter notifications by search text
  const filteredNotifications = notifications.filter((n) => {
    const title = i18n.language === 'am' && n.titleAmharic ? n.titleAmharic : n.title;
    const message = i18n.language === 'am' && n.messageAmharic ? n.messageAmharic : n.message;
    const term = search.toLowerCase();
    
    return title.toLowerCase().includes(term) || message.toLowerCase().includes(term) || n.relatedModule.toLowerCase().includes(term);
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle size={16} />;
      case 'ERROR': return <XCircle size={16} />;
      case 'WARNING': return <AlertTriangle size={16} />;
      case 'INFO': 
      default: return <Info size={16} />;
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'SUCCESS': return 'badge-success';
      case 'ERROR': return 'badge-error';
      case 'WARNING': return 'badge-warning';
      case 'INFO': 
      default: return 'badge-info';
    }
  };

  return (
    <div className="notification-container">
      {/* Top Toolbar */}
      <div className="notification-top-toolbar">
        <div className="search-wrapper-emp">
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder={i18n.language === 'am' ? 'ማሳወቂያዎችን ይፈልጉ...' : 'Search notifications...'} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-add-employee" onClick={handleMarkAllAsRead}>
          <CheckCircle size={18} />
          {i18n.language === 'am' ? 'ሁሉንም አንብብ' : 'Mark All as Read'}
        </button>
      </div>

      {/* Main Table */}
      <div className="notification-table-card">
        <div className="notification-table-responsive-wrapper">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th>{i18n.language === 'am' ? 'ርዕስ' : 'Title'}</th>
                <th>{i18n.language === 'am' ? 'መልእክት' : 'Message'}</th>
                <th>{i18n.language === 'am' ? 'ዓይነት' : 'Type'}</th>
                <th>{i18n.language === 'am' ? 'ቀን' : 'Date'}</th>
                <th>{i18n.language === 'am' ? 'ድርጊት' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading notifications...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    {i18n.language === 'am' ? 'ምንም ማሳወቂያዎች የሉም' : 'No notifications found.'}
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notif) => (
                  <tr 
                    key={notif.id} 
                    className={!notif.isRead ? 'unread-row' : ''}
                    onClick={() => handleRowClick(notif)}
                  >
                    <td>
                      <div className="notification-primary-text">
                        {i18n.language === 'am' && notif.titleAmharic ? notif.titleAmharic : notif.title}
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {i18n.language === 'am' && notif.messageAmharic ? notif.messageAmharic : notif.message}
                      </div>
                    </td>
                    <td>
                      <span className={`notification-badge ${getBadgeClass(notif.notificationType)}`}>
                        {getNotificationIcon(notif.notificationType)}
                        <span style={{ marginLeft: '4px' }}>{notif.notificationType}</span>
                      </span>
                    </td>
                    <td>
                      {new Date(notif.createdAt).toLocaleDateString(i18n.language === 'am' ? 'am-ET' : 'en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {!notif.isRead ? (
                        <button 
                          onClick={() => handleMarkAsRead(notif.id)} 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#0B8255'; e.currentTarget.style.color = '#0B8255'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }}
                        >
                          <CheckCircle size={14} /> 
                          {i18n.language === 'am' ? 'እንደተነበበ' : 'Mark Read'}
                        </button>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle size={14} color="#10b981" /> 
                          {i18n.language === 'am' ? 'ተነቧል' : 'Read'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNotification && (
        <div className="modal-overlay">
          <div className="notification-modal-wrapper">
            <div className="notification-modal-header">
              <h3>{i18n.language === 'am' ? 'የማሳወቂያ ዝርዝሮች' : 'Notification Details'}</h3>
              <button className="notification-close-btn" onClick={closeNotificationModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="notification-modal-body">
              <div className="notification-detail-group">
                <span className="notification-detail-label">{i18n.language === 'am' ? 'ርዕስ' : 'Title'}</span>
                <span className="notification-primary-text" style={{ fontSize: '1.1rem' }}>
                  {i18n.language === 'am' && selectedNotification.titleAmharic 
                    ? selectedNotification.titleAmharic 
                    : selectedNotification.title}
                </span>
              </div>
              
              <div className="notification-detail-group">
                <span className="notification-detail-label">{i18n.language === 'am' ? 'ሞዱል' : 'Module'}</span>
                <span className={`notification-badge ${getBadgeClass(selectedNotification.notificationType)}`} style={{ width: 'fit-content' }}>
                  {selectedNotification.relatedModule.toUpperCase()}
                </span>
              </div>

              <div className="notification-detail-group">
                <span className="notification-detail-label">{i18n.language === 'am' ? 'መልእክት' : 'Message'}</span>
                <div className="notification-detail-value">
                  {i18n.language === 'am' && selectedNotification.messageAmharic 
                    ? selectedNotification.messageAmharic 
                    : selectedNotification.message}
                </div>
              </div>

              <div className="notification-detail-group">
                <span className="notification-detail-label">{i18n.language === 'am' ? 'የተላከበት ቀን' : 'Sent Date'}</span>
                <span style={{ color: '#334155' }}>
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button className="btn-cancel" onClick={closeNotificationModal}>
                {i18n.language === 'am' ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationModule;
