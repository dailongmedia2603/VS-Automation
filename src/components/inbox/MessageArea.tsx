import React, { useMemo } from 'react';
import { Message } from '@/types/chatwoot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Bot } from 'lucide-react';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

interface MessageAreaProps {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageArea: React.FC<MessageAreaProps> = ({ messages, isLoading, isTyping, messagesEndRef }) => {
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

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="space-y-2">
        {isLoading ? <p>Đang tải...</p> : groupedMessages.map((item, index) => {
          if (item.type === 'date') {
            return <div key={index} className="text-center my-4"><span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">{item.date}</span></div>;
          }
          const msg = item.data;
          if (msg.private) return null;
          const isOutgoing = msg.message_type === 1;
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
        {isTyping && (
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-5 w-5 text-blue-600" /></AvatarFallback></Avatar>
            <div className="rounded-2xl px-3 py-2 max-w-sm md:max-w-md break-words shadow-sm bg-white text-gray-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-0"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-400"></span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};