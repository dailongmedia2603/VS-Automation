import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings, Save, Loader2, Trash2, FileText, Sparkles, Bot, ShieldCheck, MessageSquarePlus, PlusCircle } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { GenerationLogDialog } from './GenerationLogDialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Project = { id: number; name: string; };
type ProjectItem = { id: number; name: string; type: 'article' | 'comment'; content: string | null; config: any; };
type PromptLibrary = { id: number; name: string; };
type GeneratedArticle = { id: string; content: string; type: string; };
type Log = { id: number; created_at: string; prompt: string; response: any; };
type MandatoryCondition = { id: string; content: string; };

interface ArticleGenerationDetailProps {
  project: Project;
  item: ProjectItem;
  promptLibraries: PromptLibrary[];
  onSave: (updatedItem: ProjectItem) => void;
}

export const ArticleGenerationDetail = ({ project, item, promptLibraries, onSave }: ArticleGenerationDetailProps) => {
  const [config, setConfig] = useState<any>({});
  const [mandatoryConditions, setMandatoryConditions] = useState<MandatoryCondition[]>([]);
  const [results, setResults] = useState<GeneratedArticle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingConditions, setIsSavingConditions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    const itemConfig = item.config || {};
    setConfig(itemConfig);
    setMandatoryConditions(itemConfig.mandatoryConditions || []);
    try {
      const parsedContent = JSON.parse(item.content || '[]');
      setResults(Array.isArray(parsedContent) ? parsedContent : []);
    } catch {
      setResults([]);
    }

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        const { data, error } = await supabase.from('content_ai_logs').select('*').eq('item_id', item.id).order('created_at', { ascending: false });
        if (error) showError("Không thể tải lịch sử log: " + error.message);
        else setLogs(data || []);
        setIsLoadingLogs(false);
    };
    fetchLogs();
  }, [item]);

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async (updatedConfig: any) => {
    setIsSaving(true);
    const { data, error } = await supabase
      .from('content_ai_items')
      .update({ config: updatedConfig, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();

    if (error) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } else if (data) {
      showSuccess("Đã lưu cấu hình thành công!");
      onSave(data as ProjectItem);
    }
    setIsSaving(false);
  };

  const handleSaveConditions = async () => {
    setIsSavingConditions(true);
    await handleSaveConfig({ ...config, mandatoryConditions });
    setIsSavingConditions(false);
  };

  const handleGenerate = async () => {
    if (!config.libraryId) { showError("Vui lòng chọn một 'Ngành' (thư viện prompt)."); return; }
    if (!config.direction) { showError("Vui lòng nhập 'Định hướng nội dung'."); return; }

    setIsGenerating(true);
    const toastId = showLoading("AI đang viết bài, vui lòng chờ...");
    try {
      const { data: updatedItem, error } = await supabase.functions.invoke('create-ai-generation-task', {
        body: { itemId: item.id, config: { ...config, mandatoryConditions } }
      });
      
      if (error) {
        const errorBody = await error.context.json();
        throw new Error(errorBody.error || error.message);
      }
      if (updatedItem.error) throw new Error(updatedItem.error);
      
      onSave(updatedItem);
      dismissToast(toastId);
      showSuccess("Đã tạo bài viết thành công!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Không thể bắt đầu: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateWithFeedback = async () => {
    // This function will need a new edge function `regenerate-ai-articles`
    showError("Tính năng này đang được phát triển!");
  };

  const handleConditionChange = (id: string, content: string) => {
    setMandatoryConditions(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  };

  const handleAddCondition = () => {
    setMandatoryConditions(prev => [...prev, { id: crypto.randomUUID(), content: '' }]);
  };

  const handleRemoveCondition = (id: string) => {
    setMandatoryConditions(prev => prev.filter(c => c.id !== id));
  };

  const handleClearLogs = async () => {
    const toastId = showLoading("Đang xóa tất cả log...");
    const { error } = await supabase
        .from('content_ai_logs')
        .delete()
        .eq('item_id', item.id);
    
    dismissToast(toastId);
    if (error) {
        showError("Xóa log thất bại: " + error.message);
    } else {
        showSuccess("Đã xóa toàn bộ lịch sử log!");
        setLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
        <div className="flex items-center gap-4">
          {isGenerating && <p className="text-sm text-slate-500 animate-pulse">AI đang xử lý...</p>}
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Đang tạo...' : 'Tạo bài viết'}
          </Button>
        </div>
      </div>
      
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1" className="border rounded-2xl bg-blue-50 shadow-sm">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
            <div className="flex items-center gap-3"><Settings className="h-5 w-5 text-blue-600" /><span>Cấu hình & Tùy chọn</span></div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 bg-white rounded-b-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Ngành</Label><Select value={config.libraryId} onValueChange={v => handleConfigChange('libraryId', v)}><SelectTrigger><SelectValue placeholder="Chọn thư viện prompt" /></SelectTrigger><SelectContent>{promptLibraries.map(lib => (<SelectItem key={lib.id} value={String(lib.id)}>{lib.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Dạng bài</Label><Select value={config.format} onValueChange={v => handleConfigChange('format', v)}><SelectTrigger><SelectValue placeholder="Chọn dạng bài" /></SelectTrigger><SelectContent><SelectItem value="question">Đặt câu hỏi / thảo luận</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="sharing">Chia sẻ</SelectItem><SelectItem value="comparison">So sánh</SelectItem><SelectItem value="storytelling">Story telling</SelectItem></SelectContent></Select></div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" value={config.quantity} onChange={e => handleConfigChange('quantity', e.target.value)} />
                  <p className="text-xs text-muted-foreground">NÊN CHỌN 1 (Số lượng bài nhiều hơn 1 có thể ảnh hưởng đến chất lượng của bài viết)</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Định hướng nội dung</Label><Textarea value={config.direction} onChange={e => handleConfigChange('direction', e.target.value)} placeholder="Nhập định hướng chi tiết cho bài viết..." className="min-h-[120px]" /></div>
              </div>
            </div>
            <div className="flex justify-end mt-6 px-6">
              <Button onClick={() => handleSaveConfig(config)} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu cấu hình
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1" className="border rounded-2xl bg-yellow-50 shadow-sm">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-red-600" /><span>Điều kiện bắt buộc</span></div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4 bg-white rounded-b-2xl">
            <div className="space-y-2 pt-4">
              {mandatoryConditions.map((cond) => (
                <div key={cond.id} className="flex items-center gap-2 p-2 border rounded-lg bg-white">
                  <ShieldCheck className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <Input value={cond.content} onChange={(e) => handleConditionChange(cond.id, e.target.value)} placeholder="VD: Không được nhắc đến giá sản phẩm" className="bg-transparent flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveCondition(cond.id)} className="flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={handleAddCondition}><PlusCircle className="h-4 w-4 mr-2" />Thêm điều kiện</Button>
              <Button onClick={handleSaveConditions} disabled={isSavingConditions}>
                {isSavingConditions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu điều kiện
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Kết quả</CardTitle></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setIsLogOpen(true)}><FileText className="h-4 w-4" /></Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsFeedbackDialogOpen(true)} disabled={isGenerating || results.length === 0}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Feedback & Tạo lại
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isGenerating && (
            <div className="text-center p-4 flex items-center justify-center gap-3 text-slate-500">
              <Bot className="h-5 w-5 animate-bounce" />
              <span className="font-medium">AI đang làm việc... Tác vụ đang chạy trong nền.</span>
            </div>
          )}
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map(result => (
                <Card key={result.id} className="bg-slate-50">
                  <CardContent className="p-4 prose prose-sm max-w-none prose-slate">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !isGenerating && (
            <div className="text-center h-24 flex items-center justify-center">Chưa có kết quả nào.</div>
          )}
        </CardContent>
      </Card>

      <GenerationLogDialog isOpen={isLogOpen} onOpenChange={setIsLogOpen} logs={logs} isLoading={isLoadingLogs} onClearLogs={handleClearLogs} />
      
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback & Tạo lại</DialogTitle>
            <DialogDescription>Nhập feedback để AI tạo lại bài viết tốt hơn.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea placeholder="Ví dụ: Bài viết cần tập trung hơn vào lợi ích cho khách hàng..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="min-h-[120px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleRegenerateWithFeedback} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gửi Feedback & Tạo lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};