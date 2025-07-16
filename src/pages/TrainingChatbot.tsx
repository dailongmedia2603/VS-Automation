import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrainingForm, initialConfig, type TrainingConfig } from '@/components/TrainingForm';
import { PromptEditor } from '@/components/PromptEditor';
import { cn } from '@/lib/utils';
import { Save, BrainCircuit, MessageSquare, BookOpen, Zap } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';
import { DocumentManager } from '@/components/DocumentManager';
import { KeywordActionManager } from '@/components/KeywordActionManager';

type MainTab = 'auto_reply' | 'care_script' | 'documents' | 'keyword_actions';
type SubTab = 'training_info' | 'prompt_config';

const TrainingChatbot = () => {
  const [mainTab, setMainTab] = useState<MainTab>('auto_reply');
  const [subTab, setSubTab] = useState<SubTab>('training_info');
  const [config, setConfig] = useState<TrainingConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('auto_reply_settings')
        .select('config')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'not found' error
        showError('Không thể tải cấu hình: ' + error.message);
      } else if (data) {
        setConfig(data.config as TrainingConfig);
      }
      setIsLoading(false);
    };

    fetchConfig();
  }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('auto_reply_settings')
      .upsert({ id: 1, config: config });

    if (error) {
      showError('Lưu cấu hình thất bại: ' + error.message);
    } else {
      showSuccess('Đã lưu tất cả thay đổi thành công!');
    }
    setIsSaving(false);
  };

  const mainTabs = [
    { id: 'auto_reply', label: 'Tự động trả lời', icon: BrainCircuit },
    { id: 'care_script', label: 'Kịch bản chăm sóc', icon: MessageSquare, disabled: true },
    { id: 'documents', label: 'Tài liệu nội bộ', icon: BookOpen },
    { id: 'keyword_actions', label: 'Hành động theo từ khoá', icon: Zap },
  ];

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Chatbot</h1>
          <p className="mt-2 text-muted-foreground">
            Dạy cho AI cách trả lời và tương tác trong các tình huống cụ thể. Cung cấp càng nhiều thông tin chi tiết, AI sẽ càng hoạt động hiệu quả và phù hợp với doanh nghiệp của bạn.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={handleSaveAll} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-slate-100/80 p-1.5 rounded-xl flex items-center space-x-2 max-w-max">
        {mainTabs.map(tab => (
          <Button
            key={tab.id}
            variant={mainTab === tab.id ? 'default' : 'ghost'}
            onClick={() => !tab.disabled && setMainTab(tab.id as MainTab)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              mainTab === tab.id
                ? 'bg-white text-primary shadow-sm hover:bg-white'
                : 'text-slate-600 hover:bg-slate-200/70',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={tab.disabled}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Sub Tabs for Auto Reply */}
      {mainTab === 'auto_reply' && (
        <div className="flex items-center space-x-2 border-b pb-2">
          <Button
            variant={subTab === 'training_info' ? 'default' : 'ghost'}
            onClick={() => setSubTab('training_info')}
            className={cn(
              "font-semibold rounded-lg",
              subTab === 'training_info' && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            Thông tin Train
          </Button>
          <Button
            variant={subTab === 'prompt_config' ? 'default' : 'ghost'}
            onClick={() => setSubTab('prompt_config')}
            className={cn(
              "font-semibold rounded-lg",
              subTab === 'prompt_config' && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            Cấu hình Prompt
          </Button>
        </div>
      )}

      {isLoading && <p>Đang tải cấu hình...</p>}

      {!isLoading && mainTab === 'auto_reply' && (
        <>
          {subTab === 'training_info' && <TrainingForm config={config} setConfig={setConfig} />}
          {subTab === 'prompt_config' && <PromptEditor config={config} setConfig={setConfig} />}
        </>
      )}

      {!isLoading && mainTab === 'documents' && (
        <DocumentManager settings={settings} />
      )}
      
      {!isLoading && mainTab === 'keyword_actions' && (
        <KeywordActionManager />
      )}

    </main>
  );
};

export default TrainingChatbot;