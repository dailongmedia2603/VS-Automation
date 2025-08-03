import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { vi } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, DollarSign, Cpu, FileInput, FileOutput } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { calculateCost, USD_TO_VND_RATE } from '@/lib/ai-pricing';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

type ProcessedLog = {
  created_at: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
};

const StatCard = ({ title, value, subValue, icon: Icon }: { title: string, value: string, subValue?: string, icon: React.ElementType }) => (
  <Card className="shadow-sm rounded-2xl bg-white">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </CardContent>
  </Card>
);

export const AiCostReport = () => {
  const [logs, setLogs] = useState<ProcessedLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('content_ai_logs')
        .select('created_at, response')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle error silently for now
      } else {
        const processed = data.map(log => ({
          created_at: log.created_at,
          ...calculateCost(log)
        }));
        setLogs(processed);
      }
      setIsLoading(false);
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!dateRange?.from) return logs;
    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;
    return logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= fromDate && logDate <= toDate;
    });
  }, [logs, dateRange]);

  const summaryStats = useMemo(() => {
    return filteredLogs.reduce((acc, log) => {
      acc.totalCostUSD += log.costUSD;
      acc.totalInputTokens += log.inputTokens;
      acc.totalOutputTokens += log.outputTokens;
      return acc;
    }, { totalCostUSD: 0, totalInputTokens: 0, totalOutputTokens: 0 });
  }, [filteredLogs]);

  const chartData = useMemo(() => {
    const dataByDay: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const day = format(new Date(log.created_at), 'dd/MM');
      if (!dataByDay[day]) dataByDay[day] = 0;
      dataByDay[day] += log.costUSD;
    });
    return Object.entries(dataByDay).map(([name, cost]) => ({ name, cost })).reverse();
  }, [filteredLogs]);

  const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const formatUSD = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(amount);

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tổng quan chi phí</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</> : format(dateRange.from, "dd/MM/yyyy")) : (<span>Chọn khoảng ngày</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={vi} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng chi phí" value={formatVND(summaryStats.totalCostUSD * USD_TO_VND_RATE)} subValue={formatUSD(summaryStats.totalCostUSD)} icon={DollarSign} />
        <StatCard title="Tổng Tokens" value={(summaryStats.totalInputTokens + summaryStats.totalOutputTokens).toLocaleString('vi-VN')} icon={Cpu} />
        <StatCard title="Input Tokens" value={summaryStats.totalInputTokens.toLocaleString('vi-VN')} icon={FileInput} />
        <StatCard title="Output Tokens" value={summaryStats.totalOutputTokens.toLocaleString('vi-VN')} icon={FileOutput} />
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Chi phí theo ngày (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} formatter={(value) => [formatUSD(Number(value)), 'Cost']} />
              <Bar dataKey="cost" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Nhật ký chi tiết</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Input Tokens</TableHead>
                  <TableHead>Output Tokens</TableHead>
                  <TableHead className="text-right">Chi phí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}</TableCell>
                    <TableCell><Badge variant="outline">{log.model}</Badge></TableCell>
                    <TableCell>{log.inputTokens.toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{log.outputTokens.toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatVND(log.costUSD * USD_TO_VND_RATE)}
                      <span className="text-xs text-muted-foreground ml-1">({formatUSD(log.costUSD)})</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};