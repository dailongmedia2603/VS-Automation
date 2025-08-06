import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, Calendar, Package, Route, Megaphone, Bot } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type PlanData = { [key: string]: any };
type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
};

interface AiPlanContentViewProps {
  planData: PlanData;
  planStructure: PlanStructure[];
}

const iconMapping: { [key: string]: React.ElementType } = {
  Target,
  Calendar,
  Package,
  Route,
  Megaphone,
  default: Target,
};

const iconColorMapping: { [key: string]: string } = {
  Target: 'bg-blue-100 text-blue-600',
  Calendar: 'bg-red-100 text-red-600',
  Package: 'bg-green-100 text-green-600',
  Route: 'bg-purple-100 text-purple-600',
  Megaphone: 'bg-yellow-100 text-yellow-600',
  default: 'bg-slate-100 text-slate-600',
};

const SectionCard = ({ section, sectionData }: { section: PlanStructure, sectionData: any }) => {
  const Icon = iconMapping[section.icon] || iconMapping.default;
  const colorClasses = iconColorMapping[section.icon] || iconColorMapping.default;
  const [iconBg, iconText] = colorClasses.split(' ');
  const headerBg = iconBg.replace('-100', '-50');

  // Render dynamic groups as tables for a more professional look
  if (section.type === 'dynamic_group' && Array.isArray(sectionData)) {
    const headers = section.sub_fields?.map(f => f.label) || [];
    const keys = section.sub_fields?.map(f => f.id) || [];
    return (
      <Card className="shadow-sm rounded-2xl bg-white overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className={cn("border-b", headerBg)}>
          <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
              <Icon className={cn("h-5 w-5", iconText)} />
            </div>
            {section.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {headers.map(h => <TableHead key={h} className="font-semibold text-slate-600">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionData.map((item, index) => (
                <TableRow key={index}>
                  {keys.map(key => (
                    <TableCell key={key} className="prose prose-sm max-w-none prose-slate align-top">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(item[key] || '')}</ReactMarkdown>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Default card for simple text/textarea
  return (
    <Card className="shadow-sm rounded-2xl bg-white overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className={cn("border-b", headerBg)}>
        <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
            <Icon className={cn("h-5 w-5", iconText)} />
          </div>
          {section.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 prose prose-sm max-w-none prose-slate">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(sectionData)}</ReactMarkdown>
      </CardContent>
    </Card>
  );
};

export const AiPlanContentView = ({ planData, planStructure }: AiPlanContentViewProps) => {
  if (!planData || !planStructure) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
        <Bot className="h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700">Kế hoạch của bạn đang chờ AI</h3>
        <p className="mt-2 text-sm max-w-sm">
          Cung cấp đầy đủ thông tin ở cột bên trái và nhấn "Tạo kế hoạch" để AI bắt đầu làm việc.
        </p>
      </div>
    );
  }

  const groupedSections = useMemo(() => {
    const sectionsWithData = planStructure.map(section => ({
      ...section,
      sectionData: planData[section.id],
    })).filter(s => s.sectionData);

    return sectionsWithData.reduce((acc, section) => {
      const isShort = typeof section.sectionData === 'string' && section.sectionData.length < 150 && !section.sectionData.includes('\n');
      const lastGroup = acc[acc.length - 1];

      if (isShort && lastGroup && lastGroup.length === 1 && lastGroup[0].isShort) {
        lastGroup.push({ ...section, isShort });
      } else {
        acc.push([{ ...section, isShort }]);
      }
      return acc;
    }, [] as Array<Array<PlanStructure & { isShort: boolean }>>);
  }, [planData, planStructure]);

  return (
    <div className="space-y-6">
      {groupedSections.map((group, groupIndex) => (
        <div key={groupIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {group.map(section => (
            <div key={section.id} className={cn(group.length === 1 && "md:col-span-2")}>
              <SectionCard section={section} sectionData={planData[section.id]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};