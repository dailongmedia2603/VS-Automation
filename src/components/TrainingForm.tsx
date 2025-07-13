import React, { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, File as FileIcon, Download, Edit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
export type TrainingConfig = {
  industry: string;
  products: TrainingItem[];
  role: string;
  style: string;
  language: string;
  tone: string;
  pronouns: string;
  goal: string;
  processSteps: TrainingItem[];
  conditions: TrainingItem[];
  documents: TrainingDocument[];
};

export const initialConfig: TrainingConfig = {
  industry: '',
  products: [],
  role: '',
  style: '',
  language: 'Tiếng Việt',
  tone: '',
  pronouns: '',
  goal: '',
  processSteps: [],
  conditions: [],
  documents: [],
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
    <div className="space-y-2">
      <Label className="font-medium text-slate-700">{title}</Label>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input placeholder={placeholder} value={item.value} onChange={(e) => handleItemChange(item.id, e.target.value)} className="bg-slate-50" />
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
      <div className="space-y-2">
        <Label className="font-medium text-slate-700">{title}</Label>
        {description && <p className="text-sm text-slate-500">{description}</p>}
        <div className="space-y-2 mt-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-grow">
                <span className="font-medium text-slate-500 whitespace-nowrap">{prefix} {index + 1}:</span>
                <Input value={item.value} onChange={(e) => handleItemChange(item.id, e.target.value)} className="bg-slate-50" />
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof Omit<TrainingConfig, 'products' | 'processSteps' | 'conditions' | 'documents'>, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDynamicListChange = (field: 'products' | 'processSteps' | 'conditions', items: TrainingItem[]) => {
    setConfig(prev => ({ ...prev, [field]: items }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newDoc: TrainingDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type.split('/')[1] || 'file',
        purpose: '',
        creator: 'Admin',
        url: '',
        file: file,
      };
      setConfig(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
    }
  };

  const handleRemoveDocument = (id: string) => {
    setConfig(prev => ({ ...prev, documents: prev.documents.filter(doc => doc.id !== id) }));
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Thông tin cơ bản</CardTitle>
              <CardDescription className="text-sm text-slate-500">Cung cấp thông tin nền tảng về doanh nghiệp và sản phẩm của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="font-medium text-slate-700">Lĩnh vực / Ngành nghề</Label>
                  <Input id="industry" value={config.industry} onChange={(e) => handleFieldChange('industry', e.target.value)} className="bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="font-medium text-slate-700">Vai trò của AI</Label>
                  <Input id="role" placeholder="VD: Chuyên viên tư vấn" value={config.role} onChange={(e) => handleFieldChange('role', e.target.value)} className="bg-slate-50" />
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

          <Card className="bg-white rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Quy trình và Điều kiện</CardTitle>
              <CardDescription className="text-sm text-slate-500">Hướng dẫn AI cách tư vấn và các quy tắc cần tuân thủ.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DynamicPrefixedList
                title="Quy trình tư vấn"
                description="Đưa ra quy trình tư vấn từng bước để AI hiểu được nên tư vấn từng bước như nào."
                items={config.processSteps}
                setItems={(items) => handleDynamicListChange('processSteps', items)}
                prefix="Bước"
                buttonText="Thêm bước"
              />
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

        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Phong cách và Tông giọng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="style" className="font-medium text-slate-700">Phong cách trả lời</Label>
                <Input id="style" placeholder="VD: Thân thiện, chuyên nghiệp" value={config.style} onChange={(e) => handleFieldChange('style', e.target.value)} className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tone" className="font-medium text-slate-700">Tông giọng trả lời</Label>
                <Input id="tone" placeholder="VD: Vui vẻ, nghiêm túc" value={config.tone} onChange={(e) => handleFieldChange('tone', e.target.value)} className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language" className="font-medium text-slate-700">Ngôn ngữ trả lời</Label>
                <Input id="language" value={config.language} onChange={(e) => handleFieldChange('language', e.target.value)} className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pronouns" className="font-medium text-slate-700">Xưng hô (Page vs Khách hàng)</Label>
                <Input id="pronouns" placeholder="VD: Shop - bạn, Em - anh/chị" value={config.pronouns} onChange={(e) => handleFieldChange('pronouns', e.target.value)} className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal" className="font-medium text-slate-700">Mục tiêu trò chuyện</Label>
                <Input id="goal" placeholder="VD: Bán hàng, giải đáp thắc mắc" value={config.goal} onChange={(e) => handleFieldChange('goal', e.target.value)} className="bg-slate-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Bảng tài liệu</CardTitle>
            <CardDescription className="text-sm text-slate-500">Tải lên các tài liệu để AI học hỏi và tham khảo.</CardDescription>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm tài liệu
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-slate-600 font-medium">Loại tài liệu</TableHead>
                  <TableHead className="text-slate-600 font-medium">Mục đích</TableHead>
                  <TableHead className="text-slate-600 font-medium">Người tạo</TableHead>
                  <TableHead className="text-right text-slate-600 font-medium">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.documents.length > 0 ? config.documents.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-slate-400" />
                        <span>{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{doc.purpose || 'Chưa có'}</TableCell>
                    <TableCell className="text-slate-600">{doc.creator}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-destructive" onClick={() => handleRemoveDocument(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-slate-500">Chưa có tài liệu nào.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={onSave} disabled={isSaving} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
};