import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, Save, Loader2, Search, Trash2, Download, FileText, PlusCircle, MoreHorizontal, Edit } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type Project = { id: number; name: string; };
type ProjectItem = { id: number; name: string; type: 'article' | 'comment'; content: string | null; config: any; };
type PromptLibrary = { id: number; name: string; };
type CommentRatio = { id: string; percentage: number; content: string; };
type GeneratedComment = { id: string; content: string; status: 'Đạt' | 'Không đạt'; };

interface CommentGenerationDetailProps {
  project: Project;
  item: ProjectItem;
  promptLibraries: PromptLibrary[];
  onSave: () => void;
}

export const CommentGenerationDetail = ({ project, item, promptLibraries, onSave }: CommentGenerationDetailProps) => {
  const [config, setConfig] = useState<any>({});
  const [results, setResults] = useState<GeneratedComment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  useEffect(() => {
    setConfig(item.config || {});
    try {
      const parsedContent = JSON.parse(item.content || '[]');
      setResults(Array.isArray(parsedContent) ? parsedContent : []);
    } catch {
      setResults([]);
    }
  }, [item]);

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
      .update({ config })
      .eq('id', item.id)
      .select();

    if (error) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } else if (data && data.length > 0) {
      showSuccess("Đã lưu cấu hình thành công!");
      onSave();
    } else {
      showError("Lưu thất bại. Không tìm thấy mục để cập nhật hoặc bạn không có quyền.");
    }
    setIsSaving(false);
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => r.content.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [results, searchTerm]);

  const handleExportExcel = () => {
    const dataToExport = filteredResults.map(r => ({
      'Nội dung Comment': r.content,
      'Chất lượng': r.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comments");
    XLSX.writeFile(workbook, `${project.name} - ${item.name} - Comments.xlsx`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
      
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
            <div><CardTitle>Kết quả</CardTitle><CardDescription>Danh sách các bình luận được tạo bởi AI.</CardDescription></div>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Tìm kiếm..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              {selectedIds.length > 0 && (<Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Xóa ({selectedIds.length})</Button>)}
              <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Xuất Excel</Button>
              <Button variant="outline" onClick={() => setIsLogOpen(true)}><FileText className="mr-2 h-4 w-4" />Log</Button>
              <Button className="bg-blue-600 hover:bg-blue-700"><PlusCircle className="mr-2 h-4 w-4" />Tạo thêm comment</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12"><Checkbox /></TableHead><TableHead>STT</TableHead><TableHead>Nội dung comment</TableHead><TableHead>Lọc chất lượng</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredResults.length > 0 ? filteredResults.map((result, index) => (
                  <TableRow key={result.id}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-md break-words">{result.content}</TableCell>
                    <TableCell><Badge variant={result.status === 'Đạt' ? 'default' : 'destructive'} className={cn(result.status === 'Đạt' && 'bg-green-100 text-green-800')}>{result.status}</Badge></TableCell>
                    <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>
                )) : (<TableRow><TableCell colSpan={5} className="text-center h-24">Chưa có kết quả nào.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};