import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { TrainingForm, TrainingConfig, initialConfig } from '@/components/TrainingForm';
import { DocumentTrainer } from '@/components/DocumentTrainer';
import { Skeleton } from '@/components/ui/skeleton';

const TrainingChatbot = () => {
  const [autoReplyConfig, setAutoReplyConfig] = useState<TrainingConfig>(initialConfig);
  const [careScriptConfig, setCareScriptConfig] = useState<TrainingConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      try {
        const [autoReplyRes, careScriptRes] = await Promise.all([
          supabase.from('auto_reply_settings').select('config').eq('id', 1).single(),
          supabase.from('care_script_settings').select('config').eq('id', 1).single()
        ]);

        if (autoReplyRes.data?.config && typeof autoReplyRes.data.config === 'object') {
          setAutoReplyConfig({ ...initialConfig, ...autoReplyRes.data.config });
        }
        if (careScriptRes.data?.config && typeof careScriptRes.data.config === 'object') {
          setCareScriptConfig({ ...initialConfig, ...careScriptRes.data.config });
        }
      } catch (error: any) {
        if (error.code !== 'PGRST116') {
          showError("Không thể tải dữ liệu huấn luyện: " + error.message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  const handleSave = async (name: 'auto_reply' | 'care_script_suggestion') => {
    const configToSave = name === 'auto_reply' ? autoReplyConfig : careScriptConfig;
    const setConfig = name === 'auto_reply' ? setAutoReplyConfig : setCareScriptConfig;
    const tableName = name === 'auto_reply' ? 'auto_reply_settings' : 'care_script_settings';

    setIsSaving(prev => ({ ...prev, [name]: true }));
    const toastId = showLoading("Đang lưu và tải lên tài liệu...");

    try {
        const documentsWithUrls = await Promise.all(
            configToSave.documents.map(async (doc) => {
                if (doc.file && !doc.url) { // New file to upload
                    const sanitizedName = doc.file.name
                        .normalize("NFD") // Decompose accented characters
                        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
                        .replace(/\s+/g, '_') // Replace spaces with underscores
                        .replace(/[^\w.-_]/g, ''); // Remove any remaining non-word characters except dot, hyphen, underscore

                    const filePath = `public/${doc.id}-${sanitizedName}`;
                    const { error: uploadError } = await supabase.storage
                        .from('training_documents')
                        .upload(filePath, doc.file, { upsert: true });

                    if (uploadError) {
                        throw new Error(`Lỗi tải lên tệp ${doc.name}: ${uploadError.message}`);
                    }

                    const { data: urlData } = supabase.storage.from('training_documents').getPublicUrl(filePath);
                    return { ...doc, url: urlData.publicUrl, file: undefined };
                }
                return { ...doc, file: undefined }; // Return existing doc, ensuring file object is removed
            })
        );

        const finalConfig = { ...configToSave, documents: documentsWithUrls };

        const { error } = await supabase
            .from(tableName)
            .upsert({ id: 1, config: finalConfig });

        if (error) {
            throw new Error(`Lưu cấu hình thất bại: ${error.message}`);
        }

        setConfig(finalConfig);

        dismissToast(toastId);
        showSuccess("Đã lưu thay đổi thành công!");
    } catch (error: any) {
        dismissToast(toastId);
        showError(error.message);
    } finally {
        setIsSaving(prev => ({ ...prev, [name]: false }));
    }
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
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-slate-200/75 p-1.5 rounded-xl h-12">
          <TabsTrigger value="auto_reply" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Tự động trả lời</TabsTrigger>
          <TabsTrigger value="care_script_suggestion" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Kịch bản chăm sóc</TabsTrigger>
          <TabsTrigger value="internal_docs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Tài liệu nội bộ</TabsTrigger>
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
        <TabsContent value="internal_docs">
          <DocumentTrainer />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default TrainingChatbot;