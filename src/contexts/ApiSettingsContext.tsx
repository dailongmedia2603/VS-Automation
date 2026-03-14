import { createContext, useState, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { settingsService, AllSettings } from '@/api/settings';
import { showError } from '@/utils/toast';
import { getAuthToken } from '@/api/client';

// Cache keys
const CACHE_KEYS = {
  API_SETTINGS: 'cached_api_settings',
  ALL_SETTINGS: 'cached_all_settings',
} as const;

interface ApiSettings {
  apiUrl: string;
  apiKey: string;
  embeddingModelName: string;
  geminiScanModel: string;
  geminiContentModel: string;
}

interface ApiSettingsContextType {
  settings: ApiSettings;
  setSettings: (settings: ApiSettings) => void;
  allSettings: AllSettings | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshSettings: () => Promise<void>;
}

const ApiSettingsContext = createContext<ApiSettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: ApiSettings = {
  apiUrl: '',
  apiKey: '',
  embeddingModelName: 'text-embedding-3-small',
  geminiScanModel: 'gemini-2.5-flash',
  geminiContentModel: 'gemini-2.5-pro',
};

// Helper to get cached settings synchronously
const getCachedSettings = (): { settings: ApiSettings; allSettings: AllSettings | null } => {
  try {
    const cachedSettings = localStorage.getItem(CACHE_KEYS.API_SETTINGS);
    const cachedAllSettings = localStorage.getItem(CACHE_KEYS.ALL_SETTINGS);

    return {
      settings: cachedSettings ? JSON.parse(cachedSettings) : DEFAULT_SETTINGS,
      allSettings: cachedAllSettings ? JSON.parse(cachedAllSettings) : null,
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, allSettings: null };
  }
};

// Helper to cache settings
const cacheSettings = (settings: ApiSettings, allSettings: AllSettings | null) => {
  localStorage.setItem(CACHE_KEYS.API_SETTINGS, JSON.stringify(settings));
  if (allSettings) {
    localStorage.setItem(CACHE_KEYS.ALL_SETTINGS, JSON.stringify(allSettings));
  }
};

export const ApiSettingsProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from cache synchronously
  const cached = getCachedSettings();
  const hasToken = !!getAuthToken();

  const [settings, setSettings] = useState<ApiSettings>(cached.settings);
  const [allSettings, setAllSettings] = useState<AllSettings | null>(cached.allSettings);

  // isLoading = true only when authenticated and no cached settings
  const [isLoading, setIsLoading] = useState(hasToken && !cached.allSettings);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSettings = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    try {
      const data = await settingsService.getAll();
      setAllSettings(data);

      if (data.ai_settings) {
        const ai = data.ai_settings;
        const newSettings = {
          apiUrl: ai.troll_llm_api_url || '',
          apiKey: ai.troll_llm_api_key || '',
          embeddingModelName: ai.embedding_model_name || 'text-embedding-3-small',
          geminiScanModel: ai.gemini_scan_model || 'gemini-2.5-flash',
          geminiContentModel: ai.gemini_content_model || 'gemini-2.5-pro',
        };
        setSettings(newSettings);
        // Cache for next time
        cacheSettings(newSettings, data);
      }
    } catch (error: any) {
      // Don't show error if not authenticated
      if (error.response?.status !== 401) {
        showError("Không thể tải cấu hình AI: " + (error.message || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Background refresh - don't block render
    fetchSettings();
  }, [fetchSettings]);

  const value = useMemo(() => ({
    settings,
    setSettings,
    allSettings,
    isLoading,
    isRefreshing,
    refreshSettings: fetchSettings,
  }), [settings, allSettings, isLoading, isRefreshing, fetchSettings]);

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