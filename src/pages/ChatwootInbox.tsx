import React, { useState, useEffect, useRef } from 'react';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChatwootContactPanel } from '@/components/ChatwootContactPanel';
import { Search, Phone, Mail, Link as LinkIcon, Smile, Paperclip, Image as ImageIcon, SendHorizonal, ThumbsUp, Settings2, CornerDownLeft, Eye, RefreshCw, UserPlus, Mic } from 'lucide-react';

// Interfaces (giữ nguyên)
interface Attachment { id: number; file_type: 'image' | 'video' | 'audio' | 'file'; data_url: string; }
interface MessageSender { name: string; thumbnail?: string; }
interface Conversation { id: number; meta: { sender: { name: string; thumbnail?: string; }; }; messages: { content: string }[]; last_activity_at: number; unread_count: number; }
interface Message { id: number; content: string; created_at: number; message_type: number; sender?: MessageSender; attachments?: Attachment[]; }

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const ChatwootInbox = () => {
  // State and hooks (giữ nguyên)
  const { settings } = useChatwoot();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const POLLING_INTERVAL = 10000;

  // Functions (giữ nguyên)
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    let isMounted = true;
    const fetchData = async (isInitialLoad = false) => {
      if (!settings.accountId || !settings.apiToken || !isMounted) {
        if (isInitialLoad) { setError('Vui lòng điền đầy đủ thông tin trong trang Cài đặt Chatbot.'); setLoadingConversations(false); }
        return;
      }
      if (isInitialLoad) { setLoadingConversations(true); setError(null); }
      try {
        const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_conversations', settings }, });
        if (!isMounted) return;
        if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
        if (data.error) throw new Error(data.error);
        setConversations(data.data.payload || []);
      } catch (err: any) {
        if (isInitialLoad) setError(err.message || 'Đã xảy ra lỗi không xác định.');
        else console.error("Lỗi polling cuộc trò chuyện:", err.message);
      } finally {
        if (isInitialLoad && isMounted) setLoadingConversations(false);
      }
    };
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), POLLING_INTERVAL);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, [settings.apiToken, settings.accountId]);
  useEffect(() => {
    if (!selectedConversation) return;
    const fetchSelectedMessages = async () => {
        try {
            const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_messages', settings, conversationId: selectedConversation.id }, });
            if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
            if (data.error) throw new Error(data.error);
            const newMessages = data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || [];
            setMessages(current => newMessages.length > current.length ? newMessages : current);
        } catch (err) { console.error("Lỗi polling tin nhắn:", err); }
    };
    const intervalId = setInterval(fetchSelectedMessages, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [selectedConversation, settings]);
  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_messages', settings, conversationId: conversation.id }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);
      setMessages(data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || []);
    } catch (err: any) { setError(err.message || 'Đã xảy ra lỗi khi tải tin nhắn.'); } finally { setLoadingMessages(false); }
    if (conversation.unread_count > 0) {
      setConversations(convos => convos.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c));
      supabase.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings, conversationId: conversation.id }, }).catch(err => { console.error("Lỗi ngầm khi đánh dấu đã đọc:", err.message); });
    }
  };
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    setSendingMessage(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings, conversationId: selectedConversation.id, content: newMessage }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (err: any) { setError(err.message || 'Gửi tin nhắn thất bại.'); } finally { setSendingMessage(false); }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    return messages.reduce((acc, message, index) => {
      const messageDate = new Date(message.created_at * 1000);
      const prevMessage = messages[index - 1];
      const prevMessageDate = prevMessage ? new Date(prevMessage.created_at * 1000) : null;
      if (!prevMessageDate || !isSameDay(messageDate, prevMessageDate)) {
        acc.push({ type: 'date', date: format(messageDate, 'dd MMM yyyy', { locale: vi }) });
      }
      acc.push({ type: 'message', data: message });
      return acc;
    }, [] as ({ type: 'date'; date: string } | { type: 'message'; data: Message })[]);
  };
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex h-full bg-white border-t">
      <aside className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm" className="pl-9" />
          </div>
          <div className="flex space-x-1.5 mt-3">
            {['#fde2e4', '#fad2e1', '#e2ece9', '#bee1e6', '#cddafd', '#fcf6bd', '#d0f4de'].map(color => (
              <div key={color} style={{ backgroundColor: color }} className="w-5 h-5 rounded-md cursor-pointer flex-1"></div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            [...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : (
            conversations.map((convo) => (
              <div key={convo.id} onClick={() => handleSelectConversation(convo)} className={cn("p-2.5 flex space-x-3 cursor-pointer rounded-lg", selectedConversation?.id === convo.id && "bg-blue-100")}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={convo.meta.sender.thumbnail} />
                  <AvatarFallback>{getInitials(convo.meta.sender.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold truncate text-sm">{convo.meta.sender.name}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.last_activity_at * 1000), 'HH:mm')}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className={cn("text-sm truncate flex items-center", convo.unread_count > 0 ? "text-black font-bold" : "text-muted-foreground")}>
                      <CornerDownLeft className="h-4 w-4 mr-1 flex-shrink-0" />
                      {convo.messages[0]?.content || '[Photo]'}
                    </p>
                    {convo.unread_count > 0 && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col bg-slate-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d1d5db' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")` }}>
        {selectedConversation ? (
          <>
            <header className="p-3 border-b bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <Avatar><AvatarImage src={selectedConversation.meta.sender.thumbnail} /><AvatarFallback>{getInitials(selectedConversation.meta.sender.name)}</AvatarFallback></Avatar>
                <div>
                  <h3 className="font-bold">{selectedConversation.meta.sender.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center"><Eye className="h-3 w-3 mr-1" />Chưa có người xem</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-muted-foreground">
                <LinkIcon className="h-5 w-5 cursor-pointer hover:text-primary" /><RefreshCw className="h-5 w-5 cursor-pointer hover:text-primary" /><Smile className="h-5 w-5 cursor-pointer hover:text-primary" /><UserPlus className="h-5 w-5 cursor-pointer hover:text-primary" />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-2">
                {loadingMessages ? <p>Đang tải...</p> : groupedMessages.map((item, index) => {
                  if (item.type === 'date') return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>;
                  const msg = item.data;
                  const isOutgoing = msg.message_type === 1;
                  if (msg.message_type === 2) return <div key={msg.id} className="text-center text-xs text-muted-foreground py-2 italic">{msg.content}</div>;
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
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>
            <footer className="p-2 border-t bg-white space-y-2">
              <div className="flex flex-wrap gap-2 px-2">
                {['Spa & TMV', 'Mỹ phẩm & TPCN', 'Mẹ & Bé', 'Nha khoa'].map(tag => <Button key={tag} variant="outline" size="sm" className="text-xs h-7">{tag}</Button>)}
              </div>
              <div className="relative">
                <Input placeholder="Trả lời..." className="pr-10" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} />
                <SendHorizonal className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" onClick={handleSendMessage} />
              </div>
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <Phone className="h-5 w-5 cursor-pointer hover:text-primary" /><Mic className="h-5 w-5 cursor-pointer hover:text-primary" /><Paperclip className="h-5 w-5 cursor-pointer hover:text-primary" /><ImageIcon className="h-5 w-5 cursor-pointer hover:text-primary" />
                </div>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <ThumbsUp className="h-5 w-5 cursor-pointer hover:text-primary" /><Settings2 className="h-5 w-5 cursor-pointer hover:text-primary" />
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground"><p>Vui lòng chọn một cuộc trò chuyện để xem tin nhắn.</p></div>
        )}
      </section>
      <ChatwootContactPanel />
    </div>
  );
};

export default ChatwootInbox;