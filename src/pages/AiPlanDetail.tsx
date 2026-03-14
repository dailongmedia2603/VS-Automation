import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiPlanService, AiPlan } from '@/api/tools';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Loader2, FileText, Share, Settings, PencilLine, Download } from 'lucide-react';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AiPlanLogDialog } from '@/components/ai-plan/AiPlanLogDialog';
import { AiPlanContentView } from '@/components/ai-plan/AiPlanContentView';
import { SharePlanDialog } from '@/components/ai-plan/SharePlanDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { InputStructureConfigDialog } from '@/components/ai-plan/InputStructureConfigDialog';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiPlanProjectDocumentsManager } from '@/components/ai-plan/AiPlanProjectDocumentsManager';

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
  display_type?: 'simple' | 'content_direction' | 'post_scan';
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
}[];

const AiPlanDetail = () => {
  const { planId } = useParams();
  const queryClient = useQueryClient();

  // React Query - data loads instantly from cache
  const { data: plan, isLoading: isLoadingPlan, refetch: refetchPlan } = useQuery({
    queryKey: ['ai-plan', planId],
    queryFn: () => aiPlanService.getPlan(Number(planId)),
    enabled: !!planId,
  });

  const templateId = (plan as any)?.template_id || 1;

  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['ai-plan-template', templateId],
    queryFn: () => aiPlanService.getTemplate(templateId),
    enabled: !!plan,
  });

  const isLoading = isLoadingPlan || isLoadingTemplate;

  // Derived state from template
  const outputStructure = useMemo<OutputStructure | null>(() => {
    if (!template?.structure) return null;
    if (typeof template.structure === 'object' && !Array.isArray(template.structure)) {
      return template.structure.output_fields || [];
    }
    return template.structure as OutputStructure || [];
  }, [template]);

  const inputStructure = useMemo<any[]>(() => {
    if (!template?.structure) return [];
    if (typeof template.structure === 'object' && !Array.isArray(template.structure)) {
      return template.structure.input_fields || [];
    }
    return [];
  }, [template]);

  // Local state
  const [localPlan, setLocalPlan] = useState<AiPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [regenSection, setRegenSection] = useState<{ id: string; label: string; item?: any } | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isInputStructureDialogOpen, setIsInputStructureDialogOpen] = useState(false);

  // Use localPlan for editing, fall back to server plan
  const currentPlan = localPlan || plan;

  // Mutations
  const updatePlanMutation = useMutation({
    mutationFn: (data: Partial<AiPlan>) => aiPlanService.updatePlan(Number(planId), data),
    onSuccess: (updatedPlan) => {
      setLocalPlan(null);
      queryClient.setQueryData(['ai-plan', planId], updatedPlan);
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: () => aiPlanService.generatePlan(Number(planId)),
    onSuccess: () => {
      refetchPlan();
    },
  });

  const regenerateSectionMutation = useMutation({
    mutationFn: (data: { sectionId: string; feedback: string; itemToRegenerate?: any }) =>
      aiPlanService.regenerateSection(Number(planId), data),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['ai-plan', planId], updatedPlan);
      setRegenSection(null);
      setFeedbackText('');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: number; data: { structure?: any } }) =>
      aiPlanService.updateTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-plan-template', templateId] });
    },
  });

  const fetchLogs = async () => {
    if (!planId) return;
    setIsLoadingLogs(true);
    try {
      const logsData = await aiPlanService.getLogs(Number(planId));
      setLogs(logsData);
    } catch (error: any) {
      showError("Không thể tải lịch sử log: " + error.message);
    }
    setIsLoadingLogs(false);
  };

  const handleOpenLogDialog = () => {
    fetchLogs();
    setIsLogOpen(true);
  };

  const handleUpdateConfig = async (newConfig: any) => {
    if (!currentPlan) return;
    setIsSaving(true);
    try {
      await updatePlanMutation.mutateAsync({ config: newConfig });
      showSuccess("Đã lưu cấu hình!");
    } catch (error: any) {
      showError("Lưu cấu hình thất bại: " + error.message);
    }
    setIsSaving(false);
  };

  const handleGeneratePlan = async () => {
    if (!currentPlan) return;
    setIsGenerating(true);
    const toastId = showLoading("AI đang xây dựng kế hoạch...");
    try {
      // First, ensure the latest config is saved
      if (localPlan?.config) {
        await updatePlanMutation.mutateAsync({ config: localPlan.config });
      }

      const result = await generatePlanMutation.mutateAsync();
      dismissToast(toastId);
      if ((result as any).error) {
        showError(`Tạo kế hoạch thất bại: ${(result as any).error}`);
      } else {
        showSuccess("AI đã tạo kế hoạch thành công!");
      }
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Tạo kế hoạch thất bại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    if (!currentPlan || !currentPlan.plan_data || !outputStructure) {
      showError("Không có dữ liệu kế hoạch để xuất.");
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const mainSheetData: { 'Mục': string; 'Nội dung': any }[] = [];

      outputStructure.forEach(section => {
        const sectionData = currentPlan.plan_data?.[section.id];

        if (sectionData === null || typeof sectionData === 'undefined') {
          return;
        }

        if (Array.isArray(sectionData) && sectionData.length > 0 && typeof sectionData[0] === 'object' && sectionData[0] !== null) {
          const sheetName = section.label.replace(/[\/\\?*\[\]]/g, '').substring(0, 31);
          const worksheet = XLSX.utils.json_to_sheet(sectionData);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        } else if (Array.isArray(sectionData)) {
          mainSheetData.push({
            'Mục': section.label,
            'Nội dung': sectionData.join('\n'),
          });
        } else if (typeof sectionData !== 'object') {
          mainSheetData.push({
            'Mục': section.label,
            'Nội dung': String(sectionData),
          });
        } else if (typeof sectionData === 'object' && sectionData !== null) {
          mainSheetData.push({
            'Mục': section.label,
            'Nội dung': JSON.stringify(sectionData, null, 2),
          });
        }
      });

      if (mainSheetData.length > 0) {
        const mainWorksheet = XLSX.utils.json_to_sheet(mainSheetData);
        mainWorksheet['!cols'] = [{ wch: 30 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(workbook, mainWorksheet, "Tổng quan kế hoạch");
      }

      if (workbook.SheetNames.length === 0) {
        showError("Không có dữ liệu để xuất.");
        return;
      }

      if (workbook.SheetNames.includes("Tổng quan kế hoạch")) {
        const overviewIndex = workbook.SheetNames.indexOf("Tổng quan kế hoạch");
        if (overviewIndex > 0) {
          const sheetName = workbook.SheetNames.splice(overviewIndex, 1)[0];
          workbook.SheetNames.unshift(sheetName);
        }
      }

      XLSX.writeFile(workbook, `${currentPlan.name || 'ke-hoach-ai'}.xlsx`);
      showSuccess("Đã xuất file Excel thành công!");
    } catch (error) {
      console.error("Export to Excel failed:", error);
      showError("Đã xảy ra lỗi khi xuất file Excel.");
    }
  };

  const handlePlanUpdate = (updates: Partial<AiPlan>) => {
    if (plan) {
      queryClient.setQueryData(['ai-plan', planId], { ...plan, ...updates });
    }
  };

  const handleUpdateSection = async (sectionId: string, newContent: any) => {
    if (!currentPlan) return;

    const newPlanData = {
      ...currentPlan.plan_data,
      [sectionId]: newContent,
    };

    setIsSaving(true);
    try {
      await updatePlanMutation.mutateAsync({ plan_data: newPlanData });
      showSuccess("Đã lưu thay đổi!");
      setEditingSectionId(null);
    } catch (error: any) {
      showError("Lưu thay đổi thất bại: " + error.message);
    }
    setIsSaving(false);
  };

  const handleRegenerateSection = async () => {
    if (!currentPlan || !regenSection || !feedbackText.trim()) return;

    setIsGenerating(true);
    const toastId = showLoading(`AI đang tạo lại mục "${regenSection.label}"...`);

    try {
      await regenerateSectionMutation.mutateAsync({
        sectionId: regenSection.id,
        feedback: feedbackText,
        itemToRegenerate: regenSection.item,
      });
      dismissToast(toastId);
      showSuccess("AI đã tạo lại nội dung thành công!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Tạo lại thất bại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveInputStructure = async (newInputFields: any[]) => {
    if (!plan || !(plan as any).template_id) return;

    const planTemplateId = (plan as any).template_id;
    const currentStructure = template?.structure || {};
    const newStructure = {
      ...currentStructure,
      input_fields: newInputFields,
    };

    try {
      await updateTemplateMutation.mutateAsync({
        templateId: planTemplateId,
        data: { structure: newStructure },
      });
      showSuccess("Đã cập nhật cấu trúc đầu vào!");
    } catch (error: any) {
      showError("Lưu cấu trúc thất bại: " + error.message);
    }
  };

  const handleConfigDataChange = (key: string, value: string) => {
    setLocalPlan(prev => {
      const base = prev || currentPlan;
      if (!base) return null;
      const newConfig = { ...(base.config || {}), [key]: value };
      return { ...base, config: newConfig };
    });
  };

  if (isLoading) {
    return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><Skeleton className="h-full w-full" /></main>;
  }

  if (!currentPlan) {
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{currentPlan.name}</h1>
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
            <Button variant="outline" onClick={handleExportExcel} className="bg-white">
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
            <Button variant="outline" onClick={handleOpenLogDialog} className="bg-white">
              <FileText className="mr-2 h-4 w-4" />
              Log AI
            </Button>
            <Button onClick={handleGeneratePlan} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Tạo kế hoạch
            </Button>
          </div>
        </div>

        <Tabs defaultValue="plan" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-4 self-start bg-transparent p-0">
            <TabsTrigger value="plan" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Kế hoạch</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Tài liệu</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="flex-1 min-h-0">
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-2xl border bg-white shadow-sm overflow-hidden">
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="h-full p-4 overflow-y-auto">
                  <Card className="border-none shadow-none">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Thông tin đầu vào</CardTitle>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsInputStructureDialogOpen(true)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Cấu hình
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {inputStructure.length > 0 ? (
                        <div className="space-y-4">
                          {inputStructure.map(field => (
                            <Card key={field.id} className="shadow-none border">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <PencilLine className="h-4 w-4 text-blue-600" />
                                  {field.label}
                                </CardTitle>
                                <CardDescription className="text-xs pt-1">{field.description}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                {field.type === 'input' ? (
                                  <Input
                                    value={currentPlan.config?.[field.id] || ''}
                                    onChange={e => handleConfigDataChange(field.id, e.target.value)}
                                  />
                                ) : (
                                  <Textarea
                                    value={currentPlan.config?.[field.id] || ''}
                                    onChange={e => handleConfigDataChange(field.id, e.target.value)}
                                    className="min-h-[100px]"
                                  />
                                )}
                              </CardContent>
                            </Card>
                          ))}
                          <div className="flex justify-end mt-4">
                            <Button onClick={() => handleUpdateConfig(currentPlan.config)} disabled={isSaving}>
                              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Lưu thông tin
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground p-4 text-center bg-slate-50 rounded-lg">
                          Nhấp vào nút "Cấu hình" để bắt đầu.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60}>
                <div className="h-full bg-slate-50 p-6 overflow-y-auto">
                  <AiPlanContentView
                    planData={currentPlan.plan_data}
                    planStructure={outputStructure!}
                    isEditable={true}
                    editingSectionId={editingSectionId}
                    setEditingSectionId={setEditingSectionId}
                    onUpdateSection={handleUpdateSection}
                    onRegenerateSection={(sectionId, sectionLabel, item) => setRegenSection({ id: sectionId, label: sectionLabel, item })}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
          <TabsContent value="documents" className="flex-1 overflow-y-auto p-1">
            <AiPlanProjectDocumentsManager planId={planId!} />
          </TabsContent>
        </Tabs>
      </main>
      {currentPlan && (
        <SharePlanDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          plan={currentPlan}
          onPlanUpdate={handlePlanUpdate}
        />
      )}
      <AiPlanLogDialog
        isOpen={isLogOpen}
        onOpenChange={setIsLogOpen}
        logs={logs}
        isLoading={isLoadingLogs}
      />
      <Dialog open={!!regenSection} onOpenChange={() => setRegenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Tạo lại: {regenSection?.label}
              {regenSection?.item && (
                <span className="block text-base font-normal text-muted-foreground mt-1">
                  Mục: {regenSection.item.chude || regenSection.item.topic || regenSection.item.bai_viet_name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Nhập feedback của bạn để AI cải thiện nội dung cho phần này.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ví dụ: Phần này cần chi tiết hơn về đối thủ cạnh tranh..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenSection(null)}>Hủy</Button>
            <Button onClick={handleRegenerateSection} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gửi cho AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InputStructureConfigDialog
        open={isInputStructureDialogOpen}
        onOpenChange={setIsInputStructureDialogOpen}
        initialStructure={inputStructure}
        onSave={handleSaveInputStructure}
      />
    </>
  );
};

export default AiPlanDetail;