import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Newspaper, AlertTriangle, ClipboardList, MessageSquareText } from 'lucide-react';

type ContentItem = {
  loai_content: string;
  chu_de: string;
  van_de: string;
  content_demo: string;
  dinh_huong_comment: string;
};

type ContentItemWithGeneratedName = ContentItem & { bai_viet_name: string };

interface ContentDirectionViewProps {
  data: ContentItem[];
}

const Section = ({ title, content, icon: Icon, iconBgColor, iconTextColor }: { title: string, content: string, icon: React.ElementType, iconBgColor: string, iconTextColor: string }) => (
  <div className="p-4 border rounded-lg bg-white">
    <div className="flex items-center gap-3 mb-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBgColor}`}>
        <Icon className={`h-4 w-4 ${iconTextColor}`} />
      </div>
      <h4 className="text-md font-semibold text-slate-700">{title}</h4>
    </div>
    <div className="prose prose-sm max-w-none prose-slate pl-11">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
    </div>
  </div>
);

export const ContentDirectionView = ({ data }: ContentDirectionViewProps) => {
  const groupedData = useMemo(() => {
    if (!data) return {};
    const groups = data.reduce((acc, item) => {
      const key = item.loai_content || 'Chưa phân loại';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);

    for (const key in groups) {
      groups[key] = groups[key].map((item, index) => ({
        ...item,
        bai_viet_name: `Bài viết ${index + 1}`
      }));
    }
    return groups as Record<string, ContentItemWithGeneratedName[]>;
  }, [data]);

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={Object.keys(groupedData)} className="w-full space-y-4">
        {Object.entries(groupedData).map(([type, items]) => (
          <AccordionItem value={type} key={type} className="border-none">
            <Card className="shadow-sm rounded-xl bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
                    <Newspaper className="h-6 w-6 text-blue-600" />
                  </div>
                  <span>{type} ({items.length} bài viết)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index} className="bg-slate-50/70 rounded-lg shadow-none">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">{item.bai_viet_name}: {item.chu_de}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Section 
                          title="Vấn đề / Tình trạng" 
                          content={item.van_de} 
                          icon={AlertTriangle} 
                          iconBgColor="bg-red-100" 
                          iconTextColor="text-red-600" 
                        />
                        <Section 
                          title="Content Demo" 
                          content={item.content_demo} 
                          icon={ClipboardList} 
                          iconBgColor="bg-green-100" 
                          iconTextColor="text-green-600" 
                        />
                        <Section 
                          title="Định hướng comment" 
                          content={item.dinh_huong_comment} 
                          icon={MessageSquareText} 
                          iconBgColor="bg-purple-100" 
                          iconTextColor="text-purple-600" 
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};