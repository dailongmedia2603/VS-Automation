import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Swords, Shield, TrendingUp, AlertTriangle, Users, BarChart2, MessageSquare } from 'lucide-react';

type PlanData = any;

interface AiPlanContentViewProps {
  planData: PlanData;
}

export const AiPlanContentView = ({ planData }: AiPlanContentViewProps) => {
  const kpiChartData = planData?.kpis
    ? String(planData.kpis)
        .split('\n')
        .map(line => line.replace(/^- /, '').trim())
        .filter(Boolean)
        .map((kpi, index) => ({ name: kpi, value: 100 - index * 15 }))
    : [];

  if (!planData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
        <p className="mt-1 text-sm max-w-sm">Không có dữ liệu kế hoạch để hiển thị.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-8 bg-blue-600 text-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold">Tóm tắt chiến lược</h2>
        <p className="mt-2 text-blue-100">{planData.executiveSummary}</p>
      </div>

      <Tabs defaultValue="strengths">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strengths"><Swords className="mr-2 h-4 w-4" />Điểm mạnh</TabsTrigger>
          <TabsTrigger value="weaknesses"><Shield className="mr-2 h-4 w-4" />Điểm yếu</TabsTrigger>
          <TabsTrigger value="opportunities"><TrendingUp className="mr-2 h-4 w-4" />Cơ hội</TabsTrigger>
          <TabsTrigger value="threats"><AlertTriangle className="mr-2 h-4 w-4" />Thách thức</TabsTrigger>
        </TabsList>
        <TabsContent value="strengths" className="p-4 prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{planData.swotAnalysis.strengths}</ReactMarkdown></TabsContent>
        <TabsContent value="weaknesses" className="p-4 prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{planData.swotAnalysis.weaknesses}</ReactMarkdown></TabsContent>
        <TabsContent value="opportunities" className="p-4 prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{planData.swotAnalysis.opportunities}</ReactMarkdown></TabsContent>
        <TabsContent value="threats" className="p-4 prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{planData.swotAnalysis.threats}</ReactMarkdown></TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Chỉ số đo lường (KPIs)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kpiChartData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} background={{ fill: '#eee', radius: 4 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Đối tượng mục tiêu</CardTitle></CardHeader><CardContent><p className="text-sm">{planData.targetAudience}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Kênh triển khai</CardTitle></CardHeader><CardContent><div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{planData.marketingChannels}</ReactMarkdown></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Trụ cột nội dung</CardTitle></CardHeader><CardContent><div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{planData.contentPillars}</ReactMarkdown></div></CardContent></Card>
    </div>
  );
};