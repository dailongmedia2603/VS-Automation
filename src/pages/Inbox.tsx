import { useState, useEffect, useRef } from 'react';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Terminal, Send, Bot, User, Inbox as InboxIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Conversation = any;
type Message = any;

const Inbox = () => {
  const { settings } = useChatwoot();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!settings.accountId || !settings.inboxId || !settings.apiToken) {
        setConversationsError('Vui lòng điền đầy đủ thông tin trong trang Cài đặt > Chatbot.');
        setLoadingConversations(false);
        return;
      }

      setLoadingConversations(true);
      setConversationsError(null);

      try {
        const { data, error } = await supabase.functions.invoke('chatwoot-proxy', {
          body: { action: 'list_conversations', settings },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setConversations(data.payload || []);
      } catch (err: any) {
        setConversationsError(err.message || 'Đã xảy ra lỗi không xác định khi tải cuộc trò chuyện.');
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [settings]);

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      setMessagesError(null);
      try {
        const { data, error } = await supabase.functions.invoke('chatwoot-proxy', {
          body: {
            action: 'list_messages',
            settings,
            conversationId: selectedConversation.id,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);
        
        setMessages(data.payload.sort((a: Message, b: Message) => a.id - b.id) || []);
      } catch (err: any) {
        setMessagesError(err.message || 'Không thể tải tin nhắn cho cuộc trò chuyện này.');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversation, settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const messagePayload = {
        content: newMessage,
        message_type: 'outgoing',
        private: false,
      };

      const { data, error } = await supabase.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'send_message',
          settings,
          conversationId: selectedConversation.id,
          messagePayload,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessages([...messages, data]);
      setNewMessage('');
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setMessagesError("Gửi tin nhắn thất bại. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-100">
        <header className="border-b p-4 flex items-center justify-between h-16 bg-white">
            <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
        </header>
        <main className="flex-1 p-0 m-0 overflow-hidden">
            {conversationsError ? (
                <div className="p-4">
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Lỗi!</AlertTitle>
                        <AlertDescription>{conversationsError}</AlertDescription>
                    </Alert>
                </div>
            ) : (
                <ResizablePanelGroup direction="horizontal" className="h-full max-h-full rounded-none border-none bg-white">
                    <ResizablePanel defaultSize={30} minSize={20}>
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b">
                                <h2 className="text-lg font-semibold">Cuộc trò chuyện</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {loadingConversations ? (
                                    <div className="p-4 space-y-4">
                                        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                                    </div>
                                ) : conversations.length > 0 ? (
                                    conversations.map((convo) => (
                                        <div
                                            key={convo.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-zinc-50",
                                                selectedConversation?.id === convo.id && "bg-blue-50"
                                            )}
                                            onClick={() => setSelectedConversation(convo)}
                                        >
                                            <Avatar>
                                                <AvatarImage src={convo.meta.sender.thumbnail} />
                                                <AvatarFallback>{convo.meta.sender.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold truncate">{convo.meta.sender.name}</p>
                                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(convo.timestamp * 1000), { addSuffix: true, locale: vi })}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {convo.messages[0]?.content || 'Chưa có tin nhắn'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-muted-foreground">Không có cuộc trò chuyện nào.</div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={70}>
                        {selectedConversation ? (
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={selectedConversation.meta.sender.thumbnail} />
                                        <AvatarFallback>{selectedConversation.meta.sender.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{selectedConversation.meta.sender.name}</h3>
                                        <Badge variant={selectedConversation.status === 'open' ? 'default' : 'outline'}>{selectedConversation.status}</Badge>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
                                    {loadingMessages ? (
                                        <div className="space-y-4 p-4">
                                            <Skeleton className="h-12 w-3/4 rounded-lg" />
                                            <Skeleton className="h-12 w-3/4 ml-auto rounded-lg" />
                                            <Skeleton className="h-12 w-3/4 rounded-lg" />
                                        </div>
                                    ) : messagesError ? (
                                        <Alert variant="destructive">
                                            <Terminal className="h-4 w-4" />
                                            <AlertTitle>Lỗi!</AlertTitle>
                                            <AlertDescription>{messagesError}</AlertDescription>
                                        </Alert>
                                    ) : messages.length > 0 ? (
                                        messages.map((msg) => (
                                            <div key={msg.id} className={cn("flex items-end gap-2", msg.message_type === 1 && "justify-end")}>
                                                {msg.message_type !== 1 && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={msg.sender?.thumbnail} />
                                                        <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className={cn(
                                                    "rounded-lg px-3 py-2 max-w-md break-words",
                                                    msg.message_type === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                {msg.message_type === 1 && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground p-8">Không có tin nhắn nào.</div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-4 border-t bg-white">
                                    <div className="relative">
                                        <Input
                                            placeholder="Nhập tin nhắn của bạn..."
                                            className="pr-12"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                            disabled={isSending}
                                        />
                                        <Button size="icon" className="absolute top-1/2 right-1.5 -translate-y-1/2 h-7 w-7" onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-zinc-50">
                                <InboxIcon className="w-16 h-16 mb-4 text-gray-400" />
                                <h2 className="text-xl font-semibold text-gray-700">Chọn một cuộc trò chuyện</h2>
                                <p className="mt-1 text-sm">Chọn một cuộc trò chuyện từ danh sách bên trái để xem chi tiết.</p>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}
        </main>
    </div>
  );
};

export default Inbox;