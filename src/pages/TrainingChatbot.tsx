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
                // Ensure all fields from initialConfig are present
                config = { 
                  ...initialConfig, 
                  ...parsedConfig,
                  products: parsedConfig.products || [],
                  processSteps: parsedConfig.processSteps || [],
                  conditions: parsedConfig.conditions || [],
                  documents: parsedConfig.documents || [],
                };
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
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/3 rounded-lg" />
          <Skeleton className="h-5 w-1/2 rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full max-w-md rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Training Chatbot</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Dạy cho AI cách trả lời và tương tác trong các tình huống cụ thể. Cung cấp càng nhiều thông tin chi tiết, AI sẽ càng hoạt động hiệu quả và phù hợp với doanh nghiệp của bạn.
        </p>
      </div>
      <Tabs defaultValue="auto_reply" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-200/75 p-1.5 rounded-xl h-12">
          <TabsTrigger value="auto_reply" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Tự động trả lời</TabsTrigger>
          <TabsTrigger value="care_script_suggestion" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Kịch bản chăm sóc</TabsTrigger>
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