import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { TrainingForm, TrainingConfig, initialConfig } from '@/components/TrainingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { PromptConfigurator } from '@/components/PromptConfigurator';
import { Button } from '@/components/ui/button';
import { Eye, Loader2, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TrainingPreview from '@/components/TrainingPreview';

const TrainingModule = ({ config, setConfig, onSave, isSaving }: { config: TrainingConfig, setConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>, onSave: () => void, isSaving: boolean }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const setPromptTemplate = (template: TrainingConfig['promptTemplate']) => {
    setConfig(prev => ({ ...prev, promptTemplate: template }));
  };

  return (
    <>
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm bg-slate-200/75 p-1.5 rounded-xl h-12">
          <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Thông tin Train</TabsTrigger>
          <TabsTrigger value="prompt" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-slate-600 font-semibold text-base transition-all duration-300">Cấu hình Prompt</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <TrainingForm config={config} setConfig={setConfig} />
        </TabsContent>
        <TabsContent value="prompt">
          <PromptConfigurator template={config.promptTemplate} setTemplate={setPromptTemplate} />
        </TabsContent>
      </Tabs>
      <div className="flex justify-end pt-8 gap-3">
        <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="font-semibold rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={onSave} disabled={isSaving} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </Button>
      </div>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl p-6 rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold text-slate-900">Xem trước cấu hình huấn luyện</DialogTitle>
            <DialogDescription className="text-slate-500 pt-1">Đây là tổng quan dữ liệu bạn đã cấu hình. Dữ liệu này sẽ được sử dụng để huấn luyện AI.</DialogDescription>
          </DialogHeader>
          <div className="py-4"><TrainingPreview config={config} /></div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

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
          setConfig({ ...initialConfig, ...data.config });
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
        const { error } = await supabase
            .from('prompt_libraries')
            .update({ config: config, updated_at: new Date().toISOString() })
            .eq('id', libraryId);

        if (error) throw error;

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
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
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
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/training-chatbot">
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
      <TrainingModule
        config={config}
        setConfig={setConfig}
        isSaving={isSaving}
        onSave={handleSave}
      />
    </main>
  );
};

export default PromptLibraryDetail;