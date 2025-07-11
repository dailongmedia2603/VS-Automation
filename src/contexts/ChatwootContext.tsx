import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface ChatwootSettings {
  chatwootUrl: string;
  accountId: string;
  inboxId: string;
  apiToken: string;
}

interface ChatwootContextType {
  settings: ChatwootSettings;
  setSettings: (settings: ChatwootSettings) => void;
}

const ChatwootContext = createContext<ChatwootContextType | undefined>(undefined);

const CHATWOOT_SETTINGS_KEY = 'chatwootSettings';

export const ChatwootProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ChatwootSettings>(() => {
    try {
      const savedSettings = localStorage.getItem(CHATWOOT_SETTINGS_KEY);
      if (savedSettings && savedSettings !== 'undefined') {
        const parsed = JSON.parse(savedSettings);
        // Đảm bảo dữ liệu đã parse có cấu trúc đúng
        if (parsed && typeof parsed.chatwootUrl === 'string') {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Không thể tải cài đặt Chatwoot từ localStorage, sẽ xóa dữ liệu lỗi.", error);
      // Nếu có lỗi, xóa dữ liệu không hợp lệ khỏi localStorage
      localStorage.removeItem(CHATWOOT_SETTINGS_KEY);
    }
    
    // Luôn trả về một giá trị mặc định hợp lệ nếu có lỗi hoặc không có dữ liệu
    return {
      chatwootUrl: 'https://app.chatwoot.com',
      accountId: '',
      inboxId: '',
      apiToken: '',
    };
  });

  // Tự động lưu vào localStorage mỗi khi settings thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(CHATWOOT_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Không thể lưu cài đặt Chatwoot vào localStorage", error);
    }
  }, [settings]);

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