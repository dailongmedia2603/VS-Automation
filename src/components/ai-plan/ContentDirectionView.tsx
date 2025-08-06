import { useState, useMemo, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

    // Now add generated names
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

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border bg-white">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <div className="p-4 h-full overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 px-2">Loại content</h3>
          <Accordion type="multiple" defaultValue={Object.keys(groupedData)} className="w-full">
            {Object.entries(groupedData).map(([type, items]) => (
              <AccordionItem value={type} key={type}>
                <AccordionTrigger className="font-semibold">{type} ({items.length})</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-1 pt-1">
                    {items.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          "w-full text-left p-2 rounded-md text-sm",
                          selectedItem === item ? "bg-blue-100 text-blue-700 font-semibold" : "hover:bg-slate-100"
                        )}
                      >
                        {item.bai_viet_name}
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={70}>
        <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
          {selectedItem ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">{selectedItem.bai_viet_name}: {selectedItem.chu_de}</h2>
              <Card>
                <CardHeader><CardTitle>Vấn đề / Tình trạng</CardTitle></CardHeader>
                <CardContent className="prose prose-sm max-w-none prose-slate"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedItem.van_de || ''}</ReactMarkdown></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Content Demo</CardTitle></CardHeader>
                <CardContent className="prose prose-sm max-w-none prose-slate"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedItem.content_demo || ''}</ReactMarkdown></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Định hướng comment</CardTitle></CardHeader>
                <CardContent className="prose prose-sm max-w-none prose-slate"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedItem.dinh_huong_comment || ''}</ReactMarkdown></CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>Chọn một bài viết để xem chi tiết</p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};