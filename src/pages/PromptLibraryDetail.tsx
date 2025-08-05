import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { TrainingForm, TrainingConfig, initialConfig } from '@/components/TrainingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

const PromptLibraryDetail = () => {
  const { libraryId } = useParams<{ libraryId: string }>();
  const [libraryName, setLibraryName] = useState('');
  const [config, setConfig] = useState<TrainingConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPromptLibrary = async () => {
      if (!libraryId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('prompt_libraries')
          .select('name, config')
          .eq('id', libraryId)
          .single();

        if (error) throw error;

        setLibraryName(data.name);
        if (data.config && typeof data.config === 'object') {
          const loadedConfig = { ...initialConfig, ...data.config };
          // If the saved value is invalid (too high), reset it to the new safe default.
          if (loadedConfig.maxTokens > 8192) {
            loadedConfig.maxTokens = 8192;
          }
          setConfig(loadedConfig);
        } else {
          setConfig(initialConfig);
        }
      } catch (error: any) {
        showError("Không thể tải dữ liệu thư viện: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPromptLibrary();
  }, [libraryId]);

  const handleSave = async () => {
    if (!libraryId) return;
    setIsSaving(true);
    const toastId = showLoading("Đang lưu cấu hình...");

    try {
        const { data, error } = await supabase
            .from('prompt_libraries')
            .update({ config: config, updated_at: new Date().toISOString() })
            .eq('id', libraryId)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error("Không thể cập nhật thư viện. Có thể bạn không có quyền chỉnh sửa hoặc thư viện không tồn tại.");

        dismissToast(toastId);
        showSuccess("Đã lưu thay đổi thành công!");
    } catch (error: any) {
        dismissToast(toastId);
        showError(`Lưu cấu hình thất bại: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50 overflow-y-auto">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/3 rounded-lg" />
          <Skeleton className="h-5 w-1/2 rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full max-w-md rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50 overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link to="/training-chatbot?tab=prompts">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{libraryName}</h1>
          <p className="text-muted-foreground mt-1">
            Cấu hình chi tiết cho thư viện prompt này.
          </p>
        </div>
      </div>
      <TrainingForm
        config={config}
        setConfig={setConfig}
      />
       <div className="flex justify-end pt-8 gap-3">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </Button>
      </div>
    </main>
  );
};

export default PromptLibraryDetail;