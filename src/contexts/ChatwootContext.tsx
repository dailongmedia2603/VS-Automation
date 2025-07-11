import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ChatwootSettings {
  chatwootUrl: string;
  accountId: string;
  inboxId: string;
  apiToken: string; // Lưu ý: Chỉ lưu ở client-side, không commit
}

interface ChatwootContextType {
  settings: ChatwootSettings;
  setSettings: (settings: ChatwootSettings) => void;
}

const ChatwootContext = createContext<ChatwootContextType | undefined>(undefined);

export const ChatwootProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ChatwootSettings>({
    chatwootUrl: 'https://app.chatwoot.com',
    accountId: '',
    inboxId: '',
    apiToken: '',
  });

  return (
    <ChatwootContext.Provider value={{ settings, setSettings }}>
      {children}
    </ChatwootContext.Provider>
  );
};

export const useChatwoot = () => {
  const context = useContext(ChatwootContext);
  if (context === undefined) {
    throw new Error('useChatwoot must be used within a ChatwootProvider');
  }
  return context;
};