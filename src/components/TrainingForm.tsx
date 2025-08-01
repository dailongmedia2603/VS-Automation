import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from 'lucide-react';

// Type definitions
export type TrainingItem = { id: string; value: string };
export type TrainingDocument = {
  id: string;
  name: string;
  type: string;
  purpose: string;
  creator: string;
  url: string;
  file?: File;
};
export type PromptTemplateItem = {
  id: string;
  title: string;
  content: string;
};
export type TrainingConfig = {
  industry: string;
  role: string;
  style: string;
  language: string;
  tone: string;
  goal: string;
  processSteps: TrainingItem[];
  documents: TrainingDocument[];
  promptTemplate: PromptTemplateItem[];
};

export const initialConfig: TrainingConfig = {
  industry: '',
  role: '',
  style: '',
  language: 'Tiếng Việt',
  tone: '',
  goal: '',
  processSteps: [],
  documents: [],
  promptTemplate: [
    { id: crypto.randomUUID(), title: 'YÊU CẦU TƯ VẤN CHO FANPAGE', content: 'Bạn là một trợ lý AI cho fanpage. Hãy dựa vào các thông tin dưới đây để tư vấn cho khách hàng.' },
    { id: crypto.randomUUID(), title: 'THÔNG TIN HUẤN LUYỆN CHUNG', content: '- **Vai trò của bạn:** {{role}}\n- **Lĩnh vực kinh doanh:** {{industry}}\n- **Phong cách:** {{style}}\n- **Tông giọng:** {{tone}}\n- **Ngôn ngữ:** {{language}}\n- **Mục tiêu cuộc trò chuyện:** {{goal}}' },
    { id: crypto.randomUUID(), title: 'QUY TRÌNH TƯ VẤN', content: '{{processSteps}}' },
    { id: crypto.randomUUID(), title: 'LỊCH SỬ CUỘC TRÒ CHUYỆN', content: 'Dưới đây là toàn bộ lịch sử trò chuyện. Hãy phân tích để hiểu ngữ cảnh và trả lời tin nhắn cuối cùng của khách hàng.\n---\n{{conversation_history}}\n---' },
    { id: crypto.randomUUID(), title: 'TÀI LIỆU NỘI BỘ THAM KHẢO', content: '{{document_context}}' },
    { id: crypto.randomUUID(), title: 'HÀNH ĐỘNG', content: 'Dựa vào TOÀN BỘ thông tin trên, hãy tạo một câu trả lời duy nhất cho tin nhắn cuối cùng của khách hàng.\n**QUAN TRỌNG:** Chỉ trả lời với nội dung tin nhắn, không thêm bất kỳ tiền tố nào như "AI:", "Trả lời:", hay lời chào nào nếu không cần thiết theo ngữ cảnh.' },
  ],
};

interface TrainingFormProps {
  config: TrainingConfig;
  setConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>;
}

const DynamicPrefixedList = ({ title, description, items, setItems, prefix, buttonText }: { title: string, description?: string, items: TrainingItem[], setItems: (items: TrainingItem[]) => void, prefix: string, buttonText: string }) => {
    const handleAddItem = () => setItems([...items, { id: crypto.randomUUID(), value: '' }]);
    const handleItemChange = (id: string, value: string) => setItems(items.map(item => item.id === id ? { ...item, value } : item));
    const handleRemoveItem = (id: string) => setItems(items.filter(item => item.id !== id));
  
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-800">{title}</Label>
        {description && <p className="text-xs text-slate-500">{description}</p>}
        <div className="space-y-2 mt-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex items-center gap-3 flex-grow">
                <span className="font-semibold text-slate-500 whitespace-nowrap">{prefix} {index + 1}</span>
                <Input value={item.value} onChange={(e) => handleItemChange(item.id, e.target.value)} className="bg-slate-100/70 border-slate-200" />
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0 text-slate-500 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2 text-slate-600 border-slate-300 hover:bg-slate-100">
          <PlusCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </div>
    );
  };

export const TrainingForm: React.FC<TrainingFormProps> = ({ config, setConfig }) => {
  const handleFieldChange = (field: keyof Omit<TrainingConfig, 'processSteps' | 'documents' | 'promptTemplate'>, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDynamicListChange = (field: 'processSteps', items: TrainingItem[]) => {
    setConfig(prev => ({ ...prev, [field]: items }));
  };

  return (
    <div className="space-y-8 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-bold text-slate-900">Thông tin cơ bản</CardTitle>
              <CardDescription className="text-sm text-slate-500 pt-1">Cung cấp thông tin nền tảng về doanh nghiệp và sản phẩm của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium text-slate-800">Lĩnh vực / Ngành nghề</Label>
                  <Input id="industry" value={config.industry} onChange={(e) => handleFieldChange('industry', e.target.value)} className="bg-slate-100/70 border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-800">Vai trò của AI</Label>
                  <Input id="role" placeholder="VD: Chuyên viên tư vấn" value={config.role} onChange={(e) => handleFieldChange('role', e.target.value)} className="bg-slate-100/70 border-slate-200" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-bold text-slate-900">Quy trình</CardTitle>
              <CardDescription className="text-sm text-slate-500 pt-1">Hướng dẫn AI cách tư vấn.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <DynamicPrefixedList
                title="Quy trình tư vấn"
                description="Đưa ra quy trình tư vấn từng bước để AI hiểu được nên tư vấn từng bước như nào."
                items={config.processSteps}
                setItems={(items) => handleDynamicListChange('processSteps', items)}
                prefix="Bước"
                buttonText="Thêm bước"
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-bold text-slate-900">Phong cách & Tông giọng</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="style" className="text-sm font-medium text-slate-800">Phong cách trả lời</Label>
                <Input id="style" placeholder="VD: Thân thiện, chuyên nghiệp" value={config.style} onChange={(e) => handleFieldChange('style', e.target.value)} className="bg-slate-100/70 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-sm font-medium text-slate-800">Tông giọng trả lời</Label>
                <Input id="tone" placeholder="VD: Vui vẻ, nghiêm túc" value={config.tone} onChange={(e) => handleFieldChange('tone', e.target.value)} className="bg-slate-100/70 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium text-slate-800">Ngôn ngữ trả lời</Label>
                <Input id="language" value={config.language} onChange={(e) => handleFieldChange('language', e.target.value)} className="bg-slate-100/70 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-sm font-medium text-slate-800">Mục tiêu trò chuyện</Label>
                <Input id="goal" placeholder="VD: Bán hàng, giải đáp" value={config.goal} onChange={(e) => handleFieldChange('goal', e.target.value)} className="bg-slate-100/70 border-slate-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};