import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Loader2, FileText, Share, Settings, PencilLine, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

type Plan = {
  id: number;
  name: string;
  config: any;
  plan_data: any;
  is_public: boolean;
  public_id: string | null;
  template_id: number | null;
  slug: string | null;
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
  display_type?: 'simple' | 'content_direction' | 'post_scan';
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
}[];

type TemplateStructure = {
  output_fields: OutputStructure;
  input_fields: any[];
};

const AiPlanDetail = () => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [outputStructure, setOutputStructure] = useState<OutputStructure | null>(null);
  const [inputStructure, setInputStructure] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [regenSection, setRegenSection] = useState<{ id: string; label: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isInputStructureDialogOpen, setIsInputStructureDialogOpen] = useState(false);

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

        if (!data.template_id) {
          const { data: updatedPlan, error: updateError } = await supabase
            .from('ai_plans')
            .update({ template_id: 1 })
            .eq('id', planId)
            .select('*')
            .single();
          if (updateError) throw updateError;
          data = updatedPlan;
        }
        
        setPlan(data);

        const templateId = data.template_id;
        const { data: templateData, error: templateError } = await supabase
          .from('ai_plan_templates')
          .select('structure')
          .eq('id', templateId)
          .single();
        
        if (templateError) throw templateError;
        if (!templateData) throw new Error(`Template with ID ${templateId} not found.`);

        if (templateData.structure && typeof templateData.structure === 'object' && !Array.isArray(templateData.structure)) {
          const structure = templateData.structure as TemplateStructure;
          setOutputStructure(structure.output_fields || []);
          setInputStructure(structure.input_fields || []);
        } else {
          setOutputStructure((templateData.structure as OutputStructure) || []);
          setInputStructure([]);
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

  const handleUpdateConfig = async (newConfig: any) => {
    if (!plan) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('ai_plans')
      .update({ config: newConfig, updated_at: new Date().toISOString() })
      .eq('id', plan.id);
    
    if (error) {
      showError("Lưu cấu hình thất bại: " + error.message);
      throw error;
    } else {
      showSuccess("Đã lưu cấu hình!");
      setPlan(prev => prev ? { ...prev, config: newConfig } : null);
    }
    setIsSaving(false);
  };

  const handleGeneratePlan = async () => {
    if (!plan) return;
    setIsGenerating(true);
    const toastId = showLoading("AI đang xây dựng kế hoạch...");
    try {
      // First, ensure the latest config is saved
      await handleUpdateConfig(plan.config);

      const { data, error } = await supabase.functions.invoke('generate-ai-plan', {
        body: { planId: plan.id }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorBody = await error.context.json();
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Ignore JSON parsing error
          }
        }
        throw new Error(errorMessage);
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

  const handleExportExcel = () => {
    if (!plan || !plan.plan_data || !outputStructure) {
      showError("Không có dữ liệu kế hoạch để xuất.");
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const mainSheetData: { 'Mục': string; 'Nội dung': any }[] = [];

      // Iterate through the defined structure to maintain order
      outputStructure.forEach(section => {
        const sectionData = plan.plan_data[section.id];
        
        // Skip if there's no data for this section
        if (sectionData === null || typeof sectionData === 'undefined') {
          return;
        }

        // Handle complex array data by creating separate sheets
        if (Array.isArray(sectionData) && sectionData.length > 0 && typeof sectionData[0] === 'object' && sectionData[0] !== null) {
          // Sanitize sheet name
          const sheetName = section.label.replace(/[\/\\?*\[\]]/g, '').substring(0, 31);
          const worksheet = XLSX.utils.json_to_sheet(sectionData);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        } 
        // Handle simple arrays (of strings/numbers)
        else if (Array.isArray(sectionData)) {
            mainSheetData.push({
                'Mục': section.label,
                'Nội dung': sectionData.join('\n'),
            });
        }
        // Handle simple values (string, number, boolean)
        else if (typeof sectionData !== 'object') {
          mainSheetData.push({
            'Mục': section.label,
            'Nội dung': String(sectionData),
          });
        } 
        // Handle simple objects by stringifying them
        else if (typeof sectionData === 'object' && sectionData !== null) {
            mainSheetData.push({
                'Mục': section.label,
                'Nội dung': JSON.stringify(sectionData, null, 2),
            });
        }
      });

      // Create the main summary sheet if it has data
      if (mainSheetData.length > 0) {
        const mainWorksheet = XLSX.utils.json_to_sheet(mainSheetData);
        // Set column widths for better readability
        mainWorksheet['!cols'] = [{ wch: 30 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(workbook, mainWorksheet, "Tổng quan kế hoạch");
      }

      if (workbook.SheetNames.length === 0) {
        showError("Không có dữ liệu để xuất.");
        return;
      }

      // Ensure "Tổng quan kế hoạch" is the first sheet if it exists
      if (workbook.SheetNames.includes("Tổng quan kế hoạch")) {
        const overviewIndex = workbook.SheetNames.indexOf("Tổng quan kế hoạch");
        if (overviewIndex > 0) {
          // Move sheet to the beginning
          const sheetName = workbook.SheetNames.splice(overviewIndex, 1)[0];
          workbook.SheetNames.unshift(sheetName);
        }
      }

      XLSX.writeFile(workbook, `${plan.name || 'ke-hoach-ai'}.xlsx`);
      showSuccess("Đã xuất file Excel thành công!");
    } catch (error) {
      console.error("Export to Excel failed:", error);
      showError("Đã xảy ra lỗi khi xuất file Excel.");
    }
  };

  const handlePlanUpdate = (updates: Partial<Plan>) => {
    setPlan(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleUpdateSection = async (sectionId: string, newContent: any) => {
    if (!plan) return;
    
    const newPlanData = {
      ...plan.plan_data,
      [sectionId]: newContent,
    };
  
    setIsSaving(true);
    const { data, error } = await supabase
      .from('ai_plans')
      .update({ plan_data: newPlanData, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
      .select()
      .single();
    
    if (error) {
      showError("Lưu thay đổi thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu thay đổi!");
      setPlan(data);
      setEditingSectionId(null);
    }
    setIsSaving(false);
  };

  const handleRegenerateSection = async () => {
    if (!plan || !regenSection || !feedbackText.trim()) return;
  
    setIsGenerating(true);
    const toastId = showLoading(`AI đang tạo lại mục "${regenSection.label}"...`);
  
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-ai-plan-section', {
        body: {
          planId: plan.id,
          sectionId: regenSection.id,
          feedback: feedbackText,
        }
      });
  
      if (error) {
        let errorMessage = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorBody = await error.context.json();
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Ignore JSON parsing error
          }
        }
        throw new Error(errorMessage);
      }
      if (data.error) throw new Error(data.error);
  
      setPlan(data);
      dismissToast(toastId);
      showSuccess("AI đã tạo lại nội dung thành công!");
      setRegenSection(null);
      setFeedbackText('');
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Tạo lại thất bại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveInputStructure = async (newInputFields: any[]) => {
    if (!plan || !plan.template_id) return;

    const { data: templateData, error: templateError } = await supabase
        .from('ai_plan_templates')
        .select('structure')
        .eq('id', plan.template_id)
        .single();
    
    if (templateError) throw templateError;

    const currentStructure = templateData.structure || {};
    const newStructure = {
        ...currentStructure,
        input_fields: newInputFields,
    };

    const { error } = await supabase
        .from('ai_plan_templates')
        .update({ structure: newStructure })
        .eq('id', plan.template_id);
    
    if (error) {
        showError("Lưu cấu trúc thất bại: " + error.message);
        throw error;
    } else {
        showSuccess("Đã cập nhật cấu trúc đầu vào!");
        setInputStructure(newInputFields);
    }
  };

  const handleConfigDataChange = (key: string, value: string) => {
    setPlan(prev => {
        if (!prev) return null;
        const newConfig = { ...(prev.config || {}), [key]: value };
        return { ...prev, config: newConfig };
    });
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
                                    value={plan.config?.[field.id] || ''}
                                    onChange={e => handleConfigDataChange(field.id, e.target.value)}
                                  />
                                ) : (
                                  <Textarea
                                    value={plan.config?.[field.id] || ''}
                                    onChange={e => handleConfigDataChange(field.id, e.target.value)}
                                    className="min-h-[100px]"
                                  />
                                )}
                              </CardContent>
                            </Card>
                          ))}
                          <div className="flex justify-end mt-4">
                              <Button onClick={() => handleUpdateConfig(plan.config)} disabled={isSaving}>
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
                    planData={plan.plan_data} 
                    planStructure={outputStructure!} 
                    isEditable={true}
                    editingSectionId={editingSectionId}
                    setEditingSectionId={setEditingSectionId}
                    onUpdateSection={handleUpdateSection}
                    onRegenerateSection={(id, label) => setRegenSection({ id, label })}
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
      <Dialog open={!!regenSection} onOpenChange={() => setRegenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo lại: {regenSection?.label}</DialogTitle>
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