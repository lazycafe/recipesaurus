import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Book, ChefHat, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useCookbooks } from '../context/CookbookContext';
import type { Notification } from '../client/types';

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, acceptInvite, declineInvite } = useNotifications();
  const { refreshCookbooks } = useCookbooks();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccept = async (inviteId: string) => {
    const result = await acceptInvite(inviteId);
    if (result) {
      await refreshCookbooks();
      setIsOpen(false);
      navigate('/cookbooks');
    }
  };

  const handleDecline = async (inviteId: string) => {
    await declineInvite(inviteId);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button
        className="notification-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={24} strokeWidth={1.5} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {notification.type === 'cookbook_invite' ? (
                      <Book size={18} />
                    ) : (
                      <ChefHat size={18} />
                    )}
                  </div>

                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatTime(notification.createdAt)}</span>

                    {notification.type === 'cookbook_invite' && notification.data?.inviteId && (
                      <div className="notification-actions">
                        <button
                          className="btn-accept"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(notification.data!.inviteId!);
                          }}
                        >
                          <Check size={14} />
                          Accept
                        </button>
                        <button
                          className="btn-decline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecline(notification.data!.inviteId!);
                          }}
                        >
                          <X size={14} />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {!notification.isRead && <div className="notification-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
