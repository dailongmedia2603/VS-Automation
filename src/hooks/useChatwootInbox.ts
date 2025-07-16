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

  const fetchConversations = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoadingConversations(true);
    try {
      const { data: convosData, error: convosError } = await supabase
        .from('chatwoot_conversations')
        .select('*, sender:chatwoot_contacts(*)')
        .order('last_activity_at', { ascending: false });

      if (convosError) throw convosError;
      if (!convosData) {
        setConversations([]);
        if (isInitialLoad) setLoadingConversations(false);
        return;
      }

      const conversationIds = convosData.map(c => c.id);
      if (conversationIds.length === 0) {
        setConversations([]);
        if (isInitialLoad) setLoadingConversations(false);
        return;
      }

      const [labelsRes, latestMessagesRes] = await Promise.all([
        supabase.from('chatwoot_conversation_labels').select('conversation_id, label:chatwoot_labels(name)').in('conversation_id', conversationIds),
        supabase.rpc('get_latest_messages', { convo_ids: conversationIds })
      ]);

      if (labelsRes.error) throw labelsRes.error;
      if (latestMessagesRes.error) throw latestMessagesRes.error;

      const labelsMap = new Map<number, string[]>();
      labelsRes.data?.forEach(item => {
        // The type of item.label from the Supabase query is inferred as an array.
        if (item.label && Array.isArray(item.label) && item.label.length > 0 && item.label[0].name) {
          const currentLabels = labelsMap.get(item.conversation_id) || [];
          labelsMap.set(item.conversation_id, [...currentLabels, item.label[0].name]);
        }
      });

      const messageMap = new Map<number, any>();
      latestMessagesRes.data?.forEach(msg => messageMap.set(msg.conversation_id, msg));

      const enrichedConversations = convosData.map(convo => ({
        ...convo,
        meta: { sender: { ...convo.sender, thumbnail: convo.sender.thumbnail_url } },
        labels: labelsMap.get(convo.id) || [],
        messages: messageMap.has(convo.id) ? [{
          id: 0,
          content: messageMap.get(convo.id).content,
          created_at: new Date(messageMap.get(convo.id).created_at_chatwoot).getTime() / 1000,
          message_type: messageMap.get(convo.id).message_type,
          private: false,
        }] : [],
      }));

      setConversations(enrichedConversations as Conversation[]);
    } catch (err: any) {
      console.error("Error fetching conversations from Supabase:", err);
      showError("Không thể tải cuộc trò chuyện: " + err.message);
    } finally {
      if (isInitialLoad) setLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convoId: number) => {
    try {
      const { data, error } = await supabase
        .from('chatwoot_messages')
        .select('*, attachments:chatwoot_attachments(*)')
        .eq('conversation_id', convoId)
        .order('created_at_chatwoot', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        ...msg,
        created_at: new Date(msg.created_at_chatwoot).getTime() / 1000,
        sender: {
          id: 0,
          name: msg.sender_name,
          thumbnail: msg.sender_thumbnail,
        }
      }));
      setMessages(formattedMessages as Message[]);
    } catch (err: any) {
      console.error("Error fetching messages from Supabase:", err);
      showError("Không thể tải tin nhắn: " + err.message);
    }
  }, []);

  useEffect(() => {
    fetchConversations(true);
    supabase.from('chatwoot_labels').select('*').order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setSuggestedLabels(data);
      });
  }, [fetchConversations]);

  useEffect(() => {
    const conversationsChannel = supabase.channel('public:chatwoot_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatwoot_conversations' }, () => fetchConversations())
      .subscribe();

    const messagesChannel = supabase.channel('public:chatwoot_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chatwoot_messages' }, async (payload) => {
        const newMessage = payload.new as any;
        if (newMessage.conversation_id === selectedConversation?.id) {
          const { data: fullMessage, error } = await supabase.from('chatwoot_messages').select('*, attachments:chatwoot_attachments(*)').eq('id', newMessage.id).single();
          if (error) return;
          const formattedMessage = {
            ...fullMessage,
            created_at: new Date(fullMessage.created_at_chatwoot).getTime() / 1000,
            sender: { id: 0, name: fullMessage.sender_name, thumbnail: fullMessage.sender_thumbnail }
          };
          setMessages(current => [...current, formattedMessage as Message]);
        }
        fetchConversations();
      }).subscribe();

    const labelsChannel = supabase.channel('public:chatwoot_conversation_labels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatwoot_conversation_labels' }, () => fetchConversations())
      .subscribe();
    
    const typingChannel = supabase.channel('ai-typing-status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_typing_status' }, (payload) => {
        const record = payload.new as { conversation_id: number; is_typing: boolean };
        setAiTypingStatus(prev => ({ ...prev, [record.conversation_id]: record.is_typing }));
      }).subscribe();

    const logChannel = supabase.channel('ai-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_reply_logs' }, (payload) => {
        if ((payload.new as any).conversation_id === selectedConversation?.id) {
          setHasNewLog(true);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(labelsChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(logChannel);
    };
  }, [selectedConversation, fetchConversations]);

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
    setHasNewLog(false);
    await fetchMessages(conversation.id);
    await fetchCareScripts(conversation.id);
    setLoadingMessages(false);

    if (conversation.unread_count > 0) {
      setConversations(convos => convos.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c));
      supabase.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings, conversationId: conversation.id } })
        .catch((err: any) => console.error("Lỗi ngầm khi đánh dấu đã đọc:", err.message));
    }
  }, [settings, fetchMessages, fetchCareScripts]);

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
    conversations, loadingConversations, selectedConversation, messages, loadingMessages,
    newMessage, attachment, sendingMessage, searchQuery, suggestedLabels, scripts,
    isFilterOpen, filters, aiTypingStatus, hasNewLog,
    setNewMessage, setAttachment, setSearchQuery, setIsFilterOpen, setFilters, setHasNewLog,
    handleSelectConversation, handleSendMessage, handleToggleLabel, handleNewNote, handleConversationUpdate,
    fetchCareScripts,
    messagesEndRef, fileInputRef,
    filteredConversations,
  };
};