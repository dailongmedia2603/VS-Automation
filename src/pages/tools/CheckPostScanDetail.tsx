import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, PlayCircle, Loader2, Calendar as CalendarIcon } from 'lucide-react';
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

type Project = {
  id: number;
  name: string;
  created_at: string;
  keywords: string | null;
  group_ids: string | null;
  scan_frequency: string | null;
  is_active: boolean;
};

type ScanResult = {
  id: number;
  post_content: string;
  post_link: string;
  found_keywords: string[];
  scanned_at: string;
  group_id: string;
};

const CheckPostScanDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Form state
  const [keywords, setKeywords] = useState('');
  const [groupIds, setGroupIds] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('day');
  
  // State for date pickers
  const [scanDateRange, setScanDateRange] = useState<DateRange | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
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
        const [value, unit] = data.scan_frequency?.split('_') || ['1', 'day'];
        setFrequencyValue(value);
        setFrequencyUnit(unit);

        const { data: resultsData, error: resultsError } = await supabase.from('post_scan_results').select('*').eq('project_id', projectId).order('scanned_at', { ascending: false });
        if (resultsError) throw resultsError;
        setResults(resultsData || []);

      } catch (error: any) {
        showError("Không thể tải dữ liệu dự án: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjectData();
  }, [projectId]);

  const filteredResults = useMemo(() => {
    if (!filterDateRange?.from) {
      return results;
    }
    const start = startOfDay(filterDateRange.from);
    const end = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);

    return results.filter(result => {
      const resultDate = new Date(result.scanned_at);
      return isWithinInterval(resultDate, { start, end });
    });
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
    const toastId = showLoading("Đang quét các group...");
    try {
      const timeCheckString = generateTimeCheckString(scanDateRange);
      const { data, error } = await supabase.functions.invoke('scan-posts-for-project', {
        body: { projectId, timeCheckString }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setResults(data);
      showSuccess(`Quét hoàn tất! Tìm thấy ${data.length} bài viết phù hợp.`);
    } catch (error: any) {
      showError(`Quét thất bại: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsScanning(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
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
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm rounded-2xl bg-white">
          <CardHeader>
            <CardTitle>Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Danh sách từ khóa (mỗi từ khóa 1 dòng)</Label>
              <Textarea 
                value={keywords} 
                onChange={e => setKeywords(e.target.value)} 
                className="min-h-[200px] bg-slate-50 border-slate-200 rounded-lg" 
              />
            </div>
            <div className="space-y-2">
              <Label>Danh sách ID Group (mỗi ID 1 dòng)</Label>
              <Textarea 
                value={groupIds} 
                onChange={e => setGroupIds(e.target.value)} 
                className="min-h-[200px] bg-slate-50 border-slate-200 rounded-lg" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl bg-white">
          <CardHeader>
            <CardTitle>Cấu hình tự động</CardTitle>
            <CardDescription>Thiết lập để hệ thống tự động quét.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <Label className="font-medium text-slate-800">Kích hoạt quét tự động</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="space-y-2">
              <Label>Tần suất chạy lại</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={frequencyValue} 
                  onChange={e => setFrequencyValue(e.target.value)} 
                  className="w-24 bg-slate-50 border-slate-200 rounded-lg" 
                />
                <Select value={frequencyUnit} onValueChange={setFrequencyUnit}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Giờ</SelectItem>
                    <SelectItem value="day">Ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle>Kết quả</CardTitle>
                <CardDescription>Kết quả quét sẽ được hiển thị ở đây.</CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal bg-white", !filterDateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDateRange?.from ? (filterDateRange.to ? <>{format(filterDateRange.from, "dd/MM/y")} - {format(filterDateRange.to, "dd/MM/y")}</> : format(filterDateRange.from, "dd/MM/y")) : (<span>Lọc theo ngày</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-2 flex flex-col items-start">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setFilterDateRange({ from: new Date(), to: new Date() })}>Hôm nay</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { const yesterday = subDays(new Date(), 1); setFilterDateRange({ from: yesterday, to: yesterday }); }}>Hôm qua</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setFilterDateRange(undefined)}>Tất cả</Button>
                  </div>
                  <Calendar initialFocus mode="range" defaultMonth={filterDateRange?.from} selected={filterDateRange} onSelect={setFilterDateRange} numberOfMonths={1} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
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
                  <TableHead>Nội dung bài viết</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Từ khóa</TableHead>
                  <TableHead>ID Group</TableHead>
                  <TableHead>Ngày check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length > 0 ? filteredResults.map(result => (
                  <TableRow key={result.id}>
                    <TableCell className="max-w-md"><p className="line-clamp-3 whitespace-pre-wrap">{result.post_content}</p></TableCell>
                    <TableCell><a href={result.post_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem bài viết</a></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{result.found_keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}</div></TableCell>
                    <TableCell>{result.group_id}</TableCell>
                    <TableCell>{format(new Date(result.scanned_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</TableCell>
                  </TableRow>
                )) : (<TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">Chưa có kết quả.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default CheckPostScanDetail;