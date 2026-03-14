import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postScanService, PostScanProject, PostScanResult, PostScanLog } from '@/api/tools';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, PlayCircle, Loader2, Calendar as CalendarIcon, FileText, Download, Trash2, Settings, Share } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as XLSX from 'xlsx';
import { AiLogDialog } from '@/components/tools/AiLogDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SharePostScanDialog } from '@/components/tools/SharePostScanDialog';
import { ComprehensiveScanLogDialog } from '@/components/tools/ComprehensiveScanLogDialog';

const CheckPostScanDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  // React Query - data loads instantly from cache
  const { data: project, isLoading: isLoadingProject, refetch: refetchProject } = useQuery({
    queryKey: ['post-scan-project', projectId],
    queryFn: () => postScanService.getProject(Number(projectId)),
    enabled: !!projectId,
  });

  const { data: results = [], isLoading: isLoadingResults, refetch: refetchResults } = useQuery({
    queryKey: ['post-scan-results', projectId],
    queryFn: () => postScanService.getResults(Number(projectId)),
    enabled: !!projectId,
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['post-scan-logs', projectId],
    queryFn: () => postScanService.getLogs(Number(projectId)),
    enabled: !!projectId,
  });

  const isLoading = isLoadingProject || isLoadingResults;

  // UI State
  const [isAiLogOpen, setIsAiLogOpen] = useState(false);
  const [selectedResultIds, setSelectedResultIds] = useState<number[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isComprehensiveLogOpen, setIsComprehensiveLogOpen] = useState(false);

  // Form state (initialized from project)
  const [keywords, setKeywords] = useState('');
  const [groupIds, setGroupIds] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isAiCheckActive, setIsAiCheckActive] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('day');

  // Date picker state
  const [scanDateRange, setScanDateRange] = useState<DateRange | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const [filterDatePickerOpen, setFilterDatePickerOpen] = useState(false);

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setKeywords(project.keywords || '');
      setGroupIds(project.group_ids || '');
      setIsActive(project.is_active);
      setIsAiCheckActive(project.is_ai_check_active);
      setAiPrompt(project.post_scan_ai_prompt || '');
      const [value, unit] = project.scan_frequency?.split('_') || ['1', 'day'];
      setFrequencyValue(value);
      setFrequencyUnit(unit);
    }
  }, [project]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () => postScanService.saveConfig(Number(projectId), {
      keywords,
      group_ids: groupIds,
      is_active: isActive,
      is_ai_check_active: isAiCheckActive,
      post_scan_ai_prompt: aiPrompt,
      scan_frequency: `${frequencyValue}_${frequencyUnit}`
    }),
    onSuccess: () => {
      showSuccess("Đã lưu cấu hình thành công!");
      queryClient.invalidateQueries({ queryKey: ['post-scan-project', projectId] });
    },
    onError: (err) => showError("Lưu thất bại: " + (err as Error).message),
  });

  const scanMutation = useMutation({
    mutationFn: (timeCheckString?: string) => postScanService.runComprehensiveScan(Number(projectId), timeCheckString),
    onSuccess: (data) => {
      if (data.success) {
        const filteredCount = data.posts.filter(p => p.ai_check_result !== 'Có').length;
        showSuccess(`Quét hoàn tất! Tìm thấy ${filteredCount} bài viết mới.`);
        refetchResults();
        refetchLogs();
      } else {
        showError(`Quét thất bại: ${data.error}`);
      }
    },
    onError: (err) => showError(`Quét thất bại: ${(err as Error).message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postScanService.deleteMultipleResults(selectedResultIds),
    onSuccess: () => {
      showSuccess("Đã xóa thành công!");
      setSelectedResultIds([]);
      setIsDeleteAlertOpen(false);
      refetchResults();
    },
    onError: (err) => showError("Xóa thất bại: " + (err as Error).message),
  });

  // Filtered results
  const filteredResults = useMemo(() => {
    let tempResults = results.filter((result: PostScanResult) => result.ai_check_result !== 'Có');

    if (filterDateRange?.from) {
      const start = startOfDay(filterDateRange.from);
      const end = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);
      tempResults = tempResults.filter((result: PostScanResult) => {
        const resultDate = new Date(result.scanned_at);
        return isWithinInterval(resultDate, { start, end });
      });
    }

    // Deduplicate by content + keywords
    const uniqueResults: PostScanResult[] = [];
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

  const generateTimeCheckString = (range: DateRange | undefined): string => {
    if (!range?.from) return '';
    const since = startOfDay(range.from).toISOString();
    const until = endOfDay(range.to || range.from).toISOString();
    return `&since=${since}&until=${until}`;
  };

  const handleSave = () => {
    if (!project) return;
    saveMutation.mutate();
  };

  const handleRunScan = async () => {
    const toastId = showLoading(`Đang quét bài viết${isAiCheckActive ? ' + AI check' : ''}...`);
    const timeCheckString = generateTimeCheckString(scanDateRange);
    try {
      await scanMutation.mutateAsync(timeCheckString);
    } finally {
      dismissToast(toastId);
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
    const dataToExport = filteredResults.map((result: PostScanResult) => ({
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
    showSuccess("Đã xuất file Excel thành công!");
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

  if (!project) return <main className="flex-1 p-6 sm:p-8 bg-slate-50">Không tìm thấy dự án.</main>;

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
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                      <CardHeader>
                        <CardTitle>Cấu hình tự động</CardTitle>
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
              <CardTitle>Kết quả ({filteredResults.length})</CardTitle>
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
              <Button variant="outline" className="bg-white" onClick={handleExportExcel}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
              <Button variant="outline" className="bg-white" onClick={() => setIsComprehensiveLogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Log
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
              <Button onClick={handleRunScan} disabled={scanMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                {scanMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
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
                          setSelectedResultIds(filteredResults.map((r: PostScanResult) => r.id));
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
                {filteredResults.length > 0 ? filteredResults.map((result: PostScanResult) => (
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

      <ComprehensiveScanLogDialog
        isOpen={isComprehensiveLogOpen}
        onOpenChange={setIsComprehensiveLogOpen}
        projectId={project.id}
        logs={logs}
      />

      <AiLogDialog
        isOpen={isAiLogOpen}
        onOpenChange={setIsAiLogOpen}
        logs={results.filter((r: PostScanResult) => r.ai_check_details)}
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
            <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          onProjectUpdate={(updates) => {
            refetchProject();
          }}
        />
      )}
    </main>
  );
};

export default CheckPostScanDetail;