import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChatwootContactPanel } from '@/components/ChatwootContactPanel';
import { AiLogViewer } from '@/components/AiLogViewer';
import { Search, Phone, Paperclip, Image as ImageIcon, SendHorizonal, ThumbsUp, Settings2, CornerDownLeft, Eye, RefreshCw, FileText, X, Filter, Check, PlusCircle, Trash2, Bot, Loader2 } from 'lucide-react';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Conversation, Message, CareScript, ChatwootLabel } from '@/types/chatwoot';

// Interfaces
interface Filters {
  hasPhoneNumber: boolean | null;
  selectedLabels: string[];
  seenNotReplied: boolean;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const AI_STAR_LABEL_NAME = 'AI Star';
const AI_CARE_LABEL = 'AI chăm';

const ChatwootInbox = () => {
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
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(false);
  const [aiStarLabelId, setAiStarLabelId] = useState<number | null>(null);
  const [aiTypingStatus, setAiTypingStatus] = useState<Record<number, boolean>>({});
  const [hasNewLog, setHasNewLog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedConversationIdRef = useRef<number | null>(null);
  const POLLING_INTERVAL = 30000;
  const phoneRegex = /(0[3|5|7|8|9][0-9]{8})\b/;

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation]);

  const handleClearFilters = () => {
    setFilters({
      hasPhoneNumber: null,
      selectedLabels: [],
      seenNotReplied: false,
    });
  };

  const areFiltersActive = useMemo(() => {
    return (
      filters.hasPhoneNumber !== null ||
      filters.selectedLabels.length > 0 ||
      filters.seenNotReplied
    );
  }, [filters]);

