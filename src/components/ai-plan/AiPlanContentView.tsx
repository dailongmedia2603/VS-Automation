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

  if (section.type === 'dynamic_group' && Array.isArray(sectionData) && sectionData.length > 0) {
    const headers = section.sub_fields?.map(f => f.label) || [];
    const keys = section.sub_fields?.map(f => f.id) || [];
    return (
      <Card className="shadow-md rounded-xl bg-white h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-slate-200/60">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconBg)}>
              <Icon className={cn("h-6 w-6", iconText)} />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">{section.label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {headers.map(h => <TableHead key={h} className="font-semibold text-slate-600">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionData.map((item, index) => (
                  <TableRow key={index} className="border-b last:border-b-0">
                    {keys.map(key => (
                      <TableCell key={key} className="prose prose-sm max-w-none prose-slate align-top py-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(item[key] || '')}</ReactMarkdown>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-xl bg-white h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-slate-200/60">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("h-6 w-6", iconText)} />
          </div>
          <CardTitle className="text-xl font-bold text-slate-800">{section.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="prose prose-sm max-w-none prose-slate text-slate-600 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(sectionData)}</ReactMarkdown>
        </div>
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
      const isShort = typeof section.sectionData === 'string' && section.sectionData.length < 200 && !section.sectionData.includes('\n');
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