import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Save, Loader2, FileText, Users, Target, DollarSign, Calendar, MessageSquare, Share, BarChart2 } from 'lucide-react';
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

type Plan = {
  id: number;
  name: string;
  config: any;
  plan_data: any;
  is_public: boolean;
  public_id: string | null;
};

type Log = {
  id: number;
  created_at: string;
  prompt: string;
  response: any;
};

const AiPlanDetail = () => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_plans')
          .select('*')
          .eq('id', planId)
          .single();
        if (error) throw error;
        setPlan(data);
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
                  <CardTitle>Cấu hình AI</CardTitle>
                  <CardDescription>Nhập thông tin chi tiết về chiến dịch của bạn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FileText className="h-4 w-4" />Mô tả sản phẩm/dịch vụ</Label>
                    <Textarea placeholder="VD: Một ứng dụng quản lý công việc..." value={plan.config?.productDescription || ''} onChange={e => handleConfigChange('productDescription', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Users className="h-4 w-4" />Đối tượng khách hàng mục tiêu</Label>
                    <Textarea placeholder="VD: Nhân viên văn phòng, 25-35 tuổi..." value={plan.config?.targetAudience || ''} onChange={e => handleConfigChange('targetAudience', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Target className="h-4 w-4" />Mục tiêu chiến dịch</Label>
                    <Input placeholder="VD: Tăng nhận diện thương hiệu, 1000 đơn hàng" value={plan.config?.goals || ''} onChange={e => handleConfigChange('goals', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Ngân sách (dự kiến)</Label>
                      <Input placeholder="VD: 50,000,000 VND" value={plan.config?.budget || ''} onChange={e => handleConfigChange('budget', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Thời gian</Label>
                      <Input placeholder="VD: 3 tháng" value={plan.config?.timeline || ''} onChange={e => handleConfigChange('timeline', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Thông điệp chính</Label>
                    <Input placeholder="VD: Làm việc thông minh hơn, không phải chăm hơn" value={plan.config?.keyMessage || ''} onChange={e => handleConfigChange('keyMessage', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><BarChart2 className="h-4 w-4" />Đối thủ cạnh tranh</Label>
                    <Textarea placeholder="Liệt kê các đối thủ chính và điểm mạnh/yếu của họ..." value={plan.config?.competitors || ''} onChange={e => handleConfigChange('competitors', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <div className="h-full bg-slate-50 p-6 overflow-y-auto">
              <AiPlanContentView planData={plan.plan_data} />
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
    </>
  );
};

export default AiPlanDetail;