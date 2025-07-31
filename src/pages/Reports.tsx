import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiCostReport } from "@/components/reports/AiCostReport";

const Reports = () => {
  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Báo cáo</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Theo dõi và phân tích các chỉ số quan trọng của hệ thống.
        </p>
      </div>
      <Tabs defaultValue="ai-cost">
        <TabsList className="flex justify-start items-center gap-1 p-0 bg-transparent">
          <TabsTrigger value="ai-cost" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            Chi phí AI
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ai-cost" className="mt-4">
          <AiCostReport />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Reports;