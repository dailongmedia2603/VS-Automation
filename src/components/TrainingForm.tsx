import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Loader2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TrainingPreview from './TrainingPreview';

// Type definitions
export type TrainingItem = { id: string; value: string };

export type TrainingConfig = {
  industry: string;
  products: TrainingItem[];
  role: string;
  style: string;
  language: string;
  tone: string;
  pronouns: string;
  customerPronouns: string;
  goal: string;
  processSteps: TrainingItem[];
  conditions: TrainingItem[];
};

export const initialConfig: TrainingConfig = {
  industry: '',
  products: [],
  role: '',
  style: '',
  language: 'Tiếng Việt',
  tone: '',
  pronouns: '',
  customerPronouns: '',
  goal: '',
  processSteps: [],
  conditions: [],
};

interface TrainingFormProps {
  config: TrainingConfig;
  setConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>;
  isSaving: boolean;
  onSave: () => void;
}

const DynamicList = ({ title, items, setItems, placeholder, buttonText }: { title: string, items: TrainingItem[], setItems: (items: TrainingItem[]) => void, placeholder: string, buttonText: string }) => {
  const handleAddItem = () => setItems([...items, { id: crypto.randomUUID(), value: '' }]);
  const handleItemChange = (id: string, value: string) => setItems(items.map(item => item.id === id ? { ...item, value } : item));
  const handleRemoveItem = (id: string) => setItems(items.filter(item => item.id !== id));

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-slate-800">{title}</Label>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input placeholder={placeholder} value={item.value} onChange={(e) => handleItemChange(item.id, e.target.value)} className="bg-slate-100/70 border-slate-200" />
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

export const TrainingForm: React.FC<TrainingFormProps> = ({ config, setConfig, isSaving, onSave }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFieldChange = (field: keyof Omit<TrainingConfig, 'products' | 'processSteps' | 'conditions'>, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDynamicListChange = (field: 'products' | 'processSteps' | 'conditions', items: TrainingItem[]) => {
    setConfig(prev => ({ ...prev, [field]: items }));
  };

  return (
    <>
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
                <DynamicList
                  title="Danh sách sản phẩm / dịch vụ"
                  items={config.products}
                  setItems={(items) => handleDynamicListChange('products', items)}
                  placeholder="VD: Gói chụp ảnh cưới"
                  buttonText="Thêm sản phẩm / dịch vụ"
                />
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-bold text-slate-900">Quy trình và Điều kiện</CardTitle>
                <CardDescription className="text-sm text-slate-500 pt-1">Hướng dẫn AI cách tư vấn và các quy tắc cần tuân thủ.</CardDescription>
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
                <div className="border-t border-slate-200/80 -mx-6 my-6"></div>
                <DynamicPrefixedList
                  title="Điều kiện bắt buộc AI tuân thủ"
                  items={config.conditions}
                  setItems={(items) => handleDynamicListChange('conditions', items)}
                  prefix="Điều kiện"
                  buttonText="Thêm điều kiện"
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
                  <Label htmlFor="pronouns" className="text-sm font-medium text-slate-800">Page xưng hô là:</Label>
                  <Input id="pronouns" placeholder="VD: Shop, mình" value={config.pronouns} onChange={(e) => handleFieldChange('pronouns', e.target.value)} className="bg-slate-100/70 border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPronouns" className="text-sm font-medium text-slate-800">KH xưng hô là:</Label>
                  <Input id="customerPronouns" placeholder="VD: bạn, anh, chị" value={config.customerPronouns} onChange={(e) => handleFieldChange('customerPronouns', e.target.value)} className="bg-slate-100/70 border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal" className="text-sm font-medium text-slate-800">Mục tiêu trò chuyện</Label>
                  <Input id="goal" placeholder="VD: Bán hàng, giải đáp" value={config.goal} onChange={(e) => handleFieldChange('goal', e.target.value)} className="bg-slate-100/70 border-slate-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-3">
          <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="font-semibold rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={onSave} disabled={isSaving} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl p-6 rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold text-slate-900">Xem trước cấu hình huấn luyện</DialogTitle>
            <DialogDescription className="text-slate-500 pt-1">Đây là tổng quan dữ liệu bạn đã cấu hình. Dữ liệu này sẽ được sử dụng để huấn luyện AI.</DialogDescription>
          </DialogHeader>
          <div className="py-4"><TrainingPreview config={config} /></div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};