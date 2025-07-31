import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, Save, Loader2, Search, Trash2, Download, FileText, PlusCircle, MoreHorizontal, Edit, Sparkles, Bot } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { GenerationLogDialog } from './GenerationLogDialog';

type Project = { id: number; name: string; };
type ProjectItem = { id: number; name: string; type: 'article' | 'comment'; content: string | null; config: any; };
type PromptLibrary = { id: number; name: string; };
type CommentRatio = { id: string; percentage: number; content: string; };
type GeneratedComment = { id: string; content: string; status: 'Đạt' | 'Không đạt'; };
type Log = { id: number; created_at: string; prompt: string; response: any; };
type Task = { id: number; status: 'pending' | 'running' | 'completed' | 'failed'; error_message: string | null; };

interface CommentGenerationDetailProps {
  project: Project;
  item: ProjectItem;
  promptLibraries: PromptLibrary[];
  onSave: (updatedItem: ProjectItem) => void;
}

export const CommentGenerationDetail = ({ project, item, promptLibraries, onSave }: CommentGenerationDetailProps) => {
  const [config, setConfig] = useState<any>({});
  const [results, setResults] = useState<GeneratedComment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  useEffect(() => {
    setConfig(item.config || {});
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

    const fetchActiveTask = async () => {
      const { data, error } = await supabase.from('ai_generation_tasks').select('*').eq('item_id', item.id).in('status', ['pending', 'running']).maybeSingle();
      if (error) console.error("Lỗi kiểm tra tác vụ:", error);
      else setActiveTask(data);
    };
    fetchActiveTask();
  }, [item]);

  useEffect(() => {
    if (activeTask && (activeTask.status === 'pending' || activeTask.status === 'running')) {
      const interval = setInterval(async () => {
        const { data: updatedTask, error } = await supabase.from('ai_generation_tasks').select('*').eq('id', activeTask.id).single();
        if (error) {
          console.error("Lỗi polling tác vụ:", error);
          clearInterval(interval);
        } else if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
          clearInterval(interval);
          setActiveTask(null);
          if (updatedTask.status === 'completed') {
            showSuccess("Tạo comment thành công!");
          } else {
            showError(`Tạo comment thất bại: ${updatedTask.error_message}`);
          }
          // Trigger a full refresh from parent
          const { data: updatedItem, error: itemError } = await supabase.from('content_ai_items').select('*').eq('id', item.id).single();
          if (!itemError && updatedItem) {
            onSave(updatedItem);
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTask, item.id, onSave]);

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleRatioChange = (id: string, field: 'percentage' | 'content', value: string | number) => {
    const newRatios = (config.ratios || []).map((r: CommentRatio) => r.id === id ? { ...r, [field]: value } : r);
    handleConfigChange('ratios', newRatios);
  };

  const handleAddRatio = () => {
    const newRatios = [...(config.ratios || []), { id: crypto.randomUUID(), percentage: 0, content: '' }];
    handleConfigChange('ratios', newRatios);
  };

  const handleRemoveRatio = (id: string) => {
    if (config.ratios?.length > 1) {
      const newRatios = config.ratios.filter((r: CommentRatio) => r.id !== id);
      handleConfigChange('ratios', newRatios);
    }
  };

  const totalPercentage = useMemo(() => {
    return (config.ratios || []).reduce((sum: number, ratio: CommentRatio) => sum + (Number(ratio.percentage) || 0), 0);
  }, [config.ratios]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    const { data, error } = await supabase
      .from('content_ai_items')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();

    if (error) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } else if (data) {
      showSuccess("Đã lưu cấu hình thành công!");
      onSave(data as ProjectItem);
    } else {
      showError("Lưu thất bại. Không tìm thấy mục để cập nhật hoặc bạn không có quyền.");
    }
    setIsSaving(false);
  };

  const handleGenerateComments = async () => {
    if (!config.libraryId) { showError("Vui lòng chọn một 'Ngành' (thư viện prompt) để bắt đầu."); return; }
    if (!config.postContent) { showError("Vui lòng nhập 'Nội dung Post'."); return; }

    const toastId = showLoading("Đang gửi yêu cầu...");
    try {
      const { data: newTask, error } = await supabase.functions.invoke('create-ai-generation-task', {
        body: { itemId: item.id, config }
      });
      if (error) throw error;
      if (newTask.error) throw new Error(newTask.error);
      
      setActiveTask(newTask);
      dismissToast(toastId);
      showSuccess("Đã gửi yêu cầu! AI đang xử lý trong nền.");
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Không thể bắt đầu: ${err.message}`);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => r.content.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [results, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredResults.map(r => r.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    const newResults = results.filter(r => !selectedIds.includes(r.id));
    setResults(newResults);
    setSelectedIds([]);
    
    const { error } = await supabase.from('content_ai_items').update({ content: JSON.stringify(newResults), updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
      setResults(results);
    } else {
      showSuccess("Đã xóa thành công!");
      onSave({ ...item, content: JSON.stringify(newResults) });
    }
    setIsDeleteAlertOpen(false);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredResults.map(r => ({ 'Nội dung Comment': r.content, 'Chất lượng': r.status }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comments");
    XLSX.writeFile(workbook, `${project.name} - ${item.name} - Comments.xlsx`);
  };

  const isGenerating = !!activeTask;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
        <Button onClick={handleGenerateComments} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {isGenerating ? 'Đang tạo...' : 'Tạo comment'}
        </Button>
      </div>
      
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1" className="border rounded-2xl bg-white shadow-sm">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
            <div className="flex items-center gap-3"><Settings className="h-5 w-5 text-blue-600" /><span>Cấu hình & Tùy chọn</span></div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Ngành</Label><Select value={config.libraryId} onValueChange={v => handleConfigChange('libraryId', v)}><SelectTrigger><SelectValue placeholder="Chọn thư viện prompt" /></SelectTrigger><SelectContent>{promptLibraries.map(lib => (<SelectItem key={lib.id} value={String(lib.id)}>{lib.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Nội dung Post</Label><Textarea value={config.postContent} onChange={e => handleConfigChange('postContent', e.target.value)} placeholder="Dán nội dung bài viết cần bình luận..." className="min-h-[120px]" /></div>
                <div className="space-y-2"><Label>Định hướng comment</Label><Textarea value={config.commentDirection} onChange={e => handleConfigChange('commentDirection', e.target.value)} placeholder="Nhập định hướng chi tiết..." className="min-h-[80px]" /></div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Tỉ lệ comment</Label><div className="space-y-2">{ (config.ratios || []).map((ratio: CommentRatio) => (<div key={ratio.id} className="flex items-center gap-2"><div className="relative w-24"><Input type="number" value={ratio.percentage} onChange={(e) => handleRatioChange(ratio.id, 'percentage', e.target.value)} className="pr-6" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div><Input placeholder="Nội dung định hướng" value={ratio.content} onChange={(e) => handleRatioChange(ratio.id, 'content', e.target.value)} /><Button variant="ghost" size="icon" onClick={() => handleRemoveRatio(ratio.id)} disabled={config.ratios?.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)) }</div><div className="flex items-center justify-between mt-2"><Button variant="outline" size="sm" onClick={handleAddRatio}><PlusCircle className="h-4 w-4 mr-2" />Thêm tỉ lệ</Button>{totalPercentage > 100 && (<p className="text-sm text-destructive font-medium">Tổng tỉ lệ vượt quá 100%!</p>)}</div></div>
                <div className="space-y-2"><Label>Số lượng comment</Label><Input type="number" value={config.quantity} onChange={e => handleConfigChange('quantity', e.target.value)} defaultValue={10} /></div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu cấu hình
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
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              {selectedIds.length > 0 && (<Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Xóa ({selectedIds.length})</Button>)}
              <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Xuất Excel</Button>
              <Button variant="outline" onClick={() => setIsLogOpen(true)}><FileText className="mr-2 h-4 w-4" />Log</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerateComments} disabled={isGenerating}><PlusCircle className="mr-2 h-4 w-4" />Tạo thêm comment</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12"><Checkbox checked={selectedIds.length === filteredResults.length && filteredResults.length > 0} onCheckedChange={(checked) => handleSelectAll(!!checked)} /></TableHead><TableHead>STT</TableHead><TableHead>Nội dung comment</TableHead><TableHead>Lọc chất lượng</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
              <TableBody>
                {isGenerating && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-4">
                      <div className="flex items-center justify-center gap-3 text-slate-500">
                        <Bot className="h-5 w-5 animate-bounce" />
                        <span className="font-medium">AI đang làm việc... Tác vụ đang chạy trong nền.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredResults.length > 0 ? filteredResults.map((result, index) => (
                  <TableRow key={result.id}>
                    <TableCell><Checkbox checked={selectedIds.includes(result.id)} onCheckedChange={() => handleSelectRow(result.id)} /></TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-md break-words">{result.content}</TableCell>
                    <TableCell><Badge variant={result.status === 'Đạt' ? 'default' : 'destructive'} className={cn(result.status === 'Đạt' && 'bg-green-100 text-green-800')}>{result.status}</Badge></TableCell>
                    <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                )) : !isGenerating && (<TableRow><TableCell colSpan={5} className="text-center h-24">Chưa có kết quả nào.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GenerationLogDialog isOpen={isLogOpen} onOpenChange={setIsLogOpen} logs={logs} isLoading={isLoadingLogs} />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn {selectedIds.length} bình luận đã chọn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};