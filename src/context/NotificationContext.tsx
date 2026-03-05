import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useClient } from '../client/ClientContext';
import { useAuth } from './AuthContext';
import type { Notification } from '../client/types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<{ cookbookId: string; cookbookName: string } | null>;
  declineInvite: (inviteId: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const client = useClient();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await client.notifications.list();
      if (data) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    if (user) {
      refresh();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, refresh]);

  const markAsRead = async (notificationId: string) => {
    await client.notifications.markRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await client.notifications.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const acceptInvite = async (inviteId: string) => {
    const { data, error } = await client.invites.accept(inviteId);
    if (error) {
      console.error('Failed to accept invite:', error);
      return null;
    }
    // Remove the invite notification
    setNotifications(prev =>
      prev.filter(n => !(n.type === 'cookbook_invite' && n.data?.inviteId === inviteId))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    return data ? { cookbookId: data.cookbookId, cookbookName: data.cookbookName } : null;
  };

  const declineInvite = async (inviteId: string) => {
    const { error } = await client.invites.decline(inviteId);
    if (error) {
      console.error('Failed to decline invite:', error);
      return false;
    }
    // Remove the invite notification
    setNotifications(prev =>
      prev.filter(n => !(n.type === 'cookbook_invite' && n.data?.inviteId === inviteId))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    return true;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        refresh,
        markAsRead,
        markAllAsRead,
        acceptInvite,
        declineInvite,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
