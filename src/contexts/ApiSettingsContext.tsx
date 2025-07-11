import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ApiSettingsContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const ApiSettingsContext = createContext<ApiSettingsContextType | undefined>(undefined);

export const ApiSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [apiUrl, setApiUrl] = useState('https://multiappai-api.itmovnteam.com/api/v1/chat/completions');

  return (
    <ApiSettingsContext.Provider value={{ apiUrl, setApiUrl }}>
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