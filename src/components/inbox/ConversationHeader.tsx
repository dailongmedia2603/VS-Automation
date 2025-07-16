import React from 'react';
import { Conversation } from '@/types/chatwoot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { AiLogViewer } from '@/components/AiLogViewer';
import { cn } from '@/lib/utils';
import { Eye, RefreshCw, Bot } from 'lucide-react';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

interface ConversationHeaderProps {
  conversation: Conversation;
  onRefresh: () => void;
  isLoading: boolean;
  hasNewLog: boolean;
  setHasNewLog: (hasNewLog: boolean) => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onRefresh,
  isLoading,
  hasNewLog,
  setHasNewLog,
}) => {
  return (
    <header className="p-3 border-b bg-white flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarImage src={conversation.meta.sender.thumbnail} />
          <AvatarFallback>{getInitials(conversation.meta.sender.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold">{conversation.meta.sender.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center">
            <Eye className="h-3 w-3 mr-1" />
            Chưa có người xem
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Popover onOpenChange={(open) => { if (open) setHasNewLog(false); }}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8", hasNewLog && "bg-green-100 text-green-800 animate-glow-green border-green-300")}>
              <Bot className="h-4 w-4 mr-2" />
              Log AI
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0">
            <AiLogViewer conversationId={conversation.id} />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </Button>
      </div>
    </header>
  );
};