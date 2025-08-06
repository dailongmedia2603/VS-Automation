import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  <div>
    <div className="flex items-center gap-3 mb-2">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBgColor}`}>
        <Icon className={`h-4 w-4 ${iconTextColor}`} />
      </div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
    </div>
    <div className="prose prose-sm max-w-none prose-slate pl-11 text-slate-600">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '(Chưa có nội dung)'}</ReactMarkdown>
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
    <div className="space-y-8 p-6">
      {Object.entries(groupedData).map(([type, items]) => (
        <div key={type}>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
              <Newspaper className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{type}</h2>
            <span className="text-lg font-medium text-slate-500">({items.length} bài viết)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items.map((item, index) => (
              <Card key={index} className="bg-white rounded-xl shadow-sm border border-slate-200/80">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">{item.bai_viet_name}: {item.chu_de}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
        </div>
      ))}
    </div>
  );
};