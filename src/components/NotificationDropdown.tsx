import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Book, ChefHat, CheckCheck, Loader2, UserPlus } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useCookbooks } from '../context/CookbookContext';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import type { Notification } from '../client/types';

type PendingFriendRequestAction = {
  friendRequestId: string;
  action: 'accept' | 'decline';
} | null;

type PendingRecipeShareAction = {
  shareToken: string;
  action: 'accept' | 'decline';
} | null;

export function NotificationDropdown() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    acceptInvite,
    declineInvite,
    acceptRecipeShare,
    declineRecipeShare,
    acceptFriendRequest,
    declineFriendRequest,
  } = useNotifications();
  const { refreshCookbooks } = useCookbooks();
  const { refreshRecipes } = useRecipes();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFriendRequestAction, setPendingFriendRequestAction] = useState<PendingFriendRequestAction>(null);
  const [pendingRecipeShareAction, setPendingRecipeShareAction] = useState<PendingRecipeShareAction>(null);
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

  const handleAcceptRecipeShare = async (shareToken: string) => {
    setPendingRecipeShareAction({ shareToken, action: 'accept' });
    const result = await acceptRecipeShare(shareToken);
    setPendingRecipeShareAction(null);
    if (result) {
      await refreshRecipes();
      showToast({ message: `"${result.recipeTitle}" added to My Recipes`, type: 'success' });
    } else {
      showToast({ message: 'Could not accept recipe share', type: 'error' });
    }
  };

  const handleDeclineRecipeShare = async (shareToken: string) => {
    setPendingRecipeShareAction({ shareToken, action: 'decline' });
    const success = await declineRecipeShare(shareToken);
    setPendingRecipeShareAction(null);
    showToast({
      message: success ? 'Recipe share declined' : 'Could not decline recipe share',
      type: success ? 'success' : 'error',
    });
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
    if (notification.type === 'recipe_share' && notification.data?.shareToken) {
      setIsOpen(false);
      window.open(
        `${window.location.origin}/shared-recipe/${encodeURIComponent(notification.data.shareToken)}`,
        '_blank',
        'noopener,noreferrer'
      );
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
                    ) : notification.type === 'friend_request' ? (
                      <UserPlus size={18} />
                    ) : notification.type === 'friend_request_accepted' ? (
                      <Check size={18} />
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

                    {notification.type === 'recipe_share' && notification.data?.shareToken && (
                      <div className="notification-actions">
                        <button
                          className="btn-accept"
                          disabled={pendingRecipeShareAction?.shareToken === notification.data.shareToken}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptRecipeShare(notification.data!.shareToken!);
                          }}
                        >
                          {pendingRecipeShareAction?.shareToken === notification.data.shareToken &&
                          pendingRecipeShareAction.action === 'accept' ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Accept
                        </button>
                        <button
                          className="btn-decline"
                          disabled={pendingRecipeShareAction?.shareToken === notification.data.shareToken}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeclineRecipeShare(notification.data!.shareToken!);
                          }}
                        >
                          {pendingRecipeShareAction?.shareToken === notification.data.shareToken &&
                          pendingRecipeShareAction.action === 'decline' ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <X size={14} />
                          )}
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
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <Check size={14} />
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
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <X size={14} />
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
      )}
    </div>
  );
}
