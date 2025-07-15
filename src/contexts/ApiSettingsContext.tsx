import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface ApiSettings {
  apiUrl: string;
  apiKey: string;
  embeddingModelName: string;
  openaiApiUrl: string;
  openaiApiKey: string;
  openaiEmbeddingModel: string;
}

interface ApiSettingsContextType {
  settings: ApiSettings;
  setSettings: (settings: ApiSettings) => void;
  isLoading: boolean;
}

const ApiSettingsContext = createContext<ApiSettingsContextType | undefined>(undefined);

export const ApiSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ApiSettings>({
    apiUrl: '',
    apiKey: '',
    embeddingModelName: '',
    openaiApiUrl: 'https://api.openai.com/v1',
    openaiApiKey: '',
    openaiEmbeddingModel: 'text-embedding-3-small',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          throw error;
        }

        if (data) {
          const formattedSettings = {
            apiUrl: data.api_url || '',
            apiKey: data.api_key || '',
            embeddingModelName: data.embedding_model_name || '',
            openaiApiUrl: data.openai_api_url || 'https://api.openai.com/v1',
            openaiApiKey: data.openai_api_key || '',
            openaiEmbeddingModel: data.openai_embedding_model || 'text-embedding-3-small',
          };
          setSettings(formattedSettings);
        }
      } catch (error: any) {
        showError("Không thể tải cấu hình AI: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const value = useMemo(() => ({ settings, setSettings, isLoading }), [settings, isLoading]);

  return (
    <ApiSettingsContext.Provider value={value}>
      {children}
    </ApiSettingsContext.Provider>
  );
};

export const useApiSettings = () => {
  const context = useContext(ApiSettingsContext);
  if (context === undefined) {
    throw new Error('useApiSettings must be used within an ApiSettingsProvider');
  }
  return context;
};