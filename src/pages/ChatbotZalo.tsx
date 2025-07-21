import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type User } from '@supabase/supabase-js';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, SendHorizonal, RefreshCw, Loader2, Bug, CornerDownLeft, Image as ImageIcon, Paperclip, FileText, X, Check } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { ZaloDataDebugger } from '@/components/ZaloDataDebugger';
import { ZaloContactPanel } from '@/components/ZaloContactPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ZaloUser, ZaloConversation, ZaloMessageDb, ZaloMessage, ZaloLabel } from '@/types/zalo';
import { useAuth } from '@/contexts/AuthContext';

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
};

const getFileNameFromUrl = (url: string): string => {
  if (!url) return '';
  try {
    const decodedUrl = decodeURIComponent(url);
    const urlParts = decodedUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const nameParts = lastPart.split('-');
    if (nameParts.length > 1) {
      nameParts.shift();
      return nameParts.join('-');
    }
    return lastPart;
  } catch (e) {
    console.error("Failed to decode or parse URL", e);
    return 'file';
  }
};

const ChatbotZalo = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ZaloConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ZaloConversation | null>(null);
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [zaloLabels, setZaloLabels] = useState<ZaloLabel[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const defaultAvatar = 'https://s120-ava-talk.zadn.vn/a/a/c/2/1/120/90898606938dd183dbf5c748e3dae52d.jpg';
  
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [debugUsersMap, setDebugUsersMap] = useState<Map<string, ZaloUser>>(new Map());
  const POLLING_INTERVAL = 5000;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  useEffect(() => {
    if (selectedConversation && messageInputRef.current) {
      const timer = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedConversation]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase.from('zalo_labels').select('*').order('name', { ascending: true });
      if (error) {
        showError("Không thể tải danh sách thẻ Zalo: " + error.message);
      } else {
        setZaloLabels(data || []);
      }
    };
    fetchInitialData();
  }, []);

  const fetchZaloData = useCallback(async (isInitialLoad = false) => {
    if (!user) {
      if (isInitialLoad) setLoadingConversations(false);
      return;
    }
    if (isInitialLoad) setLoadingConversations(true);
    try {
      const [conversationsResponse, seenStatusesResponse] = await Promise.all([
        supabase.rpc('get_zalo_conversations'),
        supabase.from('zalo_conversation_seen_status').select('conversation_thread_id, last_seen_at').eq('user_id', user.id)
      ]);

      if (conversationsResponse.error) throw conversationsResponse.error;
      if (seenStatusesResponse.error) throw seenStatusesResponse.error;

      const conversationsData = conversationsResponse.data;
      const seenStatuses = seenStatusesResponse.data;

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
        return {
          ...convo,
          unreadCount: isUnread ? 1 : 0,
        };
      });

      setConversations(finalConversations);

    } catch (error: any) {
      console.error("Error fetching Zalo data:", error);
      if (isInitialLoad) showError("Lỗi tải dữ liệu Zalo: " + error.message);
    } finally {
      if (isInitialLoad) setLoadingConversations(false);
    }
  }, [user]);

  const fetchMessagesForSelectedConvo = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      const { data, error } = await supabase
        .from('zalo_messages')
        .select('id, message_content, created_at, message_image, direction')
        .eq('threadId', selectedConversation.threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const formattedMessages: ZaloMessage[] = data.map(msg => ({
        id: msg.id,
        content: msg.message_content,
        imageUrl: msg.message_image,
        attachmentName: msg.message_image ? getFileNameFromUrl(msg.message_image) : null,
        createdAt: msg.created_at,
        isOutgoing: msg.direction === 'out',
      }));
      
      setMessages(currentMessages => {
        const realOutgoingSignatures = new Set(
          formattedMessages
            .filter(m => m.isOutgoing)
            .map(m => `${m.content || ''}::${m.attachmentName || ''}`)
        );

        const stillPendingOptimistic = currentMessages.filter(m => {
          if (m.id <= 1000000000) return false;
          const optimisticSignature = `${m.content || ''}::${m.attachmentName || ''}`;
          return !realOutgoingSignatures.has(optimisticSignature);
        });

        const finalMessages = [...formattedMessages, ...stillPendingOptimistic];
        
        finalMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return finalMessages;
      });

    } catch (error: any) {
      console.error(`Error polling messages for ${selectedConversation.threadId}:`, error);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (user) {
      fetchZaloData(true);
      const intervalId = setInterval(() => fetchZaloData(false), POLLING_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [user, fetchZaloData]);

  useEffect(() => {
    if (selectedConversation) {
      const intervalId = setInterval(fetchMessagesForSelectedConvo, POLLING_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [selectedConversation, fetchMessagesForSelectedConvo]);

  const handleSelectConversation = async (conversation: ZaloConversation) => {
    if (user && conversation.unreadCount > 0) {
      const { error } = await supabase
        .from('zalo_conversation_seen_status')
        .upsert({
          user_id: user.id,
          conversation_thread_id: conversation.threadId,
          last_seen_at: new Date().toISOString(),
        });
      if (error) {
        console.error("Failed to update seen status:", error);
        showError("Không thể cập nhật trạng thái đã xem.");
      }
    }

    if (conversation.unreadCount > 0) {
      const updatedConvo = { ...conversation, unreadCount: 0 };
      setConversations(convos => 
        convos.map(c => c.threadId === conversation.threadId ? updatedConvo : c)
      );
      setSelectedConversation(updatedConvo);
    } else {
      setSelectedConversation(conversation);
    }

    setLoadingMessages(true);
    setMessages([]);
    try {
      const { data, error } = await supabase
        .from('zalo_messages')
        .select('id, message_content, created_at, message_image, direction')
        .eq('threadId', conversation.threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const formattedMessages: ZaloMessage[] = data.map(msg => ({
        id: msg.id,
        content: msg.message_content,
        imageUrl: msg.message_image,
        attachmentName: msg.message_image ? getFileNameFromUrl(msg.message_image) : null,
        createdAt: msg.created_at,
        isOutgoing: msg.direction === 'out',
      }));
      setMessages(formattedMessages);
    } catch (error: any) {
      showError("Lỗi tải tin nhắn: " + error.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        if (file.size > 25 * 1024 * 1024) { // 25MB limit
            showError("Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 25MB.");
            return;
        }
        setAttachment(file);
    }
    if (event.target) {
        event.target.value = "";
    }
  };

  const sanitizeFileName = (fileName: string) => {
    let sanitized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    sanitized = sanitized.replace(/\s+/g, '_');
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
    return sanitized;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;

    setSendingMessage(true);
    const content = newMessage.trim();
    const currentAttachment = attachment;
    
    setNewMessage('');
    setAttachment(null);

    const tempId = Date.now();
    const tempMessage: ZaloMessage = {
        id: tempId,
        content: content,
        imageUrl: currentAttachment ? URL.createObjectURL(currentAttachment) : null,
        attachmentName: currentAttachment ? currentAttachment.name : null,
        createdAt: new Date().toISOString(),
        isOutgoing: true,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
        let attachmentUrl: string | null = null;
        if (currentAttachment) {
            const sanitizedFileName = sanitizeFileName(currentAttachment.name);
            const filePath = `${user!.id}/${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase.storage
                .from('zalo_attachments')
                .upload(filePath, currentAttachment);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('zalo_attachments')
                .getPublicUrl(filePath);
            
            attachmentUrl = publicUrl;
        }

        const payload = {
          content: content,
          attachmentUrl: attachmentUrl,
          recipient: {
            id: selectedConversation.threadId,
            name: selectedConversation.name,
            avatar: selectedConversation.avatar,
          },
          status: 'đã xem',
          sentAt: new Date().toISOString(),
        };
        
        const { error } = await supabase.functions.invoke('n8n-zalo-webhook-proxy', { body: payload });
        if (error) throw error;

    } catch (error: any) {
        showError("Gửi tin nhắn thất bại: " + error.message);
        setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
        setSendingMessage(false);
        if (tempMessage.imageUrl && tempMessage.imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(tempMessage.imageUrl);
        }
    }
  };

  const handleConversationUpdate = (updatedConversation: ZaloConversation) => {
    setSelectedConversation(updatedConversation);
    setConversations(convos => 
        convos.map(c => c.threadId === updatedConversation.threadId ? updatedConversation : c)
    );
  };

  const handleToggleLabel = async (label: ZaloLabel) => {
    if (!selectedConversation) return;

    const currentLabels = selectedConversation.labels || [];
    const isApplied = currentLabels.includes(label.name);
    
    const newLabels = isApplied
      ? currentLabels.filter(l => l !== label.name)
      : [...currentLabels, label.name];

    const updatedConversation = { ...selectedConversation, labels: newLabels };
    setSelectedConversation(updatedConversation);
    setConversations(convos => 
      convos.map(c => c.threadId === selectedConversation.threadId ? updatedConversation : c)
    );

    if (isApplied) {
      const { error } = await supabase
        .from('zalo_conversation_labels')
        .delete()
        .match({ thread_id: selectedConversation.threadId, label_id: label.id });
      if (error) {
        showError(`Gỡ thẻ thất bại: ${error.message}`);
        setSelectedConversation(selectedConversation);
        setConversations(convos => 
          convos.map(c => c.threadId === selectedConversation.threadId ? selectedConversation : c)
        );
      }
    } else {
      const { error } = await supabase
        .from('zalo_conversation_labels')
        .insert({ thread_id: selectedConversation.threadId, label_id: label.id });
      if (error) {
        showError(`Gắn thẻ thất bại: ${error.message}`);
        setSelectedConversation(selectedConversation);
        setConversations(convos => 
          convos.map(c => c.threadId === selectedConversation.threadId ? selectedConversation : c)
        );
      }
    }
  };

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc: ({ type: 'date'; date: string } | { type: 'message'; data: ZaloMessage })[], message, index) => {
      const messageDate = new Date(message.createdAt);
      const prevMessage = messages[index - 1];
      const prevMessageDate = prevMessage ? new Date(prevMessage.createdAt) : null;
      if (!prevMessageDate || !isSameDay(messageDate, prevMessageDate)) {
        acc.push({ type: 'date', date: format(messageDate, 'dd MMM yyyy', { locale: vi }) });
      }
      acc.push({ type: 'message', data: message });
      return acc;
    }, []);
  }, [messages]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(convo =>
      convo.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const labelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    zaloLabels.forEach(label => {
        map.set(label.name, label.color);
    });
    return map;
  }, [zaloLabels]);

  const unreadConversations = filteredConversations.filter(c => c.unreadCount > 0);
  const readConversations = filteredConversations.filter(c => c.unreadCount === 0);

  const renderConversationItem = (convo: ZaloConversation) => {
    const isLastMessageOutgoing = convo.lastMessageDirection === 'out';
    const MAX_VISIBLE_LABELS = 2;
    const visibleLabels = convo.labels?.slice(0, MAX_VISIBLE_LABELS) || [];
    const hiddenLabelsCount = convo.labels ? convo.labels.length - visibleLabels.length : 0;

    return (
      <div key={convo.threadId} onClick={() => handleSelectConversation(convo)} className={cn(
        "p-2.5 flex space-x-3 cursor-pointer rounded-lg", 
        selectedConversation?.threadId === convo.threadId && "bg-blue-100",
        convo.hasScheduledScript && ! (selectedConversation?.threadId === convo.threadId) && "bg-yellow-50 hover:bg-yellow-100"
      )}>
        <Avatar className="h-12 w-12">
          <AvatarImage src={convo.avatar || defaultAvatar} />
          <AvatarFallback>{getInitials(convo.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center"><p className="font-semibold truncate text-sm">{convo.name}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.lastActivityAt), 'HH:mm')}</p></div>
          <div className="flex justify-between items-start mt-1">
            <p className={cn("text-sm truncate flex items-center", convo.unreadCount > 0 ? "text-black font-bold" : "text-muted-foreground")}>
              {isLastMessageOutgoing && <CornerDownLeft className="h-4 w-4 mr-1 flex-shrink-0" />}
              {convo.lastMessage}
            </p>
            {convo.unreadCount > 0 && <Badge variant="destructive">{convo.unreadCount}</Badge>}
          </div>
          {convo.labels && convo.labels.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 mt-1.5">
              {visibleLabels.map(labelName => {
                const color = labelColorMap.get(labelName) || '#6B7280';
                return (
                  <Badge
                    key={labelName}
                    variant="outline"
                    className="text-xs font-normal px-1.5 py-0.5"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                      borderColor: `${color}50`,
                    }}
                  >
                    {labelName}
                  </Badge>
                )
              })}
              {hiddenLabelsCount > 0 && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal px-1.5 py-0.5 cursor-default"
                      >
                        +{hiddenLabelsCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1 p-1">
                        {convo.labels.slice(MAX_VISIBLE_LABELS).map(labelName => (
                          <span key={labelName} className="text-xs">{labelName}</span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <input type="file" ref={imageInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold">Hộp thư Zalo</h2>
        <Button variant="outline" onClick={() => setIsDebugVisible(!isDebugVisible)}>
          <Bug className="h-4 w-4 mr-2" />
          Bật/Tắt Gỡ lỗi
        </Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm Zalo" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConversations ? ([...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)) : (
              <>
                {unreadConversations.length > 0 && (
                  <div className="mb-4 p-2 bg-blue-50/50 rounded-lg">
                    <h3 className="px-1 pb-1 text-xs font-bold uppercase text-blue-600 tracking-wider">Chưa xem</h3>
                    <div className="space-y-1">{unreadConversations.map(renderConversationItem)}</div>
                  </div>
                )}
                {readConversations.length > 0 && (
                  <div className="space-y-1">{readConversations.map(renderConversationItem)}</div>
                )}
                {filteredConversations.length === 0 && !loadingConversations && (
                  <p className="p-4 text-sm text-center text-muted-foreground">Không có cuộc trò chuyện nào.</p>
                )}
              </>
            )}
          </div>
        </aside>
        <div className="flex-1 flex">
          <section className="flex-1 flex flex-col bg-slate-50">
            {selectedConversation ? (
              <>
                <header className="p-3 border-b bg-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={selectedConversation.avatar || defaultAvatar} />
                      <AvatarFallback>{getInitials(selectedConversation.name)}</AvatarFallback>
                    </Avatar>
                    <div><h3 className="font-bold">{selectedConversation.name}</h3><p className="text-xs text-muted-foreground">Online</p></div>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchZaloData(true)} disabled={loadingConversations}>
                      <RefreshCw className={cn("h-5 w-5", loadingConversations && "animate-spin")} />
                    </Button>
                  </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <div className="space-y-4">
                    {loadingMessages ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : groupedMessages.map((item, index) => {
                      if (item.type === 'date') {
                        return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>;
                      }
                      const msg = item.data;
                      return (
                        <div key={msg.id} className={cn("flex items-start gap-3", msg.isOutgoing && "justify-end")}>
                          {!msg.isOutgoing && (
                            <Avatar className="h-8 w-8 flex-shrink-0 self-end">
                              <AvatarImage src={selectedConversation.avatar || defaultAvatar} />
                              <AvatarFallback>{getInitials(selectedConversation.name)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn("flex flex-col max-w-sm md:max-w-md", msg.isOutgoing ? 'items-end' : 'items-start')}>
                              <div className={cn("rounded-2xl break-words shadow-sm", msg.isOutgoing ? 'bg-blue-500 text-white' : 'bg-white text-gray-800', !msg.content && !msg.imageUrl ? 'p-0' : 'px-3 py-2')}>
                                {msg.imageUrl && isImageUrl(msg.imageUrl) && (
                                  <img src={msg.imageUrl} alt="Zalo attachment" className="rounded-lg max-w-full h-auto" />
                                )}
                                {msg.imageUrl && !isImageUrl(msg.imageUrl) && (
                                  <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2 p-2 rounded-lg", msg.isOutgoing ? 'hover:bg-blue-600' : 'hover:bg-slate-100')}>
                                    <FileText className="h-6 w-6 flex-shrink-0" />
                                    <span className="font-medium truncate">{msg.attachmentName || 'Tệp đính kèm'}</span>
                                  </a>
                                )}
                                {msg.content && <p className={cn("whitespace-pre-wrap break-words", msg.imageUrl && "mt-2")}>{msg.content}</p>}
                              </div>
                              <p className="text-xs text-muted-foreground px-1 mt-1">
                                  {format(new Date(msg.createdAt), 'HH:mm')}
                              </p>
                          </div>
                           {msg.isOutgoing && (
                            <Avatar className="h-8 w-8 flex-shrink-0 self-end">
                              <AvatarImage src={user?.user_metadata?.avatar_url ?? undefined} />
                              <AvatarFallback>{getInitials(user?.user_metadata?.full_name || user?.email)}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div ref={messagesEndRef} />
                </div>
                <footer className="p-2 border-t bg-white space-y-2">
                  {attachment && (
                    <div className="px-3 py-2 bg-slate-100 rounded-lg flex items-center justify-between animate-in fade-in">
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
                    {zaloLabels.map(label => {
                      const isApplied = selectedConversation?.labels?.includes(label.name);
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
                          onClick={() => handleToggleLabel(label)}
                        >
                          {isApplied && <Check className="h-3 w-3 mr-1.5" />}
                          {label.name}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex items-center">
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => imageInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <form onSubmit={handleSendMessage} className="relative flex-1">
                      <Input ref={messageInputRef} placeholder="Nhập tin nhắn Zalo..." className="pr-12" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={sendingMessage} />
                      <Button type="submit" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-9" disabled={sendingMessage || (!newMessage.trim() && !attachment)}>
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
                      </Button>
                    </form>
                  </div>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-4">
                  <img src="https://stc-zmp3.zadn.vn/zalo-pc/images/logo-zalo.svg" alt="Zalo Logo" className="w-24 h-24" />
                  <p>Chọn một cuộc trò chuyện Zalo để bắt đầu.</p>
                </div>
              </div>
            )}
          </section>
          <ZaloContactPanel 
            selectedConversation={selectedConversation} 
            onConversationUpdate={handleConversationUpdate}
          />
        </div>
        {isDebugVisible && <div className="p-4 border-t"><ZaloDataDebugger usersMap={debugUsersMap} conversations={conversations} /></div>}
      </div>
    </div>
  );
};

export default ChatbotZalo;