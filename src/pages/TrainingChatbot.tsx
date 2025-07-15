import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingForm, initialConfig, TrainingConfig } from '@/components/TrainingForm';
import { DocumentTrainer } from '@/components/DocumentTrainer';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const TrainingChatbot = () => {
  const [config, setConfig] = useState<TrainingConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_training_prompts')
        .select('prompt_text')
        .eq('name', 'chatbot_config')
        .single();

      if (error && error.code !== 'PGRST116') {
        showError("Không thể tải cấu hình: " + error.message);
      } else if (data && data.prompt_text) {
        setConfig(JSON.parse(data.prompt_text));
      }
      setIsLoading(false);
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = showLoading("Đang lưu cấu hình...");

    try {
      const configToSave = { ...config };

      const { error } = await supabase
        .from('ai_training_prompts')
        .upsert({
          name: 'chatbot_config',
          prompt_text: JSON.stringify(configToSave),
          is_active: true,
        }, { onConflict: 'name' });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Đã lưu cấu hình thành công!");
    } catch (error: any) {
      dismissToast(toastId);
      showError("Lưu cấu hình thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Đang tải cấu hình...</div>;
  }

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Training Chatbot</h2>
      <Tabs defaultValue="persona">
        <TabsList>
          <TabsTrigger value="persona">Huấn luyện Persona</TabsTrigger>
          <TabsTrigger value="documents">Tài liệu nội bộ</TabsTrigger>
        </TabsList>
        <TabsContent value="persona">
          <TrainingForm config={config} setConfig={setConfig} isSaving={isSaving} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentTrainer />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default TrainingChatbot;