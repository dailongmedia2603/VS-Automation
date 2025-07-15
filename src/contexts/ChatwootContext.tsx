import { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface ChatwootSettings {
  id?: number;
  chatwootUrl: string;
  accountId: string;
  inboxId: string;
  apiToken: string;
}

interface ChatwootContextType {
  settings: ChatwootSettings;
  setSettings: (settings: ChatwootSettings) => void;
  isLoading: boolean;
}

const ChatwootContext = createContext<ChatwootContextType | undefined>(undefined);

export const ChatwootProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ChatwootSettings>({
    chatwootUrl: 'https://app.chatwoot.com',
    accountId: '',
    inboxId: '',
    apiToken: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // Chúng ta chỉ có một dòng cài đặt, với id = 1
        const { data, error } = await supabase
          .from('chatwoot_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          throw error;
        }

        if (data) {
          // SỬA LỖI: Ánh xạ từ snake_case (DB) sang camelCase (JS) khi tải dữ liệu
          const formattedSettings = {
            id: data.id,
            chatwootUrl: data.chatwoot_url || '',
            accountId: data.account_id || '',
            inboxId: data.inbox_id || '',
            apiToken: data.api_token || '',
          };
          setSettings(formattedSettings);
        }
      } catch (error: any) {
        showError("Không thể tải cấu hình Chatwoot: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const value = useMemo(() => ({ settings, setSettings, isLoading }), [settings, isLoading]);

  return (
    <ChatwootContext.Provider value={value}>
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