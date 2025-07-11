import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ApiSettingsContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ApiSettingsContext = createContext<ApiSettingsContextType | undefined>(undefined);

export const ApiSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [apiUrl, setApiUrl] = useState('https://multiappai-api.itmovnteam.com/api/v1/chat/completions');
  const [apiKey, setApiKey] = useState('sk-EWcoOk8zZtfGel2Utawq3Y09Wrf9m6A3u1XzvtafHDaEPJhX');

  return (
    <ApiSettingsContext.Provider value={{ apiUrl, setApiUrl, apiKey, setApiKey }}>
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