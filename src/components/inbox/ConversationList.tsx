import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ConversationListItem } from './ConversationListItem';
import { FilterPanel } from './FilterPanel';
import { Conversation, ChatwootLabel } from '@/types/chatwoot';

interface ConversationListProps {
  loading: boolean;
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: any;
  setFilters: (filters: any) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  suggestedLabels: ChatwootLabel[];
}

export const ConversationList: React.FC<ConversationListProps> = ({
  loading,
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  isFilterOpen,
  setIsFilterOpen,
  suggestedLabels,
}) => {
  const unreadConversations = conversations.filter(c => c.unread_count > 0);
  const readConversations = conversations.filter(c => !c.unread_count || c.unread_count === 0);

  return (
    <aside className="w-80 border-r flex flex-col">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          suggestedLabels={suggestedLabels}
          conversationCount={conversations.length}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          [...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : (
          <>
            {unreadConversations.length > 0 && (
              <div className="mb-4 p-2 bg-blue-50/50 rounded-lg">
                <h3 className="px-1 pb-1 text-xs font-bold uppercase text-blue-600 tracking-wider">Chưa xem</h3>
                <div className="space-y-1">
                  {unreadConversations.map(convo => (
                    <ConversationListItem key={convo.id} convo={convo} isSelected={selectedConversation?.id === convo.id} onSelect={onSelectConversation} />
                  ))}
                </div>
              </div>
            )}
            {readConversations.length > 0 && (
              <div className="space-y-1">
                {readConversations.map(convo => (
                  <ConversationListItem key={convo.id} convo={convo} isSelected={selectedConversation?.id === convo.id} onSelect={onSelectConversation} />
                ))}
              </div>
            )}
            {conversations.length === 0 && !loading && (
              <p className="p-4 text-sm text-center text-muted-foreground">Không tìm thấy cuộc trò chuyện nào.</p>
            )}
          </>
        )}
      </div>
    </aside>
  );
};