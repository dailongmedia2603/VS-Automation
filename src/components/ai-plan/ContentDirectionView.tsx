import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Newspaper, AlertTriangle, ClipboardList, MessageSquareText, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const DetailSection = ({ title, content, icon: Icon, iconBgColor, iconTextColor }: { title: string, content: string, icon: React.ElementType, iconBgColor: string, iconTextColor: string }) => (
  <div>
    <div className="flex items-center gap-3 mb-2">
      <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", iconBgColor)}>
        <Icon className={cn("h-5 w-5", iconTextColor)} />
      </div>
      <h4 className="text-md font-semibold text-slate-800">{title}</h4>
    </div>
    <div className="prose prose-sm max-w-none prose-slate pl-[52px] text-slate-600">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '(Chưa có nội dung)'}</ReactMarkdown>
    </div>
  </div>
);

export const ContentDirectionView = ({ data }: ContentDirectionViewProps) => {
  const [selectedItem, setSelectedItem] = useState<ContentItemWithGeneratedName | null>(null);

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

  useEffect(() => {
    const firstGroupKey = Object.keys(groupedData)[0];
    if (firstGroupKey && groupedData[firstGroupKey].length > 0) {
      setSelectedItem(groupedData[firstGroupKey][0]);
    } else {
      setSelectedItem(null);
    }
  }, [groupedData]);

  const NavigationPanel = () => (
    <ScrollArea className="h-full">
      <div className="p-2">
        <Accordion type="multiple" defaultValue={Object.keys(groupedData)} className="w-full space-y-1">
          {Object.entries(groupedData).map(([type, items]) => (
            <AccordionItem value={type} key={type} className="border-none">
              <AccordionTrigger className="px-2 py-2 text-sm font-semibold hover:no-underline rounded-md hover:bg-slate-100">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-blue-600" />
                  <span>{type} ({items.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pl-4">
                <div className="flex flex-col gap-1">
                  {items.map((item, index) => (
                    <Button
                      key={`${item.bai_viet_name}-${index}`}
                      variant="ghost"
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "w-full justify-start h-auto py-2 px-3 text-left",
                        selectedItem === item ? "bg-blue-100 text-blue-700 font-semibold" : ""
                      )}
                    >
                      <span className="truncate">{item.bai_viet_name}: {item.chu_de}</span>
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </ScrollArea>
  );

  const DetailPanel = () => {
    if (!selectedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
          <LayoutList className="h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700">Chọn một bài viết</h3>
          <p className="mt-2 text-sm max-w-sm">
            Nội dung chi tiết của bài viết sẽ được hiển thị ở đây.
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <div className="p-6">
          <Card className="bg-white rounded-xl shadow-none border-none">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">{selectedItem.chu_de}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <DetailSection 
                title="Vấn đề / Tình trạng" 
                content={selectedItem.van_de} 
                icon={AlertTriangle} 
                iconBgColor="bg-red-100" 
                iconTextColor="text-red-600" 
              />
              <DetailSection 
                title="Content Demo" 
                content={selectedItem.content_demo} 
                icon={ClipboardList} 
                iconBgColor="bg-green-100" 
                iconTextColor="text-green-600" 
              />
              <DetailSection 
                title="Định hướng comment" 
                content={selectedItem.dinh_huong_comment} 
                icon={MessageSquareText} 
                iconBgColor="bg-purple-100" 
                iconTextColor="text-purple-600" 
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden h-[600px] flex flex-col">
        <div className="grid md:grid-cols-[300px_1fr] flex-grow min-h-0">
            <div className="h-full border-r bg-slate-50/70">
                <NavigationPanel />
            </div>
            <div className="h-full">
                <DetailPanel />
            </div>
        </div>
    </div>
  );
};