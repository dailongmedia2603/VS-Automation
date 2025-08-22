import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, ScanSearch, Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { showError, showSuccess } from '@/utils/toast';

type Project = {
  id: number;
  name: string;
  keywords: string | null;
};

type ScanResult = {
  id: number;
  post_content: string;
  post_link: string;
  found_keywords: string[];
  scanned_at: string;
  group_id: string;
  post_created_at: string | null;
};

const PublicPostScan = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const [filterDatePickerOpen, setFilterDatePickerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!publicId) {
        setError("Không tìm thấy ID dự án.");
        setIsLoading(false);
        return;
      }

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('post_scan_projects')
          .select('id, name, keywords')
          .eq('public_id', publicId)
          .eq('is_public', true)
          .single();

        if (projectError || !projectData) {
          throw new Error("Không tìm thấy dự án hoặc dự án không được công khai.");
        }
        setProject(projectData);

        const { data: resultsData, error: resultsError } = await supabase
          .from('post_scan_results')
          .select('id, post_content, post_link, found_keywords, scanned_at, group_id, post_created_at')
          .eq('project_id', projectData.id)
          .order('post_created_at', { ascending: false });

        if (resultsError) throw resultsError;
        setResults(resultsData || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicData();
    const interval = setInterval(fetchPublicData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [publicId]);

  const filteredResults = useMemo(() => {
    let tempResults = results;

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
      'Ngày check': format(new Date(result.scanned_at), 'dd/MM/yyyy HH:mm', { locale: vi }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scan Results");
    XLSX.writeFile(workbook, `export_${project?.name || 'scan'}.xlsx`);
    setIsExporting(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Lỗi truy cập</h1>
        <p className="text-slate-600 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <main className="p-6 sm:p-8 md:p-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg rounded-2xl">
          <CardHeader className="bg-slate-100/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                  <ScanSearch className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">{project?.name}</CardTitle>
                  <CardDescription>Kết quả quét bài viết theo thời gian thực</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                <Button variant="outline" className="bg-white" onClick={handleExportExcel} disabled={isExporting}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Xuất Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
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
                      <TableCell className="max-w-md"><p className="line-clamp-3 whitespace-pre-wrap">{result.post_content}</p></TableCell>
                      <TableCell><a href={result.post_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem bài viết</a></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{result.found_keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}</div></TableCell>
                      <TableCell>{result.group_id}</TableCell>
                      <TableCell>{result.post_created_at ? format(new Date(result.post_created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</TableCell>
                      <TableCell>{format(new Date(result.scanned_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</TableCell>
                    </TableRow>
                  )) : (<TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">Chưa có kết quả nào.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PublicPostScan;