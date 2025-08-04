import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, Save, Loader2, Search, Trash2, Download, FileText, PlusCircle, MoreHorizontal, Edit, Sparkles, Bot, ShieldCheck, MessageSquarePlus, Library, FileInput, ListOrdered, Percent, Compass, Check, CornerDownRight, ChevronDown, Copy } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { GenerationLogDialog } from './GenerationLogDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConditionLibraryDialog } from './ConditionLibraryDialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type Project = { id: number; name: string; };
type ProjectItem = { id: number; name: string; type: 'article' | 'comment'; content: string | null; config: any; };
type PromptLibrary = { id: number; name: string; };
type CommentRatio = { id: string; type: string; percentage: number; content: string; };
type GeneratedComment = { id: string; content: string; type: string; metConditionIds: string[]; };
type Log = { id: number; created_at: string; prompt: string; response: any; };
type MandatoryCondition = { id: string; content: string; };
type Document = { id: number; title: string; };

interface CommentGenerationDetailProps {
  project: Project;
  item: ProjectItem;
  promptLibraries: PromptLibrary[];
  onSave: (updatedItem: ProjectItem) => void;
}

export const CommentGenerationDetail = ({ project, item, promptLibraries, onSave }: CommentGenerationDetailProps) => {
  const [config, setConfig] = useState<any>({});
  const [mandatoryConditions, setMandatoryConditions] = useState<MandatoryCondition[]>([]);
  const [results, setResults] = useState<GeneratedComment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingConditions, setIsSavingConditions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  
  const [editingComment, setEditingComment] = useState<GeneratedComment | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [commentToDelete, setCommentToDelete] = useState<GeneratedComment | null>(null);

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const itemConfig = item.config || {};
    setConfig(itemConfig);
    setMandatoryConditions(itemConfig.mandatoryConditions || []);
    try {
      let parsedContent = JSON.parse(item.content || '[]');
      if (Array.isArray(parsedContent)) {
        const allConditionIds = (itemConfig.mandatoryConditions || []).map((c: MandatoryCondition) => c.id);
        parsedContent = parsedContent.map(comment => {
          if (comment.conditionsStatus) { // Migrate from old format
            return { ...comment, metConditionIds: comment.conditionsStatus === 'Đạt' ? allConditionIds : [], conditionsStatus: undefined };
          }
          if (!comment.metConditionIds) { // Ensure new field exists
            return { ...comment, metConditionIds: allConditionIds };
          }
          return comment;
        });
        setResults(parsedContent);
      } else {
        setResults([]);
      }
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

    const fetchProjectDocuments = async () => {
      if (!project?.id) return;
      const { data, error } = await supabase
        .from('documents')
        .select('id, title')
        .eq('project_id', project.id);
      if (!error) {
        setProjectDocuments(data || []);
      }
    };
    fetchProjectDocuments();
  }, [item, project]);

  const handleConfigChange = (field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleRatioChange = (id: string, field: 'type' | 'percentage' | 'content', value: string | number) => {
    const newRatios = (config.ratios || []).map((r: CommentRatio) => r.id === id ? { ...r, [field]: value } : r);
    handleConfigChange('ratios', newRatios);
  };

  const handleAddRatio = () => {
    const newRatios = [...(config.ratios || []), { id: crypto.randomUUID(), type: '', percentage: 0, content: '' }];
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

  const handleGenerateComments = async () => {
    if (!config.libraryId) { showError("Vui lòng chọn một 'Ngành' (thư viện prompt) để bắt đầu."); return; }
    if (!config.postContent) { showError("Vui lòng nhập 'Nội dung Post'."); return; }

    setIsGenerating(true);
    const toastId = showLoading("AI đang xử lý, vui lòng chờ...");
    try {
      const { data: updatedItem, error } = await supabase.functions.invoke('create-ai-generation-task', {
        body: { itemId: item.id, config: { ...config, mandatoryConditions, projectId: project.id } }
      });
      
      if (error) {
        const errorBody = await error.context.json();
        throw new Error(errorBody.error || error.message);
      }
      if (updatedItem.error) throw new Error(updatedItem.error);
      
      onSave(updatedItem);
      dismissToast(toastId);
      showSuccess("Đã tạo comment thành công!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Không thể bắt đầu: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateWithFeedback = async () => {
    if (!feedbackText.trim()) {
      showError("Vui lòng nhập nội dung feedback.");
      return;
    }
    setIsGenerating(true);
    setIsFeedbackDialogOpen(false);
    const toastId = showLoading("AI đang tiếp nhận feedback và tạo lại...");
    try {
      const { data: updatedItem, error } = await supabase.functions.invoke('regenerate-ai-comments', {
        body: {
          itemId: item.id,
          feedback: feedbackText,
          existingComments: results
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorBody = await error.context.json();
            if (errorBody.error) errorMessage = errorBody.error;
          } catch (e) { /* Ignore parsing error */ }
        }
        throw new Error(errorMessage);
      }
      if (updatedItem.error) throw new Error(updatedItem.error);

      onSave(updatedItem);
      dismissToast(toastId);
      showSuccess("Đã tạo lại comment theo feedback!");
      setFeedbackText('');
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Tạo lại thất bại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const threadedResults = useMemo(() => {
    if (!results || results.length === 0) return [];

    const commentsWithMeta = results.map((comment, index) => {
        const stt = index + 1;
        const replyMatch = comment.content.match(/^(?:\d+\s*reply\s*->\s*(\d+)\.\s*)?(.*)$/s);
        
        return {
            ...comment,
            stt,
            parentStt: replyMatch && replyMatch[1] ? parseInt(replyMatch[1], 10) : null,
            cleanContent: replyMatch && replyMatch[2] ? replyMatch[2].trim() : comment.content.trim(),
        };
    });

    const parentComments = commentsWithMeta.filter(c => c.parentStt === null);
    const replyMap = new Map<number, any[]>();
    commentsWithMeta.filter(c => c.parentStt !== null).forEach(reply => {
        if (!replyMap.has(reply.parentStt!)) {
            replyMap.set(reply.parentStt!, []);
        }
        replyMap.get(reply.parentStt!)!.push(reply);
    });

    const finalResults: any[] = [];
    parentComments.forEach(parent => {
        finalResults.push({ ...parent, level: 0 });
        const replies = replyMap.get(parent.stt) || [];
        replies.sort((a, b) => a.stt - b.stt);
        replies.forEach(reply => {
            finalResults.push({ ...reply, level: 1 });
        });
    });

    return finalResults;
  }, [results]);

  const filteredResults = useMemo(() => {
    return threadedResults.filter(r => r.cleanContent.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [threadedResults, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredResults.map(r => r.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkCopy = () => {
    if (selectedIds.length === 0) return;
    const contentToCopy = results
      .filter(r => selectedIds.includes(r.id))
      .map(r => r.content)
      .join('\n');
    
    navigator.clipboard.writeText(contentToCopy).then(() => {
      showSuccess(`Đã sao chép ${selectedIds.length} bình luận!`);
    }).catch(err => {
      showError("Sao chép thất bại: " + err.message);
    });
  };

  const handleConfirmBulkDelete = async () => {
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
    setIsBulkDeleteAlertOpen(false);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredResults.map(r => {
      const total = mandatoryConditions.length;
      const met = r.metConditionIds?.length ?? total;
      const conditionDisplay = total > 0 ? (met === total ? 'Đạt' : `${met}/${total}`) : 'N/A';
      return { 
        'STT': r.stt,
        'Nội dung Comment': `${' '.repeat(r.level * 4)}${r.cleanContent}`,
        'Loại comment': r.type, 
        'Điều kiện': conditionDisplay 
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comments");
    XLSX.writeFile(workbook, `${project.name} - ${item.name} - Comments.xlsx`);
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

  const handleOpenEditDialog = (comment: any) => {
    setEditingComment(comment);
    setEditedContent(comment.cleanContent);
  };

  const handleUpdateComment = async () => {
    if (!editingComment) return;

    const originalCommentMeta = results.map((c, i) => ({...c, stt: i+1})).find(c => c.id === editingComment.id);
    if (!originalCommentMeta) {
        showError("Không tìm thấy bình luận gốc để cập nhật.");
        return;
    }

    let newFullContent = editedContent;
    const replyMatch = originalCommentMeta.content.match(/^(?:\d+\s*reply\s*->\s*(\d+)\.\s*)/s);
    if (replyMatch) {
        newFullContent = `${replyMatch[0]}${editedContent}`;
    }

    const newResults = results.map(r => r.id === editingComment.id ? { ...r, content: newFullContent } : r);
    
    setResults(newResults);
    setEditingComment(null);

    const { error } = await supabase.from('content_ai_items').update({ content: JSON.stringify(newResults) }).eq('id', item.id);
    if (error) {
      showError("Cập nhật thất bại: " + error.message);
      setResults(results);
    } else {
      showSuccess("Đã cập nhật bình luận!");
      onSave({ ...item, content: JSON.stringify(newResults) });
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return;
    const newResults = results.filter(r => r.id !== commentToDelete.id);

    setResults(newResults);
    setCommentToDelete(null);

    const { error } = await supabase.from('content_ai_items').update({ content: JSON.stringify(newResults) }).eq('id', item.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
      setResults(results);
    } else {
      showSuccess("Đã xóa bình luận!");
      onSave({ ...item, content: JSON.stringify(newResults) });
    }
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

  const handleAddConditionsFromLibrary = (conditionsFromLib: MandatoryCondition[]) => {
    const newConditions = conditionsFromLib.map(c => ({ ...c, id: crypto.randomUUID() }));
    
    const existingContents = new Set(mandatoryConditions.map(c => c.content.trim()));
    const uniqueNewConditions = newConditions.filter(c => !existingContents.has(c.content.trim()));

    setMandatoryConditions(prev => [...prev, ...uniqueNewConditions]);
    showSuccess(`Đã thêm ${uniqueNewConditions.length} điều kiện từ thư viện.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
        <div className="flex items-center gap-4">
          {isGenerating && (
            <p className="text-sm text-slate-500 animate-pulse">AI đang xử lý...</p>
          )}
          <Button onClick={handleGenerateComments} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Đang tạo...' : 'Tạo comment'}
          </Button>
        </div>
      </div>
      
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1" className="border rounded-2xl bg-blue-50 shadow-sm">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
            <div className="flex items-center gap-3"><Settings className="h-5 w-5 text-blue-600" /><span>Cấu hình & Tùy chọn</span></div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 bg-white rounded-b-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-none border rounded-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg"><FileInput className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Nội dung đầu vào</CardTitle>
                      <CardDescription className="text-sm text-slate-500 pt-1">Cung cấp thông tin để AI tạo nội dung.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Ngành</Label><Select value={config.libraryId} onValueChange={v => handleConfigChange('libraryId', v)}><SelectTrigger><SelectValue placeholder="Chọn thư viện prompt" /></SelectTrigger><SelectContent>{promptLibraries.map(lib => (<SelectItem key={lib.id} value={String(lib.id)}>{lib.name}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Nội dung Post</Label><Textarea value={config.postContent} onChange={e => handleConfigChange('postContent', e.target.value)} placeholder="Dán nội dung bài viết cần bình luận..." className="min-h-[120px]" /></div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border rounded-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-lg"><Compass className="h-6 w-6 text-yellow-600" /></div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Định hướng</CardTitle>
                      <CardDescription className="text-sm text-slate-500 pt-1">Cung cấp chỉ dẫn chi tiết và ví dụ cho AI.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Định hướng comment</Label>
                      <Textarea value={config.commentDirection} onChange={e => handleConfigChange('commentDirection', e.target.value)} placeholder="Nhập định hướng chi tiết..." className="min-h-[150px]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reference-example">Ví dụ tham khảo</Label>
                      <Textarea id="reference-example" value={config.referenceExample || ''} onChange={e => handleConfigChange('referenceExample', e.target.value)} placeholder="Dán một bài viết hoặc đoạn văn mẫu vào đây..." className="min-h-[150px]" />
                      <p className="text-xs text-muted-foreground">AI sẽ tham khảo văn phong, cách xưng hô, giọng điệu từ ví dụ này nhưng không sao chép nội dung.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <Card className="shadow-none border rounded-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg"><ListOrdered className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Tùy chọn</CardTitle>
                      <CardDescription className="text-sm text-slate-500 pt-1">Điều chỉnh số lượng và các thiết lập khác.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Số lượng comment</Label><Input type="number" value={config.quantity} onChange={e => handleConfigChange('quantity', e.target.value)} defaultValue={10} /></div>
                    <div className="space-y-2">
                      <Label>Tài liệu liên quan</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start font-normal">
                            {(config.relatedDocumentIds || []).length > 0
                              ? `Đã chọn ${(config.relatedDocumentIds || []).length} tài liệu`
                              : "Chọn tài liệu..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Tìm tài liệu..." />
                            <CommandList>
                              <CommandEmpty>Không tìm thấy tài liệu.</CommandEmpty>
                              <CommandGroup>
                                {projectDocuments.map((doc) => (
                                  <CommandItem
                                    key={doc.id}
                                    onSelect={() => {
                                      const selected = config.relatedDocumentIds || [];
                                      const newSelected = selected.includes(doc.id)
                                        ? selected.filter((id: number) => id !== doc.id)
                                        : [...selected, doc.id];
                                      handleConfigChange('relatedDocumentIds', newSelected);
                                    }}
                                  >
                                    <div className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                      (config.relatedDocumentIds || []).includes(doc.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                    )}>
                                      <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <span className="truncate">{doc.title}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border rounded-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 bg-orange-100 p-3 rounded-lg"><Percent className="h-6 w-6 text-orange-600" /></div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Tỉ lệ comment</CardTitle>
                      <CardDescription className="text-sm text-slate-500 pt-1">Phân bổ các loại comment khác nhau.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    { (config.ratios || []).map((ratio: CommentRatio) => (
                      <div key={ratio.id} className="p-3 border rounded-lg bg-slate-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input placeholder="Loại comment" value={ratio.type} onChange={(e) => handleRatioChange(ratio.id, 'type', e.target.value)} className="flex-1 bg-white" />
                          <div className="flex items-center w-28 flex-shrink-0">
                            <Input type="number" value={ratio.percentage} onChange={(e) => handleRatioChange(ratio.id, 'percentage', e.target.value)} className="rounded-r-none border-r-0 text-right focus-visible:ring-offset-0 focus-visible:ring-0 bg-white" />
                            <div className="flex h-10 items-center rounded-r-md border border-l-0 border-input bg-slate-100 px-3 text-sm text-muted-foreground">%</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveRatio(ratio.id)} disabled={config.ratios?.length <= 1} className="flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                        <Input placeholder={`Nội dung định hướng cho loại "${ratio.type || '...'}"`} value={ratio.content} onChange={(e) => handleRatioChange(ratio.id, 'content', e.target.value)} className="bg-white" />
                      </div>
                    )) }
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" size="sm" onClick={handleAddRatio} className="border-dashed"><PlusCircle className="h-4 w-4 mr-2" />Thêm tỉ lệ</Button>
                      {totalPercentage > 100 && (<p className="text-sm text-destructive font-medium">Tổng tỉ lệ vượt quá 100%!</p>)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-end px-6">
              <Button onClick={() => handleSaveConfig(config)} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
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
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-red-600" /><span>Điều kiện bắt buộc</span></div>
              <Button variant="outline" size="sm" className="bg-white mr-4" onClick={(e) => { e.stopPropagation(); setIsLibraryDialogOpen(true); }}>
                <Library className="mr-2 h-4 w-4" />
                Xem thư viện
              </Button>
            </div>
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
              <Button onClick={handleSaveConditions} disabled={isSavingConditions} className="bg-amber-500 hover:bg-amber-600">
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
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              {selectedIds.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Thao tác ({selectedIds.length})
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={handleBulkCopy}>
                      <Copy className="mr-2 h-4 w-4" />
                      Sao chép nội dung
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsBulkDeleteAlertOpen(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleExportExcel}>
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Xuất Excel</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Xuất Excel</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setIsLogOpen(true)}>
                    <FileText className="h-4 w-4" />
                    <span className="sr-only">Log</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Log</p>
                </TooltipContent>
              </Tooltip>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsFeedbackDialogOpen(true)} disabled={isGenerating || results.length === 0}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Feedback & Tạo lại
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12"><Checkbox checked={selectedIds.length === filteredResults.length && filteredResults.length > 0} onCheckedChange={(checked) => handleSelectAll(!!checked)} /></TableHead><TableHead>STT</TableHead><TableHead>Nội dung comment</TableHead><TableHead>Loại comment</TableHead><TableHead>Điều kiện</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
              <TableBody>
                {isGenerating && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center p-4">
                      <div className="flex items-center justify-center gap-3 text-slate-500">
                        <Bot className="h-5 w-5 animate-bounce" />
                        <span className="font-medium">AI đang làm việc... Tác vụ đang chạy trong nền.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredResults.length > 0 ? filteredResults.map((result) => {
                  const totalConditions = mandatoryConditions.length;
                  const metCount = result.metConditionIds?.length ?? totalConditions;
                  const allConditionsMet = totalConditions > 0 && metCount === totalConditions;

                  return (
                    <TableRow key={result.id}>
                      <TableCell><Checkbox checked={selectedIds.includes(result.id)} onCheckedChange={() => handleSelectRow(result.id)} /></TableCell>
                      <TableCell>{result.stt}</TableCell>
                      <TableCell className="max-w-md break-words">
                        <div className={cn("flex items-start", result.level > 0 && "pl-6")}>
                          {result.level > 0 && (
                            <CornerDownRight className="h-4 w-4 text-slate-400 mr-2 mt-1 flex-shrink-0" />
                          )}
                          <span>{result.cleanContent}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{result.type}</Badge></TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button disabled={totalConditions === 0} className="disabled:cursor-not-allowed">
                              <Badge variant={allConditionsMet ? 'default' : 'secondary'} className={cn(allConditionsMet && 'bg-green-100 text-green-800', 'hover:bg-slate-200')}>
                                {totalConditions === 0 ? '-' : allConditionsMet ? 'Đạt' : `${metCount}/${totalConditions}`}
                              </Badge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-4">
                              <div className="space-y-1"><p className="font-medium text-sm">Checklist Điều kiện</p><p className="text-xs text-muted-foreground">Đây là danh sách các điều kiện đã được đáp ứng.</p></div>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {mandatoryConditions.map(cond => (
                                  <div key={cond.id} className="flex items-start space-x-2">
                                    <Checkbox id={`cond-view-${result.id}-${cond.id}`} checked={result.metConditionIds.includes(cond.id)} disabled />
                                    <Label htmlFor={`cond-view-${result.id}-${cond.id}`} className="font-normal text-sm leading-snug">{cond.content}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleOpenEditDialog(result)}>
                              <Edit className="mr-2 h-4 w-4" />Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setCommentToDelete(result)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                }) : !isGenerating && (<TableRow><TableCell colSpan={6} className="text-center h-24">Chưa có kết quả nào.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GenerationLogDialog isOpen={isLogOpen} onOpenChange={setIsLogOpen} logs={logs} isLoading={isLoadingLogs} onClearLogs={handleClearLogs} />

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn {selectedIds.length} bình luận đã chọn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingComment} onOpenChange={(isOpen) => !isOpen && setEditingComment(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Sửa bình luận</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    value={editedContent} 
                    onChange={(e) => setEditedContent(e.target.value)} 
                    className="min-h-[120px]"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingComment(null)}>Hủy</Button>
                <Button onClick={handleUpdateComment}>Lưu</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!commentToDelete} onOpenChange={(isOpen) => !isOpen && setCommentToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Hành động này sẽ xóa vĩnh viễn bình luận: "{commentToDelete?.content}"
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteComment} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback & Tạo lại</DialogTitle>
            <DialogDescription>
              Nhập feedback của bạn để AI có thể tạo lại danh sách comment tốt hơn. AI sẽ xem xét các comment hiện tại và feedback của bạn để cải thiện.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ví dụ: Các comment cần tự nhiên hơn, thêm một vài bình luận hỏi về giá..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[120px]"
            />
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

      <ConditionLibraryDialog 
        isOpen={isLibraryDialogOpen} 
        onOpenChange={setIsLibraryDialogOpen} 
        onSelect={handleAddConditionsFromLibrary} 
      />
    </div>
  );
};