  const labelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    suggestedLabels.forEach(label => {
        map.set(label.name, label.color);
    });
    return map;
  }, [suggestedLabels]);

  const suggestedLabelNames = useMemo(() => {
    return new Set(suggestedLabels.map(label => label.name));
  }, [suggestedLabels]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, aiTypingStatus]);

  const fetchCareScripts = async (conversationId: number) => {
    const { data, error } = await supabase.from('care_scripts').select('*').eq('conversation_id', conversationId).order('scheduled_at', { ascending: true });
    if (error) { showError("Không thể tải kịch bản chăm sóc."); } else { setScripts(data || []); }
  };

  const syncConversationsToDB = async (convos: Conversation[]) => {
    if (convos.length === 0) return;
    const contactsToUpsert = convos.map(c => ({ id: c.meta.sender.id, name: c.meta.sender.name, email: c.meta.sender.email, phone_number: c.meta.sender.phone_number, thumbnail_url: c.meta.sender.thumbnail, }));
    const conversationsToUpsert = convos.map(c => ({ id: c.id, contact_id: c.meta.sender.id, status: c.status, last_activity_at: new Date(c.last_activity_at * 1000).toISOString(), unread_count: c.unread_count, }));
    await supabase.from('chatwoot_contacts').upsert(contactsToUpsert, { onConflict: 'id' });
    await supabase.from('chatwoot_conversations').upsert(conversationsToUpsert, { onConflict: 'id' });
  };

  const syncMessagesToDB = async (msgs: Message[], convoId: number) => {
    if (msgs.length === 0) return;
    
    // Lọc để chỉ bao gồm các tin nhắn công khai thực tế (loại 0: đến, loại 1: đi và không riêng tư)
    const actualMessages = msgs.filter(m => (m.message_type === 0 || m.message_type === 1) && !m.private);

    if (actualMessages.length === 0) return;

    const messagesToUpsert = actualMessages.map(m => ({ id: m.id, conversation_id: convoId, content: m.content, message_type: m.message_type, is_private: m.private, sender_name: m.sender?.name, sender_thumbnail: m.sender?.thumbnail, created_at_chatwoot: new Date(m.created_at * 1000).toISOString(), }));
    const attachmentsToUpsert = actualMessages.flatMap(m => m.attachments?.map(a => ({ id: a.id, message_id: m.id, file_type: a.file_type, data_url: a.data_url, })) || []);
    
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
      const conversationsFromServer = chatwootData.data.payload || [];
      if (conversationsFromServer.length === 0) {
          setConversations([]);
          if (isInitialLoad) setLoadingConversations(false);
          return;
      }

      const previewFixPromises = conversationsFromServer.map(async (convo: Conversation) => {
        const lastMessage = convo.messages[0];
        if (lastMessage && lastMessage.message_type === 2) {
          const { data: lastRealMessage } = await supabase
            .from('chatwoot_messages')
            .select('content, message_type')
            .eq('conversation_id', convo.id)
            .in('message_type', [0, 1])
            .order('created_at_chatwoot', { ascending: false })
            .limit(1)
            .single();
          
          if (lastRealMessage) {
            convo.messages[0] = { ...lastMessage, content: lastRealMessage.content, message_type: lastRealMessage.message_type };
          }
        }
      });
      await Promise.all(previewFixPromises);

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
      
      setConversations(prevConversations => {
        const updatedList = enrichedConversations.map(serverConvo => {
          if (selectedConversationIdRef.current && serverConvo.id === selectedConversationIdRef.current) {
            return { ...serverConvo, unread_count: 0 };
          }
          return serverConvo;
        });
        return updatedList;
      });

      await syncConversationsToDB(enrichedConversations);
    } catch (err: any) { console.error("Lỗi polling cuộc trò chuyện:", err);
    } finally { if (isInitialLoad) setLoadingConversations(false); }
  }, [settings]);

  const fetchMessages = async (convoId: number) => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_messages', settings, conversationId: convoId }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);
      const newMessages = data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || [];
      setMessages(current => newMessages.length > current.length ? newMessages : current);
      await syncMessagesToDB(newMessages, convoId);
    } catch (err: any) { console.error("Lỗi polling tin nhắn:", err); }
  };

  useEffect(() => {
    const fetchInitialSettings = async () => {
      const { data: labelsData, error: labelsError } = await supabase.from('chatwoot_labels').select('*').order('name', { ascending: true });
      if (!labelsError && labelsData) {
        setSuggestedLabels(labelsData);
        const starLabel = labelsData.find(l => l.name === AI_STAR_LABEL_NAME);
        if (starLabel) setAiStarLabelId(starLabel.id);
      }

      const { data: autoReplyData, error: autoReplyError } = await supabase.from('auto_reply_settings').select('config').eq('id', 1).single();
      if (!autoReplyError && autoReplyData?.config && typeof autoReplyData.config === 'object') {
        setIsAutoReplyEnabled((autoReplyData.config as { enabled?: boolean }).enabled || false);
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

    return () => {
      supabase.removeChannel(typingChannel);
    };
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
    if (!selectedConversation) {
      return;
    }

    setHasNewLog(false);

    const logChannel = supabase
      .channel(`ai-logs-for-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_reply_logs',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        () => {
          setHasNewLog(true);
        }
      )
      .subscribe();
      
    fetchMessages(selectedConversation.id);
    fetchCareScripts(selectedConversation.id);
    const intervalId = setInterval(() => fetchMessages(selectedConversation.id), POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(logChannel);
    };
  }, [selectedConversation, settings]);

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
            supabase.functions.invoke('chatwoot-proxy', {
              body: { action: 'update_contact', settings, contactId, payload: { phone_number: phoneNumber } }
            }).catch((err: any) => console.error("Failed to update contact phone number:", err));
            break;
          }
        }
      }
    }
  }, [messages, selectedConversation, settings]);

  const handleSelectConversation = async (conversation: Conversation) => {
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
      supabase.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings, conversationId: conversation.id }, }).catch((err: any) => console.error("Lỗi ngầm khi đánh dấu đã đọc:", err.message));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showError("Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 10MB.");
            return;
        }
        setAttachment(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
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

            const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: formData });
            if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
            if (data.error) throw new Error(data.error);
            responseData = data;
        } else {
            const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings, conversationId: selectedConversation.id, content: newMessage.trim() } });
            if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
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
  };

  const handleToggleLabel = async (label: string) => {
    if (!selectedConversation) return;

    const currentLabels = selectedConversation.labels || [];
    const isLabelApplied = currentLabels.includes(label);
    const newLabels = isLabelApplied
      ? currentLabels.filter(l => l !== label)
      : [...currentLabels, label];

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
        const { error } = await supabase.functions.invoke('trigger-ai-care-script', {
          body: {
            conversationId: selectedConversation.id,
            contactId: selectedConversation.meta.sender.id,
          }
        });
        if (error) throw error;
        await fetchCareScripts(selectedConversation.id);
      } catch (err: any) {
        console.error(`Kích hoạt AI thất bại:`, err);
        const errorMessage = err.context ? (await err.context.json()).error : err.message;
        showError(`Kích hoạt AI thất bại: ${errorMessage}`);
      }
    }
  };

  const handleNewNote = (newNote: Message) => {
    setMessages(prev => [...prev, newNote]);
    if (selectedConversation) {
      syncMessagesToDB([newNote], selectedConversation.id);
    }
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setSelectedConversation(updatedConversation);
    setConversations(convos => 
        convos.map(c => c.id === updatedConversation.id ? updatedConversation : c)
    );
  };

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc: ({ type: 'date'; date: string } | { type: 'message'; data: Message })[], message, index) => {
      const messageDate = new Date(message.created_at * 1000);
      const prevMessage = messages[index - 1];
      const prevMessageDate = prevMessage ? new Date(prevMessage.created_at * 1000) : null;
      if (!prevMessageDate || !isSameDay(messageDate, prevMessageDate)) {
        acc.push({ type: 'date', date: format(messageDate, 'dd MMM yyyy', { locale: vi }) });
      }
      acc.push({ type: 'message', data: message });
      return acc;
    }, []);
  }, [messages]);
  
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(convo => {
        const searchMatch = convo.meta.sender.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!searchMatch) return false;

        if (filters.hasPhoneNumber === true) {
          if (!convo.meta.sender.phone_number) return false;
        } else if (filters.hasPhoneNumber === false) {
          if (convo.meta.sender.phone_number) return false;
        }

        if (filters.selectedLabels.length > 0) {
          const convoLabels = convo.labels || [];
          const hasLabel = filters.selectedLabels.some(label => convoLabels.includes(label));
          if (!hasLabel) return false;
        }

        if (filters.seenNotReplied) {
          const isSeen = !convo.unread_count || convo.unread_count === 0;
          const lastMessageIsIncoming = convo.messages[0]?.message_type !== 1;
          if (!(isSeen && lastMessageIsIncoming)) return false;
        }

        return true;
      });
  }, [conversations, searchQuery, filters]);

  const unreadConversations = filteredConversations.filter(c => c.unread_count > 0);
  const readConversations = filteredConversations.filter(c => !c.unread_count || c.unread_count === 0);
  
  const countWithPhone = useMemo(() => conversations.filter(c => !!c.meta.sender.phone_number).length, [conversations]);
  const countWithoutPhone = useMemo(() => conversations.filter(c => !c.meta.sender.phone_number).length, [conversations]);

  const renderConversationItem = (convo: Conversation) => {
    const existingLabels = convo.labels?.filter(labelName => suggestedLabelNames.has(labelName)) || [];
    const lastMessage = convo.messages?.[0];
    const lastMessageContent = (lastMessage && lastMessage.message_type !== 2) ? (lastMessage.content || '[Media]') : '';
    const isLastMessageIncoming = lastMessage?.message_type === 0;

    return (
      <div key={convo.id} onClick={() => handleSelectConversation(convo)} className={cn("p-2.5 flex space-x-3 cursor-pointer rounded-lg", selectedConversation?.id === convo.id && "bg-blue-100")}>
        <Avatar className="h-12 w-12"><AvatarImage src={convo.meta.sender.thumbnail} /><AvatarFallback>{getInitials(convo.meta.sender.name)}</AvatarFallback></Avatar>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center"><p className="font-semibold truncate text-sm">{convo.meta.sender.name}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.last_activity_at * 1000), 'HH:mm')}</p></div>
          <div className="flex justify-between items-start mt-1">
            <p className={cn(
              "text-sm truncate flex items-center",
              convo.unread_count > 0
                ? "text-black font-bold"
                : isLastMessageIncoming
                  ? "text-red-600"
                  : "text-muted-foreground"
            )}>
              {!isLastMessageIncoming && <CornerDownLeft className="h-4 w-4 mr-1 flex-shrink-0" />}
              {lastMessageContent}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {convo.meta.sender.phone_number && <Phone className="h-4 w-4 text-green-600" strokeWidth={2} />}
              {convo.unread_count > 0 && <Badge variant="destructive">{convo.unread_count}</Badge>}
            </div>
          </div>
          {existingLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {existingLabels.map(labelName => {
                const color = labelColorMap.get(labelName) || '#6B7280';
                return (
                  <Badge
                    key={labelName}
                    variant="outline"
                    className="text-xs font-normal px-2 py-0.5"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                      borderColor: color,
                    }}
                  >
                    {labelName}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white border-t">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
      <aside className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="flex-grow">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-start px-3 font-normal text-muted-foreground">
                  <Filter className="h-4 w-4 mr-2" />
                  Thêm bộ lọc...
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="border rounded-lg p-3 space-y-3 bg-slate-50/50 text-xs">
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-slate-500 uppercase tracking-wider">Số điện thoại</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="ghost" className={cn("w-full justify-center h-8 text-xs font-medium", filters.hasPhoneNumber === true ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-slate-100 hover:bg-slate-200 text-slate-700")} onClick={() => setFilters(f => ({...f, hasPhoneNumber: f.hasPhoneNumber === true ? null : true}))}>
                        Có SĐT 
                        <Badge className={cn("ml-1.5 text-xs font-bold", filters.hasPhoneNumber === true ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-700")}>
                          {countWithPhone}
                        </Badge>
                      </Button>
                      <Button size="sm" variant="ghost" className={cn("w-full justify-center h-8 text-xs font-medium", filters.hasPhoneNumber === false ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-slate-100 hover:bg-slate-200 text-slate-700")} onClick={() => setFilters(f => ({...f, hasPhoneNumber: f.hasPhoneNumber === false ? null : false}))}>
                        Không có SĐT 
                        <Badge className={cn("ml-1.5 text-xs font-bold", filters.hasPhoneNumber === false ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-700")}>
                          {countWithoutPhone}
                        </Badge>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</h4>
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-white hover:bg-slate-100 cursor-pointer" onClick={() => setFilters(f => ({...f, seenNotReplied: !f.seenNotReplied}))}>
                      <Checkbox id="seenNotReplied" checked={filters.seenNotReplied} />
                      <label htmlFor="seenNotReplied" className="flex-1 cursor-pointer text-slate-700">Đã xem, chưa trả lời</label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-slate-500 uppercase tracking-wider">Tags</h4>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between bg-white hover:bg-slate-50 h-8 font-normal">
                          <span className="text-slate-700">
                            {filters.selectedLabels.length > 0 
                                ? `${filters.selectedLabels.length} tag đã chọn` 
                                : "Chọn tags..."}
                          </span>
                          <PlusCircle className="ml-2 h-4 w-4 text-slate-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm tag..." />
                          <CommandList>
                            <CommandEmpty>Không tìm thấy tag.</CommandEmpty>
                            <CommandGroup>
                              {suggestedLabels.map((label) => {
                                const isSelected = filters.selectedLabels.includes(label.name);
                                return (
                                  <CommandItem
                                    key={label.id}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setFilters(f => ({ ...f, selectedLabels: f.selectedLabels.filter(l => l !== label.name) }));
                                      } else {
                                        setFilters(f => ({ ...f, selectedLabels: [...f.selectedLabels, label.name] }));
                                      }
                                    }}
                                  >
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                      <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <div className="flex items-center">
                                      <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: label.color }}></span>
                                      <span className="truncate">{label.name}</span>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                            {filters.selectedLabels.length > 0 && (
                              <>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem onSelect={() => setFilters(f => ({ ...f, selectedLabels: [] }))} className="justify-center text-center">Xóa bộ lọc</CommandItem>
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {filters.selectedLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {filters.selectedLabels.map(labelName => {
                          const color = labelColorMap.get(labelName) || '#6B7280';
                          return (
                            <Badge key={labelName} variant="outline" className="font-medium" style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}50` }}>
                              {labelName}
                              <button className="ml-1.5 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2" onClick={() => setFilters(f => ({ ...f, selectedLabels: f.selectedLabels.filter(l => l !== labelName) }))}>
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            {areFiltersActive && (
              <Button variant="ghost" size="icon" onClick={handleClearFilters} className="flex-shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">{loadingConversations ? ([...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)) : (<>{unreadConversations.length > 0 && (<div className="mb-4 p-2 bg-blue-50/50 rounded-lg"><h3 className="px-1 pb-1 text-xs font-bold uppercase text-blue-600 tracking-wider">Chưa xem</h3><div className="space-y-1">{unreadConversations.map(renderConversationItem)}</div></div>)}{readConversations.length > 0 && (<div className="space-y-1">{readConversations.map(renderConversationItem)}</div>)}{filteredConversations.length === 0 && !loadingConversations && (<p className="p-4 text-sm text-center text-muted-foreground">Không tìm thấy cuộc trò chuyện nào.</p>)}</>)}</div>
      </aside>
      <section className="flex-1 flex flex-col bg-slate-50">
        {selectedConversation ? (
          <>
            <header className="p-3 border-b bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3"><Avatar><AvatarImage src={selectedConversation.meta.sender.thumbnail} /><AvatarFallback>{getInitials(selectedConversation.meta.sender.name)}</AvatarFallback></Avatar><div><h3 className="font-bold">{selectedConversation.meta.sender.name}</h3><p className="text-xs text-muted-foreground flex items-center"><Eye className="h-3 w-3 mr-1" />Chưa có người xem</p></div></div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Popover onOpenChange={(open) => { if (open) setHasNewLog(false); }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8", hasNewLog && "bg-green-100 text-green-800 animate-glow-green border-green-300")}>
                      <Bot className="h-4 w-4 mr-2" />
                      Log AI
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0">
                    <AiLogViewer conversationId={selectedConversation.id} />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (selectedConversation && !loadingMessages) { handleSelectConversation(selectedConversation); } }}>
                  <RefreshCw className={cn("h-5 w-5", loadingMessages && "animate-spin")} />
                </Button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6"><div className="space-y-2">{loadingMessages ? <p>Đang tải...</p> : groupedMessages.map((item, index) => { 
              if (item.type === 'date') { 
                return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>; 
              } 
              
              const msg = item.data; 
              
              if (msg.message_type === 2) {
                return null;
              }

              if (msg.private) {
                if (msg.content?.startsWith('**Lỗi AI')) {
                  return (
                    <div key={msg.id} className="flex items-center justify-center my-2">
                      <div className="text-xs text-center text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-md">
                        <p className="font-bold">Thông báo hệ thống</p>
                        <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }

              const isOutgoing = msg.message_type === 1;
              if (msg.message_type === 0 || msg.message_type === 1) { 
                return ( 
                  <div key={msg.id} className={cn("flex items-start gap-3", isOutgoing && "justify-end")}> 
                    {!isOutgoing && <Avatar className="h-8 w-8"><AvatarImage src={msg.sender?.thumbnail} /><AvatarFallback>{getInitials(msg.sender?.name)}</AvatarFallback></Avatar>} 
                    <div className={cn("flex flex-col gap-1", isOutgoing ? 'items-end' : 'items-start')}> 
                      <div className={cn("rounded-2xl px-3 py-2 max-w-sm md:max-w-md break-words shadow-sm", isOutgoing ? 'bg-green-100 text-gray-800' : 'bg-white text-gray-800')}> 
                        {msg.attachments?.map(att => <div key={att.id}>{att.file_type === 'image' ? <a href={att.data_url} target="_blank" rel="noopener noreferrer"><img src={att.data_url} alt="Attachment" className="rounded-lg max-w-full h-auto" /></a> : <video controls className="rounded-lg max-w-full h-auto"><source src={att.data_url} /></video>}</div>)} 
                        {msg.content && <p className={cn("whitespace-pre-wrap", msg.attachments && msg.attachments.length > 0 && msg.content ? "mt-2" : "")}>{msg.content}</p>} 
                      </div> 
                    </div> 
                  </div> 
                ); 
              } 
              
              return null; 
            })}
            {selectedConversation && aiTypingStatus[selectedConversation.id] && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-5 w-5 text-blue-600" /></AvatarFallback></Avatar>
                <div className="flex flex-col gap-1 items-start">
                  <div className="rounded-2xl px-3 py-2 max-w-sm md:max-w-md break-words shadow-sm bg-white text-gray-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-0"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-400"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div><div ref={messagesEndRef} /></div>
            <footer className="p-2 border-t bg-white space-y-2">
              {selectedConversation && aiTypingStatus[selectedConversation.id] && (
                <div className="px-3 py-2 bg-blue-50 rounded-lg flex items-center justify-center gap-2 text-sm text-blue-700 font-medium animate-in fade-in">
                  <Bot className="h-4 w-4 animate-pulse" />
                  <span>AI đang phân tích và trả lời...</span>
                </div>
              )}
              {attachment && (
                <div className="px-2 py-1.5 bg-slate-100 rounded-lg flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2 text-sm overflow-hidden">
                    <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700 truncate">{attachment.name}</span>
                    <span className="text-slate-500 flex-shrink-0">({(attachment.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setAttachment(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2 px-2">
                {suggestedLabels.map(label => {
                  const isApplied = selectedConversation?.labels.includes(label.name);
                  return (
                    <Button
                      key={label.id}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-xs h-7 transition-all",
                        isApplied ? "text-white" : "text-foreground"
                      )}
                      style={{
                        backgroundColor: isApplied ? label.color : `${label.color}20`,
                        borderColor: isApplied ? label.color : `${label.color}50`,
                        color: isApplied ? 'white' : label.color,
                      }}
                      onClick={() => handleToggleLabel(label.name)}
                    >
                      {isApplied && <Check className="h-3 w-3 mr-1.5" />}
                      {label.name}
                    </Button>
                  )
                })}
              </div>
              <form onSubmit={handleSendMessage} className="relative">
                <Input 
                  placeholder="Trả lời..." 
                  className="pr-12" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  disabled={sendingMessage}
                />
                <Button type="submit" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-9" disabled={sendingMessage}>
                  {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
                </Button>
              </form>
              <div className="flex justify-between items-center px-2"><div className="flex items-center space-x-4 text-muted-foreground"><Paperclip className="h-5 w-5 cursor-pointer hover:text-primary" onClick={() => fileInputRef.current?.click()} /><ImageIcon className="h-5 w-5 cursor-pointer hover:text-primary" onClick={() => fileInputRef.current?.click()} /></div><div className="flex items-center space-x-4 text-muted-foreground"><ThumbsUp className="h-5 w-5 cursor-pointer hover:text-primary" /><Settings2 className="h-5 w-5 cursor-pointer hover:text-primary" /></div></div>
            </footer>
          </>
        ) : (<div className="flex-1 flex items-center justify-center text-center text-muted-foreground"><p>Vui lòng chọn một cuộc trò chuyện để xem tin nhắn.</p></div>)}
      </section>
      <ChatwootContactPanel 
        selectedConversation={selectedConversation} 
        messages={messages} 
        onNewNote={handleNewNote} 
        scripts={scripts} 
        fetchCareScripts={fetchCareScripts}
        onConversationUpdate={handleConversationUpdate}
      />
    </div>
  );
};

export default ChatwootInbox;