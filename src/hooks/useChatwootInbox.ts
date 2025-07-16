import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { Conversation, Message, CareScript, ChatwootLabel } from '@/types/chatwoot';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

interface Filters {
  hasPhoneNumber: boolean | null;
  selectedLabels: string[];
  seenNotReplied: boolean;
}

interface LatestMessage {
  conversation_id: number;
  content: string;
  message_type: number;
  created_at_chatwoot: string;
}

const POLLING_INTERVAL = 15000;
const phoneRegex = /(0[3|5|7|8|9][0-9]{8})\b/;
const AI_CARE_LABEL = 'AI chăm';

export const useChatwootInbox = () => {
  const { settings } = useChatwoot();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedLabels, setSuggestedLabels] = useState<ChatwootLabel[]>([]);
  const [scripts, setScripts] = useState<CareScript[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    hasPhoneNumber: null,
    selectedLabels: [],
    seenNotReplied: false,
  });
  const [aiTypingStatus, setAiTypingStatus] = useState<Record<number, boolean>>({});
  const [hasNewLog, setHasNewLog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCareScripts = useCallback(async (conversationId: number) => {
    const { data, error } = await supabase.from('care_scripts').select('*').eq('conversation_id', conversationId).order('scheduled_at', { ascending: true });
    if (error) { showError("Không thể tải kịch bản chăm sóc."); } else { setScripts(data || []); }
  }, []);

  const syncConversationsToDB = async (convos: Conversation[]) => {
    if (convos.length === 0) return;
    const contactsToUpsert = convos.map(c => ({ id: c.meta.sender.id, name: c.meta.sender.name, email: c.meta.sender.email, phone_number: c.meta.sender.phone_number, thumbnail_url: c.meta.sender.thumbnail, }));
    const conversationsToUpsert = convos.map(c => ({ id: c.id, contact_id: c.meta.sender.id, status: c.status, last_activity_at: new Date(c.last_activity_at * 1000).toISOString(), unread_count: c.unread_count, }));
    await supabase.from('chatwoot_contacts').upsert(contactsToUpsert, { onConflict: 'id' });
    await supabase.from('chatwoot_conversations').upsert(conversationsToUpsert, { onConflict: 'id' });
  };

  const syncMessagesToDB = async (msgs: Message[], convoId: number) => {
    if (msgs.length === 0) return;
    const messagesToUpsert = msgs.map(m => ({ id: m.id, conversation_id: convoId, content: m.content, message_type: m.message_type, is_private: m.private, sender_name: m.sender?.name, sender_thumbnail: m.sender?.thumbnail, created_at_chatwoot: new Date(m.created_at * 1000).toISOString(), }));
    const attachmentsToUpsert = msgs.flatMap(m => m.attachments?.map(a => ({ id: a.id, message_id: m.id, file_type: a.file_type, data_url: a.data_url, })) || []);
    await supabase.from('chatwoot_messages').upsert(messagesToUpsert, { onConflict: 'id' });
    if (attachmentsToUpsert.length > 0) {
      await supabase.from('chatwoot_attachments').upsert(attachmentsToUpsert, { onConflict: 'id' });
    }
  };

  const fetchConversations = useCallback(async (isInitialLoad = false) => {
    if (!settings.accountId || !settings.apiToken) {
      if (isInitialLoad) setLoadingConversations(false);
      return;
    }
    if (isInitialLoad) setLoadingConversations(true);
    try {
      const { data: chatwootData, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_conversations', settings }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (chatwootData.error) throw new Error(chatwootData.error);
      let conversationsFromServer = chatwootData.data.payload || [];
      if (conversationsFromServer.length === 0) {
          setConversations([]);
          if (isInitialLoad) setLoadingConversations(false);
          return;
      }

      const conversationIds = conversationsFromServer.map((c: Conversation) => c.id);
      
      const { data: dbData, error: dbError } = await supabase
        .from('chatwoot_conversations')
        .select('id, unread_count')
        .in('id', conversationIds);

      const { data: latestMessages, error: rpcError } = await supabase.rpc('get_latest_messages', { convo_ids: conversationIds });

      if (dbError) console.error("Error fetching DB unread counts:", dbError);
      if (rpcError) console.error("Error fetching latest messages from DB:", rpcError);

      const unreadMap = new Map(dbData?.map(item => [item.id, item.unread_count]));
      
      if (latestMessages) {
        const typedLatestMessages = latestMessages as LatestMessage[];
        const messageMap = new Map(typedLatestMessages.map(m => [m.conversation_id, m]));
        
        conversationsFromServer.forEach((convo: Conversation) => {
          const dbMessage = messageMap.get(convo.id);
          if (dbMessage) {
            convo.messages = [{
              id: 0,
              content: dbMessage.content,
              created_at: new Date(dbMessage.created_at_chatwoot).getTime() / 1000,
              message_type: dbMessage.message_type,
              private: false,
            }];
          }
        });
      }

      conversationsFromServer.forEach((convo: Conversation) => {
        const dbUnreadCount = unreadMap.get(convo.id);
        if (dbUnreadCount !== undefined) {
          convo.unread_count = dbUnreadCount;
        }
      });

      const contactIds = conversationsFromServer.map((c: Conversation) => c.meta.sender.id);
      const { data: contactsFromDB } = await supabase.from('chatwoot_contacts').select('id, phone_number').in('id', contactIds);
      const phoneMap = new Map(contactsFromDB?.map(c => [c.id, c.phone_number]));
      const enrichedConversations = conversationsFromServer.map((convo: Conversation) => {
          const storedPhoneNumber = phoneMap.get(convo.meta.sender.id);
          if (storedPhoneNumber && !convo.meta.sender.phone_number) {
              return { ...convo, meta: { ...convo.meta, sender: { ...convo.meta.sender, phone_number: storedPhoneNumber } } };
          }
          return convo;
      });
      setConversations(enrichedConversations);
      await syncConversationsToDB(enrichedConversations);
    } catch (err: any) { console.error("Lỗi polling cuộc trò chuyện:", err);
    } finally { if (isInitialLoad) setLoadingConversations(false); }
  }, [settings]);

  const fetchMessages = useCallback(async (convoId: number) => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_messages', settings, conversationId: convoId }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);
      const newMessages = data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || [];
      setMessages(current => newMessages.length > current.length ? newMessages : current);
      await syncMessagesToDB(newMessages, convoId);
    } catch (err: any) { console.error("Lỗi polling tin nhắn:", err); }
  }, [settings]);

  useEffect(() => {
    const fetchInitialSettings = async () => {
      const { data: labelsData, error: labelsError } = await supabase.from('chatwoot_labels').select('*').order('name', { ascending: true });
      if (!labelsError && labelsData) {
        setSuggestedLabels(labelsData);
      }
    };
    fetchInitialSettings();
  }, []);

  useEffect(() => {
    const typingChannel = supabase.channel('ai-typing-status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_typing_status' },
        (payload) => {
          const record = payload.new as { conversation_id: number; is_typing: boolean };
          setAiTypingStatus(prev => ({ ...prev, [record.conversation_id]: record.is_typing }));
        }
      ).subscribe();
    return () => { supabase.removeChannel(typingChannel); };
  }, []);

  useEffect(() => {
    if (!settings.apiToken || !settings.accountId) {
      setLoadingConversations(false);
      return;
    }
    fetchConversations(true);
    const intervalId = setInterval(() => fetchConversations(false), POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [settings.apiToken, settings.accountId, fetchConversations]);

  useEffect(() => {
    if (!selectedConversation) return;
    setHasNewLog(false);
    const logChannel = supabase
      .channel(`ai-logs-for-${selectedConversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_reply_logs', filter: `conversation_id=eq.${selectedConversation.id}` }, () => { setHasNewLog(true); })
      .subscribe();
    fetchMessages(selectedConversation.id);
    fetchCareScripts(selectedConversation.id);
    const intervalId = setInterval(() => fetchMessages(selectedConversation.id), POLLING_INTERVAL);
    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(logChannel);
    };
  }, [selectedConversation, settings, fetchMessages, fetchCareScripts]);

  useEffect(() => {
    if (messages.length > 0 && selectedConversation && !selectedConversation.meta.sender.phone_number) {
      for (const msg of messages) {
        if (msg.content) {
          const match = msg.content.match(phoneRegex);
          if (match && match[0]) {
            const phoneNumber = match[0];
            const contactId = selectedConversation.meta.sender.id;
            const updatedSender = { ...selectedConversation.meta.sender, phone_number: phoneNumber };
            const updatedConvo = { ...selectedConversation, meta: { ...selectedConversation.meta, sender: updatedSender } };
            setSelectedConversation(updatedConvo);
            setConversations(convos => convos.map(c => c.id === updatedConvo.id ? updatedConvo : c));
            supabase.from('chatwoot_contacts').update({ phone_number: phoneNumber }).eq('id', contactId).then();
            supabase.functions.invoke('chatwoot-proxy', { body: { action: 'update_contact', settings, contactId, payload: { phone_number: phoneNumber } } }).catch((err: any) => console.error("Failed to update contact phone number:", err));
            break;
          }
        }
      }
    }
  }, [messages, selectedConversation, settings]);

  const handleSelectConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_messages', settings, conversationId: conversation.id }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);
      const fetchedMessages = data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || [];
      setMessages(fetchedMessages);
      await syncMessagesToDB(fetchedMessages, conversation.id);
    } catch (err: any) { console.error('Đã xảy ra lỗi khi tải tin nhắn.');
    } finally { setLoadingMessages(false); }
    if (conversation.unread_count > 0) {
      setConversations(convos => convos.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c));
      supabase.from('chatwoot_conversations').update({ unread_count: 0 }).eq('id', conversation.id).then();
      supabase.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings, conversationId: conversation.id }, }).catch((err: any) => console.error("Lỗi ngầm khi đánh dấu đã đọc:", err.message));
    }
  }, [settings]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;
    setSendingMessage(true);
    const toastId = showLoading("Đang gửi tin nhắn...");
    try {
        let responseData;
        if (attachment) {
            const formData = new FormData();
            formData.append('content', newMessage.trim());
            formData.append('message_type', 'outgoing');
            formData.append('private', 'false');
            formData.append('attachments[]', attachment, attachment.name);
            formData.append('settings', JSON.stringify(settings));
            formData.append('conversationId', selectedConversation.id.toString());
            const { data, error } = await supabase.functions.invoke('chatwoot-proxy', { body: formData });
            if (error) throw new Error((await error.context.json()).error || error.message);
            if (data.error) throw new Error(data.error);
            responseData = data;
        } else {
            const { data, error } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings, conversationId: selectedConversation.id, content: newMessage.trim() } });
            if (error) throw new Error((await error.context.json()).error || error.message);
            if (data.error) throw new Error(data.error);
            responseData = data;
        }
        setMessages(prev => [...prev, responseData]);
        await syncMessagesToDB([responseData], selectedConversation.id);
        setNewMessage('');
        setAttachment(null);
        dismissToast(toastId);
        showSuccess("Đã gửi tin nhắn thành công!");
    } catch (err: any) {
        dismissToast(toastId);
        showError(`Gửi tin nhắn thất bại: ${err.message}`);
    } finally {
        setSendingMessage(false);
    }
  }, [newMessage, attachment, selectedConversation, settings]);

  const handleToggleLabel = useCallback(async (label: string) => {
    if (!selectedConversation) return;
    const currentLabels = selectedConversation.labels || [];
    const isLabelApplied = currentLabels.includes(label);
    const newLabels = isLabelApplied ? currentLabels.filter(l => l !== label) : [...currentLabels, label];
    const optimisticConversation = { ...selectedConversation, labels: newLabels };
    setSelectedConversation(optimisticConversation);
    setConversations(convos => convos.map(c => c.id === selectedConversation.id ? optimisticConversation : c));
    await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings, conversationId: selectedConversation.id, labels: newLabels } });
    const { data: labelData } = await supabase.from('chatwoot_labels').select('id').eq('name', label).single();
    if (labelData) {
      if (isLabelApplied) {
        await supabase.from('chatwoot_conversation_labels').delete().match({ conversation_id: selectedConversation.id, label_id: labelData.id });
      } else {
        await supabase.from('chatwoot_conversation_labels').upsert({ conversation_id: selectedConversation.id, label_id: labelData.id });
      }
    }
    if (label === AI_CARE_LABEL && !isLabelApplied) {
      try {
        const { error } = await supabase.functions.invoke('trigger-ai-care-script', { body: { conversationId: selectedConversation.id, contactId: selectedConversation.meta.sender.id } });
        if (error) throw error;
        await fetchCareScripts(selectedConversation.id);
      } catch (err: any) {
        const errorMessage = err.context ? (await err.context.json()).error : err.message;
        showError(`Kích hoạt AI thất bại: ${errorMessage}`);
      }
    }
  }, [selectedConversation, settings, fetchCareScripts]);

  const handleNewNote = (newNote: Message) => {
    setMessages(prev => [...prev, newNote]);
    if (selectedConversation) {
      syncMessagesToDB([newNote], selectedConversation.id);
    }
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setSelectedConversation(updatedConversation);
    setConversations(convos => convos.map(c => c.id === updatedConversation.id ? updatedConversation : c));
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => {
      const searchMatch = convo.meta.sender.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;
      if (filters.hasPhoneNumber === true && !convo.meta.sender.phone_number) return false;
      if (filters.hasPhoneNumber === false && convo.meta.sender.phone_number) return false;
      if (filters.selectedLabels.length > 0 && !filters.selectedLabels.some(label => (convo.labels || []).includes(label))) return false;
      if (filters.seenNotReplied) {
        const isSeen = !convo.unread_count || convo.unread_count === 0;
        const lastMessageIsIncoming = convo.messages[0]?.message_type !== 1;
        if (!(isSeen && lastMessageIsIncoming)) return false;
      }
      return true;
    });
  }, [conversations, searchQuery, filters]);

  return {
    // State
    conversations, loadingConversations, selectedConversation, messages, loadingMessages,
    newMessage, attachment, sendingMessage, searchQuery, suggestedLabels, scripts,
    isFilterOpen, filters, aiTypingStatus, hasNewLog,
    // Setters
    setNewMessage, setAttachment, setSearchQuery, setIsFilterOpen, setFilters, setHasNewLog,
    // Handlers
    handleSelectConversation, handleSendMessage, handleToggleLabel, handleNewNote, handleConversationUpdate,
    fetchCareScripts,
    // Refs
    messagesEndRef, fileInputRef,
    // Derived State
    filteredConversations,
  };
};