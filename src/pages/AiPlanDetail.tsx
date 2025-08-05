import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Save, Loader2, FileText, Share, Settings2, PencilLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AiPlanLogDialog } from '@/components/ai-plan/AiPlanLogDialog';
import { AiPlanContentView } from '@/components/ai-plan/AiPlanContentView';
import { SharePlanDialog } from '@/components/ai-plan/SharePlanDialog';
import { InputConfigDialog, type InputField } from '@/components/ai-plan/InputConfigDialog';

type Plan = {
  id: number;
  name: string;
  config: any;
  plan_data: any;
  is_public: boolean;
  public_id: string | null;
  template_id: number | null;
};

type Log = {
  id: number;
  created_at: string;
  prompt: string;
  response: any;
};

type OutputStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
}[];

type TemplateStructure = {
  input_fields: InputField[];
  output_fields: OutputStructure;
};

const AiPlanDetail = () => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [inputStructure, setInputStructure] = useState<InputField[]>([]);
  const [outputStructure, setOutputStructure] = useState<OutputStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isInputConfigOpen, setIsInputConfigOpen] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;
      setIsLoading(true);
      try {
        let { data, error } = await supabase
          .from('ai_plans')
          .select('*')
          .eq('id', planId)
          .single();
        if (error) throw error;

        // If template_id is null, assign a default and update the plan
        if (!data.template_id) {
          const { data: updatedPlan, error: updateError } = await supabase
            .from('ai_plans')
            .update({ template_id: 1 }) // Default template ID is 1
            .eq('id', planId)
            .select('*')
            .single();
          if (updateError) throw updateError;
          data = updatedPlan; // Use the updated plan data
        }
        
        setPlan(data);

        const templateId = data.template_id;
        const { data: templateData, error: templateError } = await supabase
          .from('ai_plan_templates')
          .select('structure')
          .eq('id', templateId)
          .single();
        
        if (templateError) throw templateError;

        if (templateData.structure && typeof templateData.structure === 'object' && !Array.isArray(templateData.structure)) {
          const structure = templateData.structure as TemplateStructure;
          setInputStructure(structure.input_fields || []);
          setOutputStructure(structure.output_fields || []);
        } else {
          setInputStructure([]);
          setOutputStructure((templateData.structure as OutputStructure) || []);
        }

      } catch (error: any) {
        showError("Không thể tải kế hoạch: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const fetchLogs = async () => {
    if (!planId) return;
    setIsLoadingLogs(true);
    const { data, error } = await supabase
        .from('ai_plan_logs')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });
    
    if (error) {
        showError("Không thể tải lịch sử log: " + error.message);
    } else {
        setLogs(data || []);
    }
    setIsLoadingLogs(false);
  };

  const handleOpenLogDialog = () => {
      fetchLogs();
      setIsLogOpen(true);
  };

  const handleConfigChange = (field: string, value: any) => {
    setPlan(prev => prev ? { ...prev, config: { ...prev.config, [field]: value } } : null);
  };

  const handleSaveConfig = async () => {
    if (!plan) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('ai_plans')
      .update({ config: plan.config, updated_at: new Date().toISOString() })
      .eq('id', plan.id);
    
    if (error) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu cấu hình!");
    }
    setIsSaving(false);
  };

  const handleGeneratePlan = async () => {
    if (!plan) return;
    setIsGenerating(true);
    const toastId = showLoading("AI đang xây dựng kế hoạch...");
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-plan', {
        body: { planId: plan.id, config: plan.config }
      });

      if (error) {
        const errorBody = await error.context.json();
        throw new Error(errorBody.error || error.message);
      }
      if (data.error) throw new Error(data.error);

      setPlan(data);
      dismissToast(toastId);
      showSuccess("AI đã tạo kế hoạch thành công!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Tạo kế hoạch thất bại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlanUpdate = (updates: Partial<Plan>) => {
    setPlan(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleInputConfigSuccess = (newFields: InputField[]) => {
    setInputStructure(newFields);
  };

  if (isLoading) {
    return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><Skeleton className="h-full w-full" /></main>;
  }

  if (!plan) {
    return <main className="flex-1 p-6 sm:p-8 bg-slate-50">Không tìm thấy kế hoạch.</main>;
  }

  return (
    <>
      <main className="flex-1 flex flex-col p-6 sm:p-8 bg-slate-50 min-h-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/ai-plan">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{plan.name}</h1>
              <p className="text-muted-foreground mt-1">
                Cung cấp thông tin để AI xây dựng kế hoạch marketing chi tiết cho bạn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsShareDialogOpen(true)} className="bg-white">
              <Share className="mr-2 h-4 w-4" />
              Chia sẻ
            </Button>
            <Button variant="outline" onClick={handleOpenLogDialog} className="bg-white">
              <FileText className="mr-2 h-4 w-4" />
              Log AI
            </Button>
            <Button variant="outline" onClick={handleSaveConfig} disabled={isSaving} className="bg-white">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lưu cấu hình
            </Button>
            <Button onClick={handleGeneratePlan} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Tạo kế hoạch
            </Button>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full p-4 overflow-y-auto">
              <Card className="border-none shadow-none">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Thông tin đầu vào</CardTitle>
                      <CardDescription>Nhập thông tin chi tiết về chiến dịch của bạn.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsInputConfigOpen(true)}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      Cấu hình đầu vào
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inputStructure.map(field => (
                    <div key={field.id} className="border rounded-xl overflow-hidden bg-white">
                      <div className="p-3 bg-slate-50 border-b flex items-center gap-3">
                        <PencilLine className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <Label className="text-base font-semibold text-slate-800">{field.label}</Label>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        {field.description && (
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                        )}
                        {field.type === 'textarea' ? (
                          <Textarea 
                            value={plan.config?.[field.id] || ''} 
                            onChange={e => handleConfigChange(field.id, e.target.value)} 
                            className="min-h-[120px] bg-white"
                          />
                        ) : (
                          <Input 
                            value={plan.config?.[field.id] || ''} 
                            onChange={e => handleConfigChange(field.id, e.target.value)} 
                            className="bg-white"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {inputStructure.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Chưa có trường đầu vào nào được cấu hình.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <div className="h-full bg-slate-50 p-6 overflow-y-auto">
              <AiPlanContentView planData={plan.plan_data} planStructure={outputStructure!} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      {plan && (
        <SharePlanDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          plan={plan}
          onPlanUpdate={handlePlanUpdate}
        />
      )}
      <AiPlanLogDialog
        isOpen={isLogOpen}
        onOpenChange={setIsLogOpen}
        logs={logs}
        isLoading={isLoadingLogs}
      />
      <InputConfigDialog
        isOpen={isInputConfigOpen}
        onOpenChange={setIsInputConfigOpen}
        initialFields={inputStructure}
        templateId={plan.template_id!}
        outputStructure={outputStructure}
        onSuccess={handleInputConfigSuccess}
      />
    </>
  );
};

export default AiPlanDetail;