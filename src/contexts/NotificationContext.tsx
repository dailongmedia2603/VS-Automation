import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { SoundPermissionBanner } from '@/components/SoundPermissionBanner';

interface NotificationContextType {
  unreadCount: number;
  decrementUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { playNotificationSound, grantPermission, permission } = useNotificationSound('/sounds/notificationnew.mp3');
  const previousCountRef = useRef(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('seeding_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('is_notification_seen', false);
      
      if (!error && count !== null) {
        setUnreadCount(count);
        previousCountRef.current = count;
      }
    };

    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (unreadCount > previousCountRef.current) {
      playNotificationSound();
    }
    previousCountRef.current = unreadCount;
  }, [unreadCount, playNotificationSound]);

  const decrementUnreadCount = () => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const value = { unreadCount, decrementUnreadCount };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {permission === 'prompt' && <SoundPermissionBanner onGrantPermission={grantPermission} />}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};