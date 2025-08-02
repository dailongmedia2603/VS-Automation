import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, BrainCircuit } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

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
  documents: TrainingDocument[];
  promptTemplate: PromptTemplateItem[];
  temperature: number;
  topP: number;
  maxTokens: number;
  useCoT: boolean;
  cotFactors: TrainingItem[];
};

export const initialConfig: TrainingConfig = {
  industry: '',
  role: '',
  style: '',
  language: 'Tiếng Việt',
  tone: '',
  goal: '',
  documents: [],
  promptTemplate: [
    { id: crypto.randomUUID(), title: 'YÊU CẦU TƯ VẤN CHO FANPAGE', content: 'Bạn là một trợ lý AI cho fanpage. Hãy dựa vào các thông tin dưới đây để tư vấn cho khách hàng.' },
    { id: crypto.randomUUID(), title: 'THÔNG TIN HUẤN LUYỆN CHUNG', content: '- **Vai trò của bạn:** {{role}}\n- **Lĩnh vực kinh doanh:** {{industry}}\n- **Phong cách:** {{style}}\n- **Tông giọng:** {{tone}}\n- **Ngôn ngữ:** {{language}}\n- **Mục tiêu cuộc trò chuyện:** {{goal}}' },
    { id: crypto.randomUUID(), title: 'LỊCH SỬ CUỘC TRÒ CHUYỆN', content: 'Dưới đây là toàn bộ lịch sử trò chuyện. Hãy phân tích để hiểu ngữ cảnh và trả lời tin nhắn cuối cùng của khách hàng.\n---\n{{conversation_history}}\n---' },
    { id: crypto.randomUUID(), title: 'TÀI LIỆU NỘI BỘ THAM KHẢO', content: '{{document_context}}' },
    { id: crypto.randomUUID(), title: 'HÀNH ĐỘNG', content: 'Dựa vào TOÀN BỘ thông tin trên, hãy tạo một câu trả lời duy nhất cho tin nhắn cuối cùng của khách hàng.\n**QUAN TRỌNG:** Chỉ trả lời với nội dung tin nhắn, không thêm bất kỳ tiền tố nào như "AI:", "Trả lời:", hay lời chào nào nếu không cần thiết theo ngữ cảnh.' },
  ],
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 2048,
  useCoT: false,
  cotFactors: [],
};

interface TrainingFormProps {
  config: TrainingConfig;
  setConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>;
}

export const TrainingForm: React.FC<TrainingFormProps> = ({ config, setConfig }) => {
  const handleFieldChange = (field: keyof Omit<TrainingConfig, 'documents' | 'promptTemplate' | 'temperature' | 'topP' | 'maxTokens' | 'useCoT' | 'cotFactors'>, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericFieldChange = (field: 'maxTokens', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setConfig(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSliderChange = (field: 'temperature' | 'topP', value: number[]) => {
    setConfig(prev => ({ ...prev, [field]: value[0] }));
  };

  const handleSwitchChange = (field: 'useCoT', checked: boolean) => {
    setConfig(prev => ({ ...prev, [field]: checked }));
  };

  const handleDynamicListChange = (field: 'cotFactors', items: TrainingItem[]) => {
    setConfig(prev => ({ ...prev, [field]: items }));
  };

  const handleAddCotFactor = () => handleDynamicListChange('cotFactors', [...(config.cotFactors || []), { id: crypto.randomUUID(), value: '' }]);
  const handleCotFactorChange = (id: string, value: string) => handleDynamicListChange('cotFactors', (config.cotFactors || []).map(item => item.id === id ? { ...item, value } : item));
  const handleRemoveCotFactor = (id: string) => handleDynamicListChange('cotFactors', (config.cotFactors || []).filter(item => item.id !== id));

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

          <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-bold text-slate-900">Tham Số Cấu Hình Đầu Ra</CardTitle>
              <CardDescription className="text-sm text-slate-500 pt-1">Kiểm soát cách LLM tạo ra phản hồi.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <div>
                <Label className="flex justify-between text-sm font-medium text-slate-800"><span>Temperature:</span><span>{config.temperature}</span></Label>
                <Slider value={[config.temperature]} onValueChange={(val) => handleSliderChange('temperature', val)} max={1} step={0.05} />
                <p className="text-xs text-slate-500">Thấp: Chính xác, cao: Sáng tạo.</p>
              </div>
              <div>
                <Label className="flex justify-between text-sm font-medium text-slate-800"><span>Top-P:</span><span>{config.topP}</span></Label>
                <Slider value={[config.topP]} onValueChange={(val) => handleSliderChange('topP', val)} max={1} step={0.01} />
                <p className="text-xs text-slate-500">Chọn token dựa trên tổng xác suất.</p>
              </div>
              <div>
                <Label htmlFor="max-tokens" className="text-sm font-medium text-slate-800">Max Tokens</Label>
                <Input id="max-tokens" type="number" value={config.maxTokens} onChange={e => handleNumericFieldChange('maxTokens', e.target.value)} className="bg-slate-100/70 border-slate-200" />
                <p className="text-xs text-slate-500">Giới hạn độ dài tối đa của phản hồi.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-bold text-slate-900">Kỹ Thuật Nâng Cao</CardTitle>
              <CardDescription className="text-sm text-slate-500 pt-1">Áp dụng các kỹ thuật để cải thiện khả năng suy luận của mô hình.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="p-3 border rounded-lg bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrainCircuit className="h-5 w-5 text-blue-600" />
                    <div>
                      <Label htmlFor="cot-switch">Chain of Thought (CoT)</Label>
                      <p className="text-xs text-muted-foreground">Hướng dẫn AI suy luận logic hơn.</p>
                    </div>
                  </div>
                  <Switch id="cot-switch" checked={config.useCoT} onCheckedChange={(checked) => handleSwitchChange('useCoT', checked)} />
                </div>
                {config.useCoT && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Label className="text-sm font-medium">Các yếu tố cần suy nghĩ</Label>
                    {(config.cotFactors || []).map(factor => (
                      <div key={factor.id} className="flex items-center gap-2">
                        <Input
                          value={factor.value}
                          onChange={(e) => handleCotFactorChange(factor.id, e.target.value)}
                          placeholder="VD: Phân tích cảm xúc của khách hàng"
                          className="bg-white"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCotFactor(factor.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddCotFactor} className="border-dashed">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Thêm yếu tố
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};