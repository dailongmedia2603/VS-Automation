import { useState, useEffect, useRef } from 'react';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Attachment {
  id: number;
  file_type: 'image' | 'video' | 'audio' | 'file';
  data_url: string;
}

interface MessageSender {
  name: string;
  thumbnail?: string;
}

interface Conversation {
  id: number;
  meta: {
    sender: {
      name: string;
      thumbnail?: string;
    };
  };
  messages: { content: string }[];
  last_activity_at: number;
}

interface Message {
  id: number;
  content: string;
  created_at: number;
  message_type: number; // 0: incoming, 1: outgoing, 2: activity
  sender?: MessageSender;
  attachments?: Attachment[];
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const ChatwootInbox = () => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!settings.accountId || !settings.inboxId || !settings.apiToken) {
        setError('Vui lòng điền đầy đủ thông tin trong trang Cài đặt Chatbot.');
        setLoadingConversations(false);
        return;
      }

      setLoadingConversations(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', {
          body: { action: 'list_conversations', settings },
        });

        if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
        if (data.error) throw new Error(data.error);

        setConversations(data.data.payload || []);
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi không xác định.');
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [settings]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'list_messages',
          settings,
          conversationId: conversation.id,
        },
      });

      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);

      setMessages(data.payload.sort((a: Message, b: Message) => a.created_at - b.created_at) || []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải tin nhắn.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'send_message',
          settings,
          conversationId: selectedConversation.id,
          content: newMessage,
        },
      });

      if (functionError) throw new Error((await functionError.context.json()).error || functionError.message);
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, data]);
      setNewMessage('');

    } catch (err: any)
{
      setError(err.message || 'Gửi tin nhắn thất bại.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <main className="flex h-full bg-white border-t">
      <aside className="w-1/3 border-r flex flex-col lg:w-1/4">
        <header className="p-4 border-b">
          <h2 className="text-xl font-bold">Hộp thư</h2>
        </header>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : error && conversations.length === 0 ? (
             <div className="p-4">
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Lỗi!</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
             </div>
          ) : (
            <ul className="divide-y">
              {conversations.length > 0 ? conversations.map((convo) => (
                <li
                  key={convo.id}
                  onClick={() => handleSelectConversation(convo)}
                  className={cn(
                    "p-3 flex items-center space-x-3 cursor-pointer hover:bg-zinc-50",
                    selectedConversation?.id === convo.id && "bg-blue-50"
                  )}
                >
                  <Avatar>
                    <AvatarImage src={convo.meta.sender.thumbnail} alt={convo.meta.sender.name} />
                    <AvatarFallback>{getInitials(convo.meta.sender.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold truncate">{convo.meta.sender.name}</p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(convo.last_activity_at * 1000), { addSuffix: true, locale: vi })}
                        </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {convo.messages[0]?.content || 'Chưa có tin nhắn'}
                    </p>
                  </div>
                </li>
              )) : (
                <p className="p-4 text-sm text-muted-foreground">Không tìm thấy cuộc trò chuyện nào.</p>
              )}
            </ul>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <header className="p-4 border-b flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={selectedConversation.meta.sender.thumbnail} alt={selectedConversation.meta.sender.name} />
                <AvatarFallback>{getInitials(selectedConversation.meta.sender.name)}</AvatarFallback>
              </Avatar>
              <h3 className="font-bold">{selectedConversation.meta.sender.name}</h3>
            </header>
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 space-y-6">
              {loadingMessages ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-12 w-3/4 ml-auto" />
                    <Skeleton className="h-12 w-1/2" />
                </div>
              ) : (
                messages.map(msg => {
                  // Tin nhắn hoạt động (system)
                  if (msg.message_type === 2) {
                    return (
                      <div key={msg.id} className="text-center text-xs text-muted-foreground py-2 italic">
                        {msg.content}
                      </div>
                    );
                  }

                  const isOutgoing = msg.message_type === 1; // 1 = outgoing, 0 = incoming

                  return (
                    <div key={msg.id} className={cn("flex items-start gap-3", isOutgoing && "justify-end")}>
                      {!isOutgoing && (
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.sender?.thumbnail} alt={msg.sender?.name} />
                              <AvatarFallback>{getInitials(msg.sender?.name)}</AvatarFallback>
                          </Avatar>
                      )}
                      <div className={cn("flex flex-col gap-1", isOutgoing ? 'items-end' : 'items-start')}>
                          <div className={cn(
                              "rounded-lg px-3 py-2 max-w-xs md:max-w-md break-words",
                              isOutgoing ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                          )}>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-2">
                                {msg.attachments.map(attachment => (
                                  <div key={attachment.id}>
                                    {attachment.file_type === 'image' && (
                                      <a href={attachment.data_url} target="_blank" rel="noopener noreferrer">
                                        <img src={attachment.data_url} alt="Hình ảnh đính kèm" className="rounded-lg max-w-full h-auto" />
                                      </a>
                                    )}
                                    {attachment.file_type === 'video' && (
                                      <video controls className="rounded-lg max-w-full h-auto">
                                        <source src={attachment.data_url} />
                                        Trình duyệt của bạn không hỗ trợ thẻ video.
                                      </video>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {msg.content && (
                              <p className={cn("whitespace-pre-wrap", msg.attachments && msg.attachments.length > 0 && msg.content ? "mt-2" : "")}>
                                {msg.content}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground px-1">
                              {format(new Date(msg.created_at * 1000), 'MMM d, h:mm a', { locale: vi })}
                          </p>
                      </div>
                       {isOutgoing && (
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.sender?.thumbnail} alt={msg.sender?.name} />
                              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(msg.sender?.name)}</AvatarFallback>
                          </Avatar>
                      )}
                    </div>
                  );
                })
              )}
               {error && (
                 <Alert variant="destructive">
                   <Terminal className="h-4 w-4" />
                   <AlertTitle>Lỗi!</AlertTitle>
                   <AlertDescription>{error}</AlertDescription>
                 </Alert>
               )}
              <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="relative">
                <Input
                  placeholder="Nhập tin nhắn..."
                  className="pr-12"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sendingMessage || loadingMessages}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8"
                  disabled={sendingMessage || loadingMessages || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <p>Vui lòng chọn một cuộc trò chuyện để xem tin nhắn.</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default ChatwootInbox;