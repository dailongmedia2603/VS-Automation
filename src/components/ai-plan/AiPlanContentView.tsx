import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, Calendar, Package, Route, Megaphone, Bot } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type PlanData = { [key: string]: any };
type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
}[];

interface AiPlanContentViewProps {
  planData: PlanData;
  planStructure: PlanStructure;
}

const iconMapping: { [key: string]: React.ElementType } = {
  Target,
  Calendar,
  Package,
  Route,
  Megaphone,
};

const renderField = (label: string, value: any) => {
  if (!value) return null;
  return (
    <div className="mb-4">
      <h4 className="font-semibold text-sm text-slate-600 mb-1">{label}</h4>
      <div className="prose prose-sm max-w-none prose-slate">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(value)}</ReactMarkdown>
      </div>
    </div>
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

  return (
    <div className="space-y-6">
      {planStructure.map(section => {
        const Icon = iconMapping[section.icon] || Target;
        const sectionData = planData[section.id];

        if (!sectionData) return null;

        return (
          <Card key={section.id} className="shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
                <Icon className="h-6 w-6 text-blue-600" />
                {section.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {section.type === 'dynamic_group' && Array.isArray(sectionData) ? (
                <Accordion type="multiple" className="w-full space-y-3">
                  {sectionData.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg bg-white shadow-sm">
                      <AccordionTrigger className="px-4 py-3 font-semibold text-slate-700">
                        {item.serviceType || `Mục ${index + 1}`}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 border-t">
                        {section.sub_fields?.map(field => (
                          <div key={field.id} className="py-2 border-b last:border-b-0">
                            {renderField(field.label, item[field.id])}
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="prose prose-sm max-w-none prose-slate">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(sectionData)}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};