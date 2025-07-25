import React, { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { SoundPermissionBanner } from '@/components/SoundPermissionBanner';
import { useChatwoot } from './ChatwootContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '@/types/chatwoot';
import type { ZaloConversation } from '@/types/zalo';

interface NotificationContextType {
  stopRepeatingSound: (conversationId: string | number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { playNotificationSound, stopRepeatingSound, isAllowedToPlay, grantPermission } = useNotificationSound('/sounds/notificationnew.mp3');
  const { settings: chatwootSettings } = useChatwoot();
  const { user } = useAuth();

  const prevChatwootConversationsRef = useRef<Map<number, Conversation>>(new Map());
  const prevZaloConversationsRef = useRef<Map<string, ZaloConversation>>(new Map());

  const POLLING_INTERVAL = 15000; // Check every 15 seconds

  // Polling for Chatwoot
  const pollChatwoot = useCallback(async () => {
    if (!chatwootSettings.accountId || !chatwootSettings.apiToken) return;

    try {
      const { data: chatwootData } = await supabase.functions.invoke('chatwoot-proxy', {
        body: { action: 'list_conversations', settings: chatwootSettings },
      });
      const conversationsFromServer: Conversation[] = chatwootData?.data?.payload || [];
      
      const prevConversations = prevChatwootConversationsRef.current;
      const newConversationsMap = new Map(conversationsFromServer.map(c => [c.id, c]));

      conversationsFromServer.forEach(newConvo => {
        const oldConvo = prevConversations.get(newConvo.id);
        if (newConvo.unread_count > (oldConvo?.unread_count || 0)) {
          playNotificationSound(newConvo.id);
        }
      });

      prevChatwootConversationsRef.current = newConversationsMap;
    } catch (error) {
      console.error("Error polling Chatwoot conversations:", error);
    }
  }, [chatwootSettings, playNotificationSound]);

  // Polling for Zalo
  const pollZalo = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_zalo_conversations');
      if (error) throw error;

      const conversationsData: ZaloConversation[] = data || [];
      const { data: seenStatuses } = await supabase.from('zalo_conversation_seen_status').select('conversation_thread_id, last_seen_at').eq('user_id', user.id);
      
      const seenMap = new Map<string, number>();
      if (seenStatuses) {
        seenStatuses.forEach(status => {
          seenMap.set(status.conversation_thread_id, new Date(status.last_seen_at).getTime());
        });
      }

      const finalConversations = conversationsData.map((convo: any) => {
        const lastSeenTimestamp = seenMap.get(convo.threadId) || 0;
        const lastMessageTimestamp = new Date(convo.lastActivityAt).getTime();
        const isUnread = convo.lastMessageDirection !== 'out' && lastMessageTimestamp > lastSeenTimestamp;
        return { ...convo, unreadCount: isUnread ? 1 : 0 };
      });

      const prevConversations = prevZaloConversationsRef.current;
      const newConversationsMap = new Map(finalConversations.map(c => [c.threadId, c]));

      finalConversations.forEach(newConvo => {
        const oldConvo = prevConversations.get(newConvo.threadId);
        if (newConvo.unreadCount > (oldConvo?.unreadCount || 0)) {
          playNotificationSound(newConvo.threadId);
        }
      });

      prevZaloConversationsRef.current = newConversationsMap;
    } catch (error) {
      console.error("Error polling Zalo conversations:", error);
    }
  }, [user, playNotificationSound]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      pollChatwoot();
      pollZalo();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [pollChatwoot, pollZalo]);

  return (
    <NotificationContext.Provider value={{ stopRepeatingSound }}>
      {!isAllowedToPlay && <SoundPermissionBanner onGrantPermission={grantPermission} />}
      {children}
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