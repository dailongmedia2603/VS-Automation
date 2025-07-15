import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { showSuccess } from '@/utils/toast';

// Định nghĩa cấu trúc cho các cài đặt
interface AppSettings {
  openaiApiKey: string;
  gptModel: string;
  // Thêm các cài đặt khác của Chatwoot nếu cần
  chatwootApiUrl?: string;
  chatwootApiToken?: string;
  inboxId?: string;
}

// Định nghĩa kiểu cho Context
interface SettingsContextType {
  settings: AppSettings;
  saveSettings: (newSettings: Partial<AppSettings>) => void;
  isSettingsLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider để bao bọc ứng dụng
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>({
    openaiApiKey: '',
    gptModel: 'gpt-4o', // Đặt gpt-4o làm mô hình mặc định mới
  });
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Tải cài đặt từ localStorage khi component được mount
  useEffect(() => {
    try {
      const loadedSettings = localStorage.getItem('app-settings');
      if (loadedSettings) {
        const parsedSettings = JSON.parse(loadedSettings);
        // Đảm bảo gptModel có giá trị mặc định là 'gpt-4o' nếu chưa được thiết lập
        if (!parsedSettings.gptModel) {
          parsedSettings.gptModel = 'gpt-4o';
        }
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
    setIsSettingsLoaded(true);
  }, []);

  // Hàm để lưu cài đặt
  const saveSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      localStorage.setItem('app-settings', JSON.stringify(updatedSettings));
      showSuccess("Đã lưu cài đặt thành công!");
      return updatedSettings;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, isSettingsLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook tùy chỉnh để dễ dàng sử dụng context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};