import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiPlanPromptConfig } from '@/components/ai-plan/AiPlanPromptConfig';
import { AiPlanList } from '@/components/ai-plan/AiPlanList';
import { AiPlanDocumentsManager } from '@/components/ai-plan/AiPlanDocumentsManager';

const AiPlan = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'plans';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Plan</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Sử dụng AI để xây dựng và quản lý các kế hoạch marketing cho chiến dịch của bạn.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex justify-start items-center gap-1 p-0 bg-transparent">
          <TabsTrigger value="plans" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Danh sách kế hoạch</TabsTrigger>
          <TabsTrigger value="prompt-config" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Cấu hình Prompt</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Tài liệu</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-6">
          <AiPlanList />
        </TabsContent>
        <TabsContent value="prompt-config" className="mt-6">
          <AiPlanPromptConfig />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <AiPlanDocumentsManager />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default AiPlan;