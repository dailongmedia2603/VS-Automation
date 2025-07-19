import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, SendHorizonal, RefreshCw, Loader2, Bug } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { ZaloDataDebugger } from '@/components/ZaloDataDebugger';
import type { ZaloUser, ZaloConversation, ZaloMessageDb, ZaloMessage } from '@/types/zalo';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const ChatbotZalo = () => {
  const [conversations, setConversations] = useState<ZaloConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ZaloConversation | null>(null);
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const defaultAvatar = 'https://s120-ava-talk.zadn.vn/a/a/c/2/1/120/90898606938dd183dbf5c748e3dae52d.jpg';
  
  // Debugger state
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [debugUsersMap, setDebugUsersMap] = useState<Map<string, ZaloUser>>(new Map());

  const fetchZaloData = useCallback(async () => {
    setLoadingConversations(true);
    try {
      // Step 1: Fetch data concurrently, casting bigint to text to prevent precision loss
      const [usersResponse, messagesResponse] = await Promise.all([
        supabase.from('zalo_user').select('userId::text, displayName, zaloName, avatar'),
        supabase.from('zalo_messages').select('id, threadId::text, message_content, created_at, threadId_name').order('created_at', { ascending: false })
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (messagesResponse.error) throw messagesResponse.error;

      const usersData = usersResponse.data as ZaloUser[];
      const messagesData = messagesResponse.data as ZaloMessageDb[];

      // Step 2: Create a User Lookup Map
      const usersMap = new Map<string, ZaloUser>();
      usersData.forEach(user => {
        usersMap.set(user.userId.trim(), user);
      });
      
      // Update debugger state
      setDebugUsersMap(usersMap);

      // Step 3: Build conversations and attach avatars
      const conversationsMap = new Map<string, ZaloConversation>();
      messagesData.forEach(msg => {
        const threadIdStr = msg.threadId.trim();
        
        if (!conversationsMap.has(threadIdStr) && msg.message_content) {
          const user = usersMap.get(threadIdStr);
          conversationsMap.set(threadIdStr, {
            threadId: threadIdStr,
            name: user?.displayName || user?.zaloName || msg.threadId_name || 'Unknown User',
            avatar: user?.avatar,
            lastMessage: msg.message_content,
            lastActivityAt: msg.created_at,
            unreadCount: 0,
          });
        }
      });

      const sortedConversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

      setConversations(sortedConversations);

    } catch (error: any) {
      console.error("Error fetching Zalo data:", error);
      showError("Lỗi tải dữ liệu Zalo: " + error.message);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchZaloData();
  }, [fetchZaloData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = async (conversation: ZaloConversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const { data, error } = await supabase
        .from('zalo_messages')
        .select('id, message_content, created_at')
        .eq('threadId', conversation.threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: ZaloMessage[] = data.map(msg => ({
        id: msg.id,
        content: msg.message_content,
        createdAt: msg.created_at,
        isOutgoing: false,
      }));
      setMessages(formattedMessages);

    } catch (error: any) {
      showError("Lỗi tải tin nhắn: " + error.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    
    const tempMessage: ZaloMessage = {
        id: Date.now(),
        content: newMessage.trim(),
        createdAt: new Date().toISOString(),
        isOutgoing: true,
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    const { error } = await supabase
        .from('zalo_messages')
        .insert({
            threadId: selectedConversation.threadId,
            message_content: tempMessage.content,
            threadId_name: selectedConversation.name,
        });

    if (error) {
        showError("Gửi tin nhắn thất bại: " + error.message);
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } else {
        showSuccess("Đã gửi tin nhắn!");
        fetchZaloData();
    }
    setSendingMessage(false);
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

  const renderConversationItem = (convo: ZaloConversation) => (
    <div key={convo.threadId} onClick={() => handleSelectConversation(convo)} className={cn("p-2.5 flex space-x-3 cursor-pointer rounded-lg", selectedConversation?.threadId === convo.threadId && "bg-blue-100")}>
      <Avatar className="h-12 w-12">
        <AvatarImage src={convo.avatar || defaultAvatar} />
        <AvatarFallback>{getInitials(convo.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center"><p className="font-semibold truncate text-sm">{convo.name}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.lastActivityAt), 'HH:mm')}</p></div>
        <div className="flex justify-between items-start mt-1">
          <p className={cn("text-sm truncate flex items-center", convo.unreadCount > 0 ? "text-black font-bold" : "text-muted-foreground")}>
            {convo.lastMessage}
          </p>
          {convo.unreadCount > 0 && <Badge variant="destructive">{convo.unreadCount}</Badge>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
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
                {filteredConversations.length > 0 ? (
                  filteredConversations.map(renderConversationItem)
                ) : (
                  <p className="p-4 text-sm text-center text-muted-foreground">Không có cuộc trò chuyện nào.</p>
                )}
              </>
            )}
          </div>
        </aside>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchZaloData} disabled={loadingConversations}>
                    <RefreshCw className={cn("h-5 w-5", loadingConversations && "animate-spin")} />
                  </Button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="space-y-2">
                  {loadingMessages ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : groupedMessages.map((item, index) => {
                    if (item.type === 'date') {
                      return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>;
                    }
                    const msg = item.data;
                    return (
                      <div key={msg.id} className={cn("flex items-start gap-3", msg.isOutgoing && "justify-end")}>
                        {!msg.isOutgoing && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedConversation.avatar || defaultAvatar} />
                            <AvatarFallback>{getInitials(selectedConversation.name)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("rounded-2xl px-3 py-2 max-w-sm md:max-w-md break-words shadow-sm", msg.isOutgoing ? 'bg-blue-500 text-white' : 'bg-white text-gray-800')}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div ref={messagesEndRef} />
              </div>
              <footer className="p-2 border-t bg-white space-y-2">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input placeholder="Nhập tin nhắn Zalo..." className="pr-12" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={sendingMessage} />
                  <Button type="submit" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-9" disabled={sendingMessage}>
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
                  </Button>
                </form>
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
      </div>
      {isDebugVisible && <div className="p-4 border-t"><ZaloDataDebugger usersMap={debugUsersMap} conversations={conversations} /></div>}
    </div>
  );
};

export default ChatbotZalo;