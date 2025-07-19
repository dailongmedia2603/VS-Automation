import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { format, isSameDay, subMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChatwootContactPanel } from '@/components/ChatwootContactPanel';
import { AiLogViewer } from '@/components/AiLogViewer';
import { Search, Phone, Paperclip, Image as ImageIcon, SendHorizonal, ThumbsUp, Settings2, CornerDownLeft, Eye, RefreshCw, FileText, X, Filter, Check, PlusCircle, Trash2, Bot, Loader2 } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { Conversation, Message, CareScript, ChatwootLabel } from '@/types/chatwoot';

// --- Dữ liệu mẫu ---
const MOCK_LABELS: ChatwootLabel[] = [
  { id: 1, name: 'Khách VIP', color: '#7c3aed' },
  { id: 2, name: 'Cần tư vấn', color: '#db2777' },
  { id: 3, name: 'Khiếu nại', color: '#e11d48' },
  { id: 4, name: 'AI chăm', color: '#2563eb' },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    messages: [],
    meta: {
      sender: { id: 1, name: 'Nguyễn Thị Thảo', thumbnail: 'https://i.pravatar.cc/150?u=thaonguyen' }
    },
    status: 'open',
    unread_count: 2,
    last_activity_at: new Date().getTime() / 1000,
    labels: ['Cần tư vấn'],
  },
  {
    id: 2,
    messages: [],
    meta: {
      sender: { id: 2, name: 'Trần Văn Hùng', thumbnail: 'https://i.pravatar.cc/150?u=hungtran', phone_number: '0987654321' }
    },
    status: 'open',
    unread_count: 0,
    last_activity_at: new Date().getTime() / 1000 - 600,
    labels: ['Khách VIP'],
  },
  {
    id: 3,
    messages: [],
    meta: {
      sender: { id: 3, name: 'Lê Minh Anh', thumbnail: 'https://i.pravatar.cc/150?u=minhanh' }
    },
    status: 'open',
    unread_count: 0,
    last_activity_at: new Date().getTime() / 1000 - 1200,
    labels: [],
  },
];

