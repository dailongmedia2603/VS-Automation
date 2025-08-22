import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, PlayCircle, Loader2, Calendar as CalendarIcon, FileText, Download, Trash2, Settings, Share } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns"
import { vi } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as XLSX from 'xlsx';
import { AiLogDialog } from '@/components/tools/AiLogDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SharePostScanDialog } from '@/components/tools/SharePostScanDialog';

type Project = {
  id: number;
  name: string;
  created_at: string;
  keywords: string | null;
  group_ids: string | null;
  scan_frequency: string | null;
  is_active: boolean;
  is_ai_check_active: boolean;
  post_scan_ai_prompt: string | null;
  is_public: boolean;
  public_id: string | null;
};

type ScanResult = {
  id: number;
  post_content: string;
  post_link: string;
  found_keywords: string[];
  scanned_at: string;
  group_id: string;
  ai_check_result: string | null;
  ai_check_details: { prompt: string; response: any; } | null;
  post_created_at: string | null;
};

type ScanLog = {
  id: number;
  project_id: number;
  request_urls: string[];
  created_at: string;
};

const CheckPostScanDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [lastScanLog, setLastScanLog] = useState<ScanLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualScanLogOpen, setIsManualScanLogOpen] = useState(false);
  const [isHistoryLogOpen, setIsHistoryLogOpen] = useState(false);
  const [isAiLogOpen, setIsAiLogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedResultIds, setSelectedResultIds] = useState<number[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Form state
  const [keywords, setKeywords] = useState('');
  const [groupIds, setGroupIds] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isAiCheckActive, setIsAiCheckActive] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('day');
  
  // State for date pickers
  const [scanDateRange, setScanDateRange] = useState<DateRange | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const [filterDatePickerOpen, setFilterDatePickerOpen] = useState(false);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('post_scan_projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      setProject(data);
      setKeywords(data.keywords || '');
      setGroupIds(data.group_ids || '');
      setIsActive(data.is_active);
      setIsAiCheckActive(data.is_ai_check_active);
      setAiPrompt(data.post_scan_ai_prompt || '');
      const [value, unit] = data.scan_frequency?.split('_') || ['1', 'day'];
      setFrequencyValue(value);
      setFrequencyUnit(unit);

      const { data: resultsData, error: resultsError } = await supabase.from('post_scan_results').select('*').eq('project_id', projectId).order('scanned_at', { ascending: false });
      if (resultsError) throw resultsError;
      setResults(resultsData || []);

      const { data: logsData, error: logsError } = await supabase.from('log_post_scan').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (error: any) {
      showError("Không thể tải dữ liệu dự án: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const filteredResults = useMemo(() => {
    let tempResults = results.filter(result => result.ai_check_result !== 'Có');

    if (filterDateRange?.from) {
      const start = startOfDay(filterDateRange.from);
      const end = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);
      tempResults = tempResults.filter(result => {
        const resultDate = new Date(result.scanned_at);
        return isWithinInterval(resultDate, { start, end });
      });
    }

    const uniqueResults: ScanResult[] = [];
    const seen = new Set<string>();

    for (const result of tempResults) {
      const keywordsKey = [...(result.found_keywords || [])].sort().join(',');
      const uniqueKey = `${result.post_content}|${keywordsKey}`;

      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }, [results, filterDateRange]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('post_scan_projects')
      .update({
        keywords,
        group_ids: groupIds,
        is_active: isActive,
        is_ai_check_active: isAiCheckActive,
        post_scan_ai_prompt: aiPrompt,
        scan_frequency: `${frequencyValue}_${frequencyUnit}`
      })
      .eq('id', project.id);
    
    if (error) showError("Lưu thất bại: " + error.message);
    else showSuccess("Đã lưu cấu hình thành công!");
    setIsSaving(false);
  };

  const generateTimeCheckString = (range: DateRange | undefined): string => {
    if (!range?.from) return '';
    const since = startOfDay(range.from).toISOString();
    const until = endOfDay(range.to || range.from).toISOString();
    return `&since=${since}&until=${until}`;
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    const totalSteps = isAiCheckActive ? 2 : 1;
    let toastId;

    try {
      // Step 1: Scan and filter posts
      toastId = showLoading(`Bước 1/${totalSteps}: Đang quét bài viết...`);
      const timeCheckString = generateTimeCheckString(scanDateRange);
      const { data: scanData, error: scanError } = await supabase.functions.invoke('scan-and-filter-posts', {
        body: { projectId, timeCheckString }
      });
      if (scanError) throw scanError;
      if (scanData.error) throw new Error(scanData.error);
      
      let finalPosts = scanData.posts;

      // Step 2 (Optional): AI Check
      if (isAiCheckActive && finalPosts.length > 0) {
        dismissToast(toastId);
        toastId = showLoading(`Bước 2/2: AI đang check content...`);
        const { data: aiData, error: aiError } = await supabase.functions.invoke('check-posts-with-ai', {
          body: { projectId, posts: finalPosts }
        });
        if (aiError) throw aiError;
        if (aiData.error) throw new Error(aiData.error);
        finalPosts = aiData.posts;
      }

      // Final Step: Store results
      const { data: storeData, error: storeError } = await supabase.functions.invoke('store-scan-results', {
        body: { projectId, posts: finalPosts }
      });
      if (storeError) throw storeError;
      if (storeData.error) throw new Error(storeData.error);

      setResults(storeData);
      dismissToast(toastId);
      showSuccess(`Quét hoàn tất! Tìm thấy ${finalPosts.filter((p: any) => p.ai_check_result !== 'Có').length} bài viết mới.`);
      
      const { data: newLogsData, error: newLogsError } = await supabase.from('log_post_scan').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (newLogsError) throw newLogsError;
      setLogs(newLogsData || []);
      setLastScanLog(newLogsData?.[0] || null);

    } catch (error: any) {
      if (toastId) dismissToast(toastId);
      showError(`Quét thất bại: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilterDateSelect = (range: DateRange | undefined) => {
    setFilterDateRange(range);
    if (range?.from && range?.to) {
      setFilterDatePickerOpen(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredResults.length === 0) {
      showError("Không có dữ liệu để xuất.");
      return;
    }
    setIsExporting(true);
    const dataToExport = filteredResults.map(result => ({
      'ID Group': result.group_id,
      'Từ khóa': result.found_keywords.join(', '),
      'Nội dung bài viết': result.post_content,
      'Link': result.post_link,
      'Ngày đăng': result.post_created_at ? format(new Date(result.post_created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scan Results");
    XLSX.writeFile(workbook, `export_${project?.name || 'scan'}.xlsx`);
    setIsExporting(false);
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    const toastId = showLoading(`Đang xóa ${selectedResultIds.length} kết quả...`);
    try {
        const { error } = await supabase
            .from('post_scan_results')
            .delete()
            .in('id', selectedResultIds);
        
        if (error) throw error;

        showSuccess("Đã xóa thành công!");
        setResults(prev => prev.filter((r: ScanResult) => !selectedResultIds.includes(r.id)));
        setSelectedResultIds([]);
    } catch (error: any) {
        showError("Xóa thất bại: " + error.message);
    } finally {
        dismissToast(toastId);
        setIsDeleteAlertOpen(false);
        setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl mb-6" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </main>
    );
  }

  if (!project) return <main className="flex-1 p-6 sm:p-8 bg-slate-50">...</main>;

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/tools/check-post-scan">
            <Button variant="outline" size="icon" className="bg-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Tạo lúc: {format(new Date(project.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white" onClick={() => setIsShareDialogOpen(true)}>
            <Share className="mr-2 h-4 w-4" />
            Chia sẻ
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardContent className="p-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="config" className="border-b-0">
              <AccordionTrigger className="text-base font-semibold hover:no-underline px-2">
                <div className="flex items-center gap-2"><Settings className="h-5 w-5" />Cấu hình & Tùy chọn</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 shadow-none border">
                    <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Danh sách từ khóa (mỗi từ khóa 1 dòng)</Label><Textarea value={keywords} onChange={e => setKeywords(e.target.value)} className="min-h-[150px] bg-slate-50" /></div>
                      <div className="space-y-2"><Label>Danh sách ID Group (mỗi ID 1 dòng)</Label><Textarea value={groupIds} onChange={e => setGroupIds(e.target.value)} className="min-h-[150px] bg-slate-50" /></div>
                    </CardContent>
                  </Card>
                  <div className="space-y-6">
                    <Card className="shadow-none border">
                      <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                          <CardTitle>Check content scan</CardTitle>
                          <CardDescription>Sử dụng AI để lọc nội dung bài viết.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsAiLogOpen(true)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Log
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between"><Label>Kích hoạt AI Check</Label><Switch checked={isAiCheckActive} onCheckedChange={setIsAiCheckActive} /></div>
                        {isAiCheckActive && (<><p className="text-xs text-muted-foreground">Chỉ hiển thị khi kết quả AI phản hồi là: <strong>KHÔNG</strong></p><div className="space-y-2"><Label>Prompt cho AI</Label><Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="min-h-[80px] bg-slate-50" /></div></>)}
                      </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Cấu hình tự động</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setIsHistoryLogOpen(true)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Log
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between"><Label>Kích hoạt quét tự động</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
                        <div className="space-y-2"><Label>Tần suất chạy lại</Label><div className="flex items-center gap-2"><Input type="number" value={frequencyValue} onChange={e => setFrequencyValue(e.target.value)} className="w-24 bg-slate-50" /><Select value={frequencyUnit} onValueChange={setFrequencyUnit}><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minute">Phút</SelectItem><SelectItem value="hour">Giờ</SelectItem><SelectItem value="day">Ngày</SelectItem></SelectContent></Select></div></div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Kết quả</CardTitle>
              {selectedResultIds.length > 0 ? (
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa ({selectedResultIds.length})
                </Button>
              ) : (
                <Popover open={filterDatePickerOpen} onOpenChange={setFilterDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal bg-white", !filterDateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDateRange?.from ? (filterDateRange.to ? <>{format(filterDateRange.from, "dd/MM/y")} - {format(filterDateRange.to, "dd/MM/y")}</> : format(filterDateRange.from, "dd/MM/y")) : (<span>Lọc theo ngày</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <div className="p-2 flex flex-col items-start">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { setFilterDateRange({ from: new Date(), to: new Date() }); setFilterDatePickerOpen(false); }}>Hôm nay</Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { const yesterday = subDays(new Date(), 1); setFilterDateRange({ from: yesterday, to: yesterday }); setFilterDatePickerOpen(false); }}>Hôm qua</Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { setFilterDateRange(undefined); setFilterDatePickerOpen(false); }}>Tất cả</Button>
                    </div>
                    <Calendar initialFocus mode="range" defaultMonth={filterDateRange?.from} selected={filterDateRange} onSelect={handleFilterDateSelect} numberOfMonths={1} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="bg-white" onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Xuất Excel
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal bg-white", !scanDateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scanDateRange?.from ? (scanDateRange.to ? <>{format(scanDateRange.from, "dd/MM/y")} - {format(scanDateRange.to, "dd/MM/y")}</> : format(scanDateRange.from, "dd/MM/y")) : (<span>Chọn khoảng thời gian quét</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar initialFocus mode="range" defaultMonth={scanDateRange?.from} selected={scanDateRange} onSelect={setScanDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
              <Button variant="outline" className="bg-white" onClick={() => setIsManualScanLogOpen(true)} disabled={!lastScanLog}>
                <FileText className="mr-2 h-4 w-4" />
                Log
              </Button>
              <Button onClick={handleRunScan} disabled={isScanning} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Chạy quét
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedResultIds.length === filteredResults.length && filteredResults.length > 0}
                      onCheckedChange={(checked) => {
                          if (checked) {
                              setSelectedResultIds(filteredResults.map(r => r.id));
                          } else {
                              setSelectedResultIds([]);
                          }
                      }}
                    />
                  </TableHead>
                  <TableHead>Nội dung bài viết</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Từ khóa</TableHead>
                  <TableHead>ID Group</TableHead>
                  <TableHead>Ngày đăng</TableHead>
                  <TableHead>Ngày check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length > 0 ? filteredResults.map(result => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedResultIds.includes(result.id)}
                        onCheckedChange={() => {
                            setSelectedResultIds(prev => 
                                prev.includes(result.id)
                                    ? prev.filter(id => id !== result.id)
                                    : [...prev, result.id]
                            );
                        }}
                      />
                    </TableCell>
                    <TableCell className="max-w-md"><p className="line-clamp-3 whitespace-pre-wrap">{result.post_content}</p></TableCell>
                    <TableCell><a href={result.post_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem bài viết</a></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{result.found_keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}</div></TableCell>
                    <TableCell>{result.group_id}</TableCell>
                    <TableCell>{result.post_created_at ? format(new Date(result.post_created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</TableCell>
                    <TableCell>{format(new Date(result.scanned_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</TableCell>
                  </TableRow>
                )) : (<TableRow><TableCell colSpan={7} className="text-center h-24 text-slate-500">Chưa có kết quả.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isManualScanLogOpen} onOpenChange={setIsManualScanLogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nhật ký quét API (Thủ công)</DialogTitle>
            <DialogDescription>
              Đây là danh sách các URL đã được sử dụng trong lần quét thủ công gần nhất.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-4">
            {lastScanLog && lastScanLog.request_urls && lastScanLog.request_urls.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Quét lúc: {format(new Date(lastScanLog.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}</p>
                <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs space-y-2">
                  {lastScanLog.request_urls.map((url, index) => (
                    <div key={index} className="break-all">{url}</div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Chưa có log nào được ghi lại.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManualScanLogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryLogOpen} onOpenChange={setIsHistoryLogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lịch sử quét</DialogTitle>
            <DialogDescription>
              Danh sách các lần quét đã được thực hiện cho dự án này.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-4">
            {logs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {logs.map((logItem, index) => (
                  <AccordionItem value={`item-${index}`} key={logItem.id} className="border rounded-lg px-4">
                    <AccordionTrigger>
                      Quét lúc: {format(new Date(logItem.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      <h4 className="font-semibold text-sm">URL đã sử dụng:</h4>
                      <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs space-y-2">
                        {logItem.request_urls.map((url, urlIndex) => (
                          <div key={urlIndex} className="break-all">{url}</div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-slate-500 text-center py-8">Chưa có lịch sử quét nào.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryLogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AiLogDialog 
        isOpen={isAiLogOpen} 
        onOpenChange={setIsAiLogOpen} 
        logs={results.filter(r => r.ai_check_details)} 
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn {selectedResultIds.length} kết quả đã chọn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {project && (
        <SharePostScanDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          project={project}
          onProjectUpdate={(updates) => setProject(p => p ? { ...p, ...updates } : null)}
        />
      )}
    </main>
  );
};

export default CheckPostScanDetail;