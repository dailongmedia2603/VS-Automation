import React from 'react';
import { Conversation } from '@/types/chatwoot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Phone, CornerDownLeft } from 'lucide-react';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

interface ConversationListItemProps {
  convo: Conversation;
  isSelected: boolean;
  onSelect: (convo: Conversation) => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({ convo, isSelected, onSelect }) => {
  const lastMessage = convo.messages?.[0];
  const lastMessageContent = (lastMessage && lastMessage.message_type !== 2) ? (lastMessage.content || '[Media]') : '';
  const isLastMessageIncoming = lastMessage?.message_type === 0;

  return (
    <div onClick={() => onSelect(convo)} className={cn("p-2.5 flex space-x-3 cursor-pointer rounded-lg", isSelected && "bg-blue-100")}>
      <Avatar className="h-12 w-12"><AvatarImage src={convo.meta.sender.thumbnail} /><AvatarFallback>{getInitials(convo.meta.sender.name)}</AvatarFallback></Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <p className="font-semibold truncate text-sm">{convo.meta.sender.name}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(convo.last_activity_at * 1000), 'HH:mm')}</p>
        </div>
        <div className="flex justify-between items-start mt-1">
          <p className={cn("text-sm truncate flex items-center", convo.unread_count > 0 ? "text-black font-bold" : isLastMessageIncoming ? "text-red-600" : "text-muted-foreground")}>
            {!isLastMessageIncoming && <CornerDownLeft className="h-4 w-4 mr-1 flex-shrink-0" />}
            {lastMessageContent}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {convo.meta.sender.phone_number && <Phone className="h-4 w-4 text-green-600" strokeWidth={2} />}
            {convo.unread_count > 0 && <Badge variant="destructive">{convo.unread_count}</Badge>}
          </div>
        </div>
        {convo.labels && convo.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {convo.labels.map(labelName => (
              <Badge key={labelName} variant="outline" className="text-xs font-normal px-2 py-0.5">{labelName}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};