const MOCK_MESSAGES: { [key: number]: Message[] } = {
  1: [
    { id: 101, content: 'Chào shop, mình muốn hỏi về sản phẩm Zalo AI.', created_at: subMinutes(new Date(), 5).getTime() / 1000, message_type: 0, private: false, sender: { id: 1, name: 'Nguyễn Thị Thảo', thumbnail: 'https://i.pravatar.cc/150?u=thaonguyen' } },
    { id: 102, content: 'Dạ chào bạn, Zalo AI có thể giúp bạn tự động hóa việc chăm sóc khách hàng ạ. Bạn cần tư vấn cụ thể về tính năng nào ạ?', created_at: subMinutes(new Date(), 4).getTime() / 1000, message_type: 1, private: false },
    { id: 103, content: 'Mình muốn biết về giá.', created_at: subMinutes(new Date(), 2).getTime() / 1000, message_type: 0, private: false, sender: { id: 1, name: 'Nguyễn Thị Thảo', thumbnail: 'https://i.pravatar.cc/150?u=thaonguyen' } },
  ],
  2: [
    { id: 201, content: 'Shop ơi, check đơn hàng giúp mình với.', created_at: subMinutes(new Date(), 20).getTime() / 1000, message_type: 0, private: false, sender: { id: 2, name: 'Trần Văn Hùng', thumbnail: 'https://i.pravatar.cc/150?u=hungtran' } },
  ],
  3: [],
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const ChatbotZalo = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedLabels, setSuggestedLabels] = useState<ChatwootLabel[]>(MOCK_LABELS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Giả lập tải dữ liệu
    setTimeout(() => {
      setConversations(MOCK_CONVERSATIONS);
      setLoadingConversations(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      setLoadingMessages(true);
      setTimeout(() => {
        setMessages(MOCK_MESSAGES[selectedConversation.id] || []);
        setLoadingMessages(false);
      }, 500);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const updatedConversations = conversations.map(c => 
      c.id === conversation.id ? { ...c, unread_count: 0 } : c
    );
    setConversations(updatedConversations);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    const sentMessage: Message = {
      id: Date.now(),
      content: newMessage,
      created_at: new Date().getTime() / 1000,
      message_type: 1,
      private: false,
    };

    setTimeout(() => {
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      setSendingMessage(false);
      showSuccess("Đã gửi tin nhắn!");
    }, 500);
  };

  const handleToggleLabel = (label: string) => {
    if (!selectedConversation) return;

    const currentLabels = selectedConversation.labels || [];
    const isLabelApplied = currentLabels.includes(label);
    const newLabels = isLabelApplied
      ? currentLabels.filter(l => l !== label)
      : [...currentLabels, label];

    const updatedConversation = { ...selectedConversation, labels: newLabels };
    setSelectedConversation(updatedConversation);
    setConversations(convos => convos.map(c => c.id === selectedConversation.id ? updatedConversation : c));
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
    return conversations.filter(convo =>
      convo.meta.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const unreadConversations = filteredConversations.filter(c => c.unread_count > 0);
  const readConversations = filteredConversations.filter(c => !c.unread_count || c.unread_count === 0);

  const renderConversationItem = (convo: Conversation) => (
    <div key={convo.id} onClick={() => handleSelectConversation(convo)} className={cn("p-2.5 flex space-x-3 cursor-pointer rounded-lg", selectedConversation?.id === convo.id && "bg-blue-100")}>
      <Avatar className="h-12 w-12"><AvatarImage src={convo.meta.sender.thumbnail} /><AvatarFallback>{getInitials(convo.meta.sender.name)}</AvatarFallback></Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center"><p className="font-semibold truncate text-sm">{convo.meta.sender.name}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.last_activity_at * 1000), 'HH:mm')}</p></div>
        <div className="flex justify-between items-start mt-1">
          <p className={cn("text-sm truncate flex items-center", convo.unread_count > 0 ? "text-black font-bold" : "text-muted-foreground")}>
            {MOCK_MESSAGES[convo.id]?.slice(-1)[0]?.content || 'Không có tin nhắn'}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {convo.meta.sender.phone_number && <Phone className="h-4 w-4 text-green-600" strokeWidth={2} />}
            {convo.unread_count > 0 && <Badge variant="destructive">{convo.unread_count}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white border-t">
      <aside className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm Zalo" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? ([...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)) : (
            <>
              {unreadConversations.length > 0 && (<div className="mb-4 p-2 bg-blue-50/50 rounded-lg"><h3 className="px-1 pb-1 text-xs font-bold uppercase text-blue-600 tracking-wider">Chưa đọc</h3><div className="space-y-1">{unreadConversations.map(renderConversationItem)}</div></div>)}
              {readConversations.length > 0 && (<div className="space-y-1">{readConversations.map(renderConversationItem)}</div>)}
              {filteredConversations.length === 0 && !loadingConversations && (<p className="p-4 text-sm text-center text-muted-foreground">Không có cuộc trò chuyện nào.</p>)}
            </>
          )}
        </div>
      </aside>
      <section className="flex-1 flex flex-col bg-slate-50">
        {selectedConversation ? (
          <>
            <header className="p-3 border-b bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3"><Avatar><AvatarImage src={selectedConversation.meta.sender.thumbnail} /><AvatarFallback>{getInitials(selectedConversation.meta.sender.name)}</AvatarFallback></Avatar><div><h3 className="font-bold">{selectedConversation.meta.sender.name}</h3><p className="text-xs text-muted-foreground">Online</p></div></div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-8 w-8"><RefreshCw className="h-5 w-5" /></Button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-2">
                {loadingMessages ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : groupedMessages.map((item, index) => {
                  if (item.type === 'date') {
                    return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>;
                  }
                  const msg = item.data;
                  const isOutgoing = msg.message_type === 1;
                  return (
                    <div key={msg.id} className={cn("flex items-start gap-3", isOutgoing && "justify-end")}>
                      {!isOutgoing && <Avatar className="h-8 w-8"><AvatarImage src={msg.sender?.thumbnail} /><AvatarFallback>{getInitials(msg.sender?.name)}</AvatarFallback></Avatar>}
                      <div className={cn("rounded-2xl px-3 py-2 max-w-sm md:max-w-md break-words shadow-sm", isOutgoing ? 'bg-blue-500 text-white' : 'bg-white text-gray-800')}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>
            <footer className="p-2 border-t bg-white space-y-2">
              <div className="flex flex-wrap gap-2 px-2">
                {suggestedLabels.map(label => {
                  const isApplied = selectedConversation?.labels.includes(label.name);
                  return (
                    <Button key={label.id} variant="outline" size="sm" className={cn("text-xs h-7 transition-all", isApplied && "text-white")} style={{ backgroundColor: isApplied ? label.color : 'transparent', borderColor: label.color, color: isApplied ? 'white' : label.color }} onClick={() => handleToggleLabel(label.name)}>
                      {isApplied && <Check className="h-3 w-3 mr-1.5" />}
                      {label.name}
                    </Button>
                  )
                })}
              </div>
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
      <ChatwootContactPanel
        selectedConversation={selectedConversation}
        messages={messages}
        onNewNote={() => {}}
        scripts={[]}
        fetchCareScripts={async () => {}}
        onConversationUpdate={() => {}}
      />
    </div>
  );
};

export default ChatbotZalo;