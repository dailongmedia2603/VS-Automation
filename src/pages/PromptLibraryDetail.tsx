import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePromptLibrary, useUpdatePromptLibrary } from '@/hooks/useLibraries';
import { TrainingForm, TrainingConfig, initialConfig } from '@/components/TrainingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

const PromptLibraryDetail = () => {
  const { libraryId } = useParams<{ libraryId: string }>();

  // React Query - data loads instantly from cache
  const { data: library, isLoading } = usePromptLibrary(Number(libraryId));
  const updateLibrary = useUpdatePromptLibrary();

  // Initialize config from library data
  const initialConfigFromLibrary = useMemo(() => {
    if (!library?.config) return initialConfig;
    const loadedConfig = { ...initialConfig, ...library.config };
    // If the saved value is invalid (too high), reset it to the new safe default.
    if (loadedConfig.maxTokens > 8192) {
      loadedConfig.maxTokens = 8192;
    }
    return loadedConfig;
  }, [library]);

  const [config, setConfig] = useState<TrainingConfig>(initialConfigFromLibrary);

  // Update config when library loads
  useMemo(() => {
    if (library?.config) {
      const loadedConfig = { ...initialConfig, ...library.config };
      if (loadedConfig.maxTokens > 8192) {
        loadedConfig.maxTokens = 8192;
      }
      setConfig(loadedConfig);
    }
  }, [library]);

  const handleSave = async () => {
    if (!libraryId) return;
    await updateLibrary.mutateAsync({ id: Number(libraryId), data: { config } });
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

  if (!library) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <h1 className="text-3xl font-bold">Không tìm thấy thư viện</h1>
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{library.name}</h1>
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
        <Button onClick={handleSave} disabled={updateLibrary.isPending} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
          {updateLibrary.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </Button>
      </div>
    </main>
  );
};

export default PromptLibraryDetail;