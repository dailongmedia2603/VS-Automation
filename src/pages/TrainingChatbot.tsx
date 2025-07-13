import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { TrainingForm, TrainingConfig, initialConfig } from '@/components/TrainingForm';
import { Skeleton } from '@/components/ui/skeleton';

const TrainingChatbot = () => {
  const [autoReplyConfig, setAutoReplyConfig] = useState<TrainingConfig>(initialConfig);
  const [careScriptConfig, setCareScriptConfig] = useState<TrainingConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_training_prompts')
        .select('name, prompt_text')
        .in('name', ['auto_reply', 'care_script_suggestion']);

      if (error) {
        showError("Không thể tải dữ liệu huấn luyện: " + error.message);
      } else if (data) {
        data.forEach(prompt => {
          let config = initialConfig;
          if (prompt.prompt_text) {
            try {
              const parsedConfig = JSON.parse(prompt.prompt_text);
              if (typeof parsedConfig === 'object' && parsedConfig !== null && 'industry' in parsedConfig) {
                config = { ...initialConfig, ...parsedConfig };
              }
            } catch (e) {
              console.error(`Failed to parse config for ${prompt.name}:`, e);
            }
          }
          if (prompt.name === 'auto_reply') {
            setAutoReplyConfig(config);
          } else if (prompt.name === 'care_script_suggestion') {
            setCareScriptConfig(config);
          }
        });
      }
      setIsLoading(false);
    };
    fetchPrompts();
  }, []);

  const handleSave = async (name: 'auto_reply' | 'care_script_suggestion') => {
    const configToSave = name === 'auto_reply' ? autoReplyConfig : careScriptConfig;
    
    const sanitizedConfig = {
      ...configToSave,
      documents: configToSave.documents.map(({ file, ...doc }) => doc),
    };

    const prompt_text = JSON.stringify(sanitizedConfig);

    setIsSaving(prev => ({ ...prev, [name]: true }));
    const { error } = await supabase
      .from('ai_training_prompts')
      .update({ prompt_text })
      .eq('name', name);
    
    if (error) {
      showError(`Lưu thất bại: ${error.message}`);
    } else {
      showSuccess("Đã lưu thay đổi!");
    }
    setIsSaving(prev => ({ ...prev, [name]: false }));
  };

  if (isLoading) {
    return (
      <main className="flex-1 space-y-6 p-6 sm:p-8 bg-slate-50">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Training Chatbot</h1>
        <p className="text-slate-500 mt-1">
          Dạy cho AI cách trả lời và tương tác trong các tình huống cụ thể.
        </p>
      </div>
      <Tabs defaultValue="auto_reply" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm bg-slate-100 p-1 rounded-xl h-11">
          <TabsTrigger value="auto_reply" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600 font-medium">Tự động trả lời</TabsTrigger>
          <TabsTrigger value="care_script_suggestion" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-600 font-medium">Kịch bản chăm sóc</TabsTrigger>
        </TabsList>
        <TabsContent value="auto_reply">
          <TrainingForm
            config={autoReplyConfig}
            setConfig={setAutoReplyConfig}
            isSaving={!!isSaving['auto_reply']}
            onSave={() => handleSave('auto_reply')}
          />
        </TabsContent>
        <TabsContent value="care_script_suggestion">
          <TrainingForm
            config={careScriptConfig}
            setConfig={setCareScriptConfig}
            isSaving={!!isSaving['care_script_suggestion']}
            onSave={() => handleSave('care_script_suggestion')}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default TrainingChatbot;