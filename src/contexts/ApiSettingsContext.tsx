import { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface ApiSettings {
  apiUrl: string;
  apiKey: string;
  embeddingModelName: string;
  googleGeminiApiKey: string;
  geminiScanModel: string;
  geminiContentModel: string;
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
    embeddingModelName: 'text-embedding-3-small',
    googleGeminiApiKey: '',
    geminiScanModel: 'gemini-pro',
    geminiContentModel: 'gemini-2.5-pro',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_settings')
          .select('api_url, api_key, embedding_model_name, google_gemini_api_key, gemini_scan_model, gemini_content_model')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          throw error;
        }

        if (data) {
          const formattedSettings = {
            apiUrl: data.api_url || '',
            apiKey: data.api_key || '',
            embeddingModelName: data.embedding_model_name || 'text-embedding-3-small',
            googleGeminiApiKey: data.google_gemini_api_key || '',
            geminiScanModel: data.gemini_scan_model || 'gemini-pro',
            geminiContentModel: data.gemini_content_model || 'gemini-2.5-pro',
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