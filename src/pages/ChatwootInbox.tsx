import React, { useState, useEffect, useRef } from 'react';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChatwootContactPanel } from '@/components/ChatwootContactPanel';
import { Search, Phone, Link as LinkIcon, Smile, Paperclip, Image as ImageIcon, SendHorizonal, ThumbsUp, Settings2, CornerDownLeft, Eye, RefreshCw, UserPlus } from 'lucide-react';

// Interfaces
interface Attachment { id: number; file_type: 'image' | 'video' | 'audio' | 'file'; data_url: string; }
interface MessageSender { name: string; thumbnail?: string; }
interface Conversation { id: number; meta: { sender: { id: number; name: string; email?: string; phone_number?: string; thumbnail?: string; additional_attributes?: { company_name?: string; }; }; }; messages: { content: string }[]; last_activity_at: number; unread_count: number; labels: string[]; status: string; }
interface Message { id: number; content: string; created_at: number; message_type: number; private: boolean; sender?: MessageSender; attachments?: Attachment[]; }

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const ChatwootInbox = () => {
  const { settings } = useChatwoot();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const POLLING_INTERVAL = 15000;
  const phoneRegex = /(0[3|5|7|8|9][0-9]{8})\b/;

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

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

  const fetchConversations = async (isInitialLoad = false) => {
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
          return;
      }
      const contactIds = conversationsFromServer.map(c => c.meta.sender.id);
      const { data: contactsFromDB } = await supabase.from('chatwoot_contacts').select('id, phone_number').in('id', contactIds);
      const phoneMap = new Map(contactsFromDB?.map(c => [c.id, c.phone_number]));
      const enrichedConversations = conversationsFromServer.map(convo => {
          const storedPhoneNumber = phoneMap.get(convo.meta.sender.id);
          if (storedPhoneNumber && !convo.meta.sender.phone_number) {
              return { ...convo, meta: { ...convo.meta, sender: { ...convo.meta.sender, phone_number: storedPhoneNumber } } };
          }
          return convo;
      });
      setConversations(enrichedConversations);
      await syncConversationsToDB(enrichedConversations);
    } catch (err) { console.error("Lỗi polling cuộc trò chuyện:", err);
    } finally { if (isInitialLoad) setLoadingConversations(false); }
  };

  const fetchMessages = async (convoId: number) => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'list_messages', settings, conversationId: convoId }, });
      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);
      const newMessages = data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || [];
      setMessages(current => newMessages.length > current.length ? newMessages : current);
      await syncMessagesToDB(newMessages, convoId);
    } catch (err) { console.error("Lỗi polling tin nhắn:", err); }
  };

  useEffect(() => {
    fetchConversations(true);
    const intervalId = setInterval(() => fetchConversations(false), POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [settings.apiToken, settings.accountId]);

  useEffect(() => {
    if (!selectedConversation) return;
    const intervalId = setInterval(() => fetchMessages(selectedConversation.id), POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [selectedConversation]);

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
            }).catch(err => console.error("Failed to update contact phone number:", err));
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
    } catch (err) { console.error('Đã xảy ra lỗi khi tải tin nhắn.');
    } finally { setLoadingMessages(false); }
    if (conversation.unread_count > 0) {
      setConversations(convos => convos.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c));
      supabase.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings, conversationId: conversation.id }, }).catch(err => console.error("Lỗi ngầm khi đánh dấu đã đọc:", err.message));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    setSendingMessage(true);
    try {
      const { data } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings, conversationId: selectedConversation.id, content: newMessage }, });
      setMessages(prev => [...prev, data]);
      await syncMessagesToDB([data], selectedConversation.id);
    } catch (err) { console.error('Gửi tin nhắn thất bại.');
    } finally { setSendingMessage(false); }
  };

  const handleAddLabel = async (label: string) => {
    if (!selectedConversation) return;
    const currentLabels = selectedConversation.labels || [];
    if (currentLabels.includes(label)) return;
    const newLabels = [...currentLabels, label];
    const optimisticConversation = { ...selectedConversation, labels: newLabels };
    setSelectedConversation(optimisticConversation);
    setConversations(convos => convos.map(c => c.id === selectedConversation.id ? optimisticConversation : c));
    await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings, conversationId: selectedConversation.id, labels: newLabels } });
    const { data: upsertedLabel } = await supabase.from('chatwoot_labels').upsert({ name: label }, { onConflict: 'name' }).select().single();
    if (upsertedLabel) {
      await supabase.from('chatwoot_conversation_labels').upsert({ conversation_id: selectedConversation.id, label_id: upsertedLabel.id });
    }
  };

  const handleNewNote = (newNote: Message) => {
    setMessages(prev => [...prev, newNote]);
    if (selectedConversation) {
      syncMessagesToDB([newNote], selectedConversation.id);
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    return messages.reduce((acc, message, index) => {
      const messageDate = new Date(message.created_at * 1000);
      const prevMessage = messages[index - 1];
      const prevMessageDate = prevMessage ? new Date(prevMessage.created_at * 1000) : null;
      if (!prevMessageDate || !isSameDay(messageDate, prevMessageDate)) { acc.push({ type: 'date', date: format(messageDate, 'dd MMM yyyy', { locale: vi }) }); }
      if (!message.private) acc.push({ type: 'message', data: message });
      return acc;
    }, [] as ({ type: 'date'; date: string } | { type: 'message'; data: Message })[]);
  };
  const groupedMessages = groupMessagesByDate(messages);
  const filteredConversations = conversations.filter(convo => convo.meta.sender.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const unreadConversations = filteredConversations.filter(c => c.unread_count > 0);
  const readConversations = filteredConversations.filter(c => !c.unread_count || c.unread_count === 0);

  const renderConversationItem = (convo: Conversation) => (
    <div key={convo.id} onClick={() => handleSelectConversation(convo)} className={cn("p-2.5 flex space-x-3 cursor-pointer rounded-lg", selectedConversation?.id === convo.id && "bg-blue-100")}>
      <Avatar className="h-12 w-12"><AvatarImage src={convo.meta.sender.thumbnail} /><AvatarFallback>{getInitials(convo.meta.sender.name)}</AvatarFallback></Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center"><p className="font-semibold truncate text-sm">{convo.meta.sender.name}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.last_activity_at * 1000), 'HH:mm')}</p></div>
        <div className="flex justify-between items-start mt-1">
          <p className={cn("text-sm truncate flex items-center", convo.unread_count > 0 ? "text-black font-bold" : "text-muted-foreground")}><CornerDownLeft className="h-4 w-4 mr-1 flex-shrink-0" />{convo.messages[0]?.content || '[Media]'}</p>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {convo.meta.sender.phone_number && <Phone className="h-4 w-4 text-green-600" strokeWidth={2} />}
            {convo.unread_count > 0 && <Badge variant="destructive">{convo.unread_count}</Badge>}
          </div>
        </div>
        {convo.labels && convo.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {convo.labels.map(label => (
              <Badge key={label} variant="secondary" className="text-xs font-normal px-2 py-0.5">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white border-t">
      <aside className="w-80 border-r flex flex-col">
        <div className="p-3 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><div className="flex space-x-1.5 mt-3">{['#fde2e4', '#fad2e1', '#e2ece9', '#bee1e6', '#cddafd', '#fcf6bd', '#d0f4de'].map(color => (<div key={color} style={{ backgroundColor: color }} className="w-5 h-5 rounded-md cursor-pointer flex-1"></div>))}</div></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">{loadingConversations ? ([...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)) : (<>{unreadConversations.length > 0 && (<div className="mb-4 p-2 bg-blue-50/50 rounded-lg"><h3 className="px-1 pb-1 text-xs font-bold uppercase text-blue-600 tracking-wider">Chưa xem</h3><div className="space-y-1">{unreadConversations.map(renderConversationItem)}</div></div>)}{readConversations.length > 0 && (<div className="space-y-1">{readConversations.map(renderConversationItem)}</div>)}{filteredConversations.length === 0 && !loadingConversations && (<p className="p-4 text-sm text-center text-muted-foreground">Không tìm thấy cuộc trò chuyện nào.</p>)}</>)}</div>
      </aside>
      <section className="flex-1 flex flex-col bg-slate-50">
        {selectedConversation ? (
          <>
            <header className="p-3 border-b bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3"><Avatar><AvatarImage src={selectedConversation.meta.sender.thumbnail} /><AvatarFallback>{getInitials(selectedConversation.meta.sender.name)}</AvatarFallback></Avatar><div><h3 className="font-bold">{selectedConversation.meta.sender.name}</h3><p className="text-xs text-muted-foreground flex items-center"><Eye className="h-3 w-3 mr-1" />Chưa có người xem</p></div></div>
              <div className="flex items-center space-x-4 text-muted-foreground"><LinkIcon className="h-5 w-5 cursor-pointer hover:text-primary" /><RefreshCw className={cn("h-5 w-5 cursor-pointer hover:text-primary", loadingMessages && "animate-spin")} onClick={() => { if (selectedConversation && !loadingMessages) { handleSelectConversation(selectedConversation); } }} /><Smile className="h-5 w-5 cursor-pointer hover:text-primary" /><UserPlus className="h-5 w-5 cursor-pointer hover:text-primary" /></div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6"><div className="space-y-2">{loadingMessages ? <p>Đang tải...</p> : groupedMessages.map((item, index) => { if (item.type === 'date') return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>; const msg = item.data; const isOutgoing = msg.message_type === 1; if (msg.message_type === 2) return <div key={msg.id} className="text-center text-xs text-muted-foreground py-2 italic">{msg.content}</div>; return (<div key={msg.id} className={cn("flex items-start gap-3", isOutgoing && "justify-end")}>{!isOutgoing && <Avatar className="h-8 w-8"><AvatarImage src={msg.sender?.thumbnail} /><AvatarFallback>{getInitials(msg.sender?.name)}</AvatarFallback></Avatar>}<div className={cn("flex flex-col gap-1", isOutgoing ? 'items-end' : 'items-start')}><div className={cn("rounded-2xl px-3 py-2 max-w-sm md:max-w-md break-words shadow-sm", isOutgoing ? 'bg-green-100 text-gray-800' : 'bg-white text-gray-800')}>{msg.attachments?.map(att => <div key={att.id}>{att.file_type === 'image' ? <a href={att.data_url} target="_blank" rel="noopener noreferrer"><img src={att.data_url} alt="Attachment" className="rounded-lg max-w-full h-auto" /></a> : <video controls className="rounded-lg max-w-full h-auto"><source src={att.data_url} /></video>}</div>)}{msg.content && <p className={cn("whitespace-pre-wrap", msg.attachments && msg.attachments.length > 0 && msg.content ? "mt-2" : "")}>{msg.content}</p>}</div></div></div>);})}</div><div ref={messagesEndRef} /></div>
            <footer className="p-2 border-t bg-white space-y-2">
              <div className="flex flex-wrap gap-2 px-2">{['Spa & TMV', 'Mỹ phẩm & TPCN', 'Mẹ & Bé', 'Nha khoa'].map(tag => <Button key={tag} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAddLabel(tag)}>{tag}</Button>)}</div>
              <div className="relative"><Input placeholder="Trả lời..." className="pr-10" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} /><SendHorizonal className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" onClick={handleSendMessage} /></div>
              <div className="flex justify-between items-center px-2"><div className="flex items-center space-x-4 text-muted-foreground"><Paperclip className="h-5 w-5 cursor-pointer hover:text-primary" /><ImageIcon className="h-5 w-5 cursor-pointer hover:text-primary" /></div><div className="flex items-center space-x-4 text-muted-foreground"><ThumbsUp className="h-5 w-5 cursor-pointer hover:text-primary" /><Settings2 className="h-5 w-5 cursor-pointer hover:text-primary" /></div></div>
            </footer>
          </>
        ) : (<div className="flex-1 flex items-center justify-center text-center text-muted-foreground"><p>Vui lòng chọn một cuộc trò chuyện để xem tin nhắn.</p></div>)}
      </section>
      <ChatwootContactPanel selectedConversation={selectedConversation} messages={messages} onNewNote={handleNewNote} />
    </div>
  );
};

export default ChatwootInbox;