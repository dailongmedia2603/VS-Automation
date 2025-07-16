import React from 'react';
import { useChatwootInbox } from '@/hooks/useChatwootInbox';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ConversationHeader } from '@/components/inbox/ConversationHeader';
import { MessageArea } from '@/components/inbox/MessageArea';
import { MessageInput } from '@/components/inbox/MessageInput';
import { ChatwootContactPanel } from '@/components/ChatwootContactPanel';

const ChatwootInbox = () => {
  const {
    conversations, loadingConversations, selectedConversation, messages, loadingMessages,
    newMessage, attachment, sendingMessage, searchQuery, suggestedLabels, scripts,
    isFilterOpen, filters, aiTypingStatus, hasNewLog,
    setNewMessage, setAttachment, setSearchQuery, setIsFilterOpen, setFilters, setHasNewLog,
    handleSelectConversation, handleSendMessage, handleToggleLabel, handleNewNote, handleConversationUpdate,
    fetchCareScripts,
    messagesEndRef, fileInputRef,
    filteredConversations,
  } = useChatwootInbox();

  return (
    <div className="flex h-full bg-white border-t">
      <ConversationList
        loading={loadingConversations}
        conversations={filteredConversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filters={filters}
        setFilters={setFilters}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        suggestedLabels={suggestedLabels}
      />
      <section className="flex-1 flex flex-col bg-slate-50">
        {selectedConversation ? (
          <>
            <ConversationHeader
              conversation={selectedConversation}
              onRefresh={() => handleSelectConversation(selectedConversation)}
              isLoading={loadingMessages}
              hasNewLog={hasNewLog}
              setHasNewLog={setHasNewLog}
            />
            <MessageArea
              messages={messages}
              isLoading={loadingMessages}
              isTyping={aiTypingStatus[selectedConversation.id] || false}
              messagesEndRef={messagesEndRef}
            />
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              attachment={attachment}
              setAttachment={setAttachment}
              onSendMessage={handleSendMessage}
              isSending={sendingMessage}
              isTyping={aiTypingStatus[selectedConversation.id] || false}
              suggestedLabels={suggestedLabels}
              selectedConversationLabels={selectedConversation.labels || []}
              onToggleLabel={handleToggleLabel}
              fileInputRef={fileInputRef}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <p>Vui lòng chọn một cuộc trò chuyện để xem tin nhắn.</p>
          </div>
        )}
      </section>
      <ChatwootContactPanel
        selectedConversation={selectedConversation}
        messages={messages}
        onNewNote={handleNewNote}
        scripts={scripts}
        fetchCareScripts={fetchCareScripts}
        onConversationUpdate={handleConversationUpdate}
      />
    </div>
  );
};

export default ChatwootInbox;