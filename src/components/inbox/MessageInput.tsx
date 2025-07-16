import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChatwootLabel } from '@/types/chatwoot';
import { cn } from '@/lib/utils';
import { Paperclip, Image as ImageIcon, SendHorizonal, ThumbsUp, Settings2, FileText, X, Check, Loader2, Bot } from 'lucide-react';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  attachment: File | null;
  setAttachment: (file: File | null) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isSending: boolean;
  isTyping: boolean;
  suggestedLabels: ChatwootLabel[];
  selectedConversationLabels: string[];
  onToggleLabel: (label: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  newMessage, setNewMessage, attachment, setAttachment, onSendMessage, isSending, isTyping,
  suggestedLabels, selectedConversationLabels, onToggleLabel, fileInputRef
}) => {
  return (
    <footer className="p-2 border-t bg-white space-y-2">
      {isTyping && (
        <div className="px-3 py-2 bg-blue-50 rounded-lg flex items-center justify-center gap-2 text-sm text-blue-700 font-medium animate-in fade-in">
          <Bot className="h-4 w-4 animate-pulse" />
          <span>AI đang phân tích và trả lời...</span>
        </div>
      )}
      {attachment && (
        <div className="px-2 py-1.5 bg-slate-100 rounded-lg flex items-center justify-between animate-in fade-in">
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
        {suggestedLabels.map(label => {
          const isApplied = selectedConversationLabels.includes(label.name);
          return (
            <Button key={label.id} variant="outline" size="sm" className={cn("text-xs h-7 transition-all", isApplied && "text-white")}
              style={{ backgroundColor: isApplied ? label.color : `${label.color}20`, borderColor: isApplied ? label.color : `${label.color}50`, color: isApplied ? 'white' : label.color }}
              onClick={() => onToggleLabel(label.name)}>
              {isApplied && <Check className="h-3 w-3 mr-1.5" />}
              {label.name}
            </Button>
          )
        })}
      </div>
      <form onSubmit={onSendMessage} className="relative">
        <Input placeholder="Trả lời..." className="pr-12" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(e); } }}
          disabled={isSending} />
        <Button type="submit" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-9" disabled={isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
        </Button>
      </form>
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center space-x-4 text-muted-foreground">
          <Paperclip className="h-5 w-5 cursor-pointer hover:text-primary" onClick={() => fileInputRef.current?.click()} />
          <ImageIcon className="h-5 w-5 cursor-pointer hover:text-primary" onClick={() => fileInputRef.current?.click()} />
        </div>
        <div className="flex items-center space-x-4 text-muted-foreground">
          <ThumbsUp className="h-5 w-5 cursor-pointer hover:text-primary" />
          <Settings2 className="h-5 w-5 cursor-pointer hover:text-primary" />
        </div>
      </div>
    </footer>
  );
};