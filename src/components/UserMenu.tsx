import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Check, X, Book, ChefHat, CheckCheck, Bell, Settings, Trash2, UserCircle, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useCookbooks } from '../context/CookbookContext';
import { useToast } from '../context/ToastContext';
import type { Notification } from '../client/types';
import { UserAvatar } from './UserAvatar';

type PendingFriendRequestAction = {
  friendRequestId: string;
  action: 'accept' | 'decline';
} | null;

export function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    acceptInvite,
    declineInvite,
    acceptFriendRequest,
    declineFriendRequest,
  } = useNotifications();
  const { refreshCookbooks } = useCookbooks();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFriendRequestAction, setPendingFriendRequestAction] = useState<PendingFriendRequestAction>(null);
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
      navigate(`/cookbooks/${result.cookbookId}`);
    }
  };

  const handleDecline = async (inviteId: string) => {
    await declineInvite(inviteId);
  };

  const handleAcceptFriendRequest = async (friendRequestId: string) => {
    setPendingFriendRequestAction({ friendRequestId, action: 'accept' });
    const result = await acceptFriendRequest(friendRequestId);
    setPendingFriendRequestAction(null);
    if (result) {
      showToast({ message: `Friend request accepted from ${result.friendName}`, type: 'success' });
    } else {
      showToast({ message: 'Could not accept friend request', type: 'error' });
    }
  };

  const handleDeclineFriendRequest = async (friendRequestId: string) => {
    setPendingFriendRequestAction({ friendRequestId, action: 'decline' });
    const success = await declineFriendRequest(friendRequestId);
    setPendingFriendRequestAction(null);
    showToast({
      message: success ? 'Friend request declined' : 'Could not decline friend request',
      type: success ? 'success' : 'error',
    });
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
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" className="user-avatar" />
        <span className="user-name">{user.name}</span>
        {unreadCount > 0 && <span className="user-notification-dot" />}
      </button>

      {isOpen && (
        <div className="user-menu-panel">
          <div className="user-menu-header">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" className="user-menu-avatar" />
            <div className="user-menu-info">
              <span className="user-menu-name">{user.name}</span>
              <span className="user-menu-email">{user.email}</span>
            </div>
          </div>

          <div className="user-menu-divider" />

          <Link to={`/profiles/${user.id}`} className="user-menu-item" onClick={() => setIsOpen(false)}>
            <UserCircle size={16} strokeWidth={2} />
            Profile
          </Link>

          <Link to="/settings" className="user-menu-item" onClick={() => setIsOpen(false)}>
            <Settings size={16} strokeWidth={2} />
            Settings
          </Link>

          <div className="user-menu-divider" />

          <div className="user-menu-notifications">
            <div className="user-menu-notifications-header">
              <h4>Notifications</h4>
              <div className="notification-header-actions">
                {unreadCount > 0 && (
                  <button className="mark-all-read" onClick={markAllAsRead}>
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="clear-all-notifications" onClick={clearAll}>
                    <Trash2 size={14} />
                    Clear all
                  </button>
                )}
              </div>
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
                      ) : notification.type === 'friend_request' ? (
                        <UserPlus size={16} />
                      ) : notification.type === 'friend_request_accepted' ? (
                        <Check size={16} />
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

                      {notification.type === 'friend_request' && notification.data?.friendRequestId && (
                        <div className="notification-actions">
                          <button
                            className="btn-accept"
                            disabled={pendingFriendRequestAction?.friendRequestId === notification.data.friendRequestId}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFriendRequest(notification.data!.friendRequestId!);
                            }}
                          >
                            {pendingFriendRequestAction?.friendRequestId === notification.data.friendRequestId &&
                            pendingFriendRequestAction.action === 'accept' ? (
                              <Loader2 size={12} className="spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            Accept
                          </button>
                          <button
                            className="btn-decline"
                            disabled={pendingFriendRequestAction?.friendRequestId === notification.data.friendRequestId}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineFriendRequest(notification.data!.friendRequestId!);
                            }}
                          >
                            {pendingFriendRequestAction?.friendRequestId === notification.data.friendRequestId &&
                            pendingFriendRequestAction.action === 'decline' ? (
                              <Loader2 size={12} className="spin" />
                            ) : (
                              <X size={12} />
                            )}
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
