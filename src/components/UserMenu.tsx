import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Check, X, Book, ChefHat, CheckCheck, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useCookbooks } from '../context/CookbookContext';
import type { Notification } from '../client/types';

export function UserMenu() {
  const { user, logout } = useAuth();
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
      refreshCookbooks();
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

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  if (!user) return null;

  return (
    <div className="user-menu" ref={dropdownRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <div className="user-avatar">
          <User size={16} strokeWidth={2} />
        </div>
        <span className="user-name">{user.name}</span>
        {unreadCount > 0 && <span className="user-notification-dot" />}
      </button>

      {isOpen && (
        <div className="user-menu-panel">
          <div className="user-menu-header">
            <div className="user-menu-avatar">
              <User size={20} strokeWidth={2} />
            </div>
            <div className="user-menu-info">
              <span className="user-menu-name">{user.name}</span>
              <span className="user-menu-email">{user.email}</span>
            </div>
          </div>

          <div className="user-menu-divider" />

          <div className="user-menu-notifications">
            <div className="user-menu-notifications-header">
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <button className="mark-all-read" onClick={markAllAsRead}>
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="user-menu-notifications-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <Bell size={20} strokeWidth={1.5} />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 5).map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      {notification.type === 'cookbook_invite' ? (
                        <Book size={16} />
                      ) : (
                        <ChefHat size={16} />
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
                            <Check size={12} />
                            Accept
                          </button>
                          <button
                            className="btn-decline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDecline(notification.data!.inviteId!);
                            }}
                          >
                            <X size={12} />
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

          <div className="user-menu-divider" />

          <button className="user-menu-logout" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
