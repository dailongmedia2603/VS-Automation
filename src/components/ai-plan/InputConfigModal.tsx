import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { ScrollArea } from '../ui/scroll-area';

export type InputFieldConfig = {
  id: string;
  title: string;
  description: string;
  fieldType: 'input' | 'textarea';
};

interface InputConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFields: InputFieldConfig[];
  onApply: (fields: InputFieldConfig[]) => void;
}

export const InputConfigModal = ({ isOpen, onClose, initialFields, onApply }: InputConfigModalProps) => {
  const [fields, setFields] = useState<InputFieldConfig[]>([]);

  useEffect(() => {
    // Ensure each field has a unique ID for local state management
    setFields(initialFields.map(f => ({ ...f, id: f.id || nanoid() })));
  }, [initialFields, isOpen]);

  const handleFieldChange = (id: string, key: keyof Omit<InputFieldConfig, 'id'>, value: string) => {
    setFields(fields.map(field => field.id === id ? { ...field, [key]: value } : field));
  };

  const handleAddField = () => {
    setFields([...fields, { id: nanoid(), title: '', description: '', fieldType: 'input' }]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const handleApply = () => {
    // Filter out fields without a title before applying
    const validFields = fields.filter(f => f.title.trim() !== '');
    onApply(validFields);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cấu hình thông tin đầu vào</DialogTitle>
          <DialogDescription>
            Tùy chỉnh các trường thông tin bạn muốn AI sử dụng để tạo kế hoạch.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-[50vh] pr-6">
            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative group">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${field.id}`}>Tiêu đề</Label>
                      <Input
                        id={`title-${field.id}`}
                        value={field.title}
                        onChange={(e) => handleFieldChange(field.id, 'title', e.target.value)}
                        placeholder="VD: Thông tin sản phẩm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`type-${field.id}`}>Loại ô</Label>
                      <Select
                        value={field.fieldType}
                        onValueChange={(value: 'input' | 'textarea') => handleFieldChange(field.id, 'fieldType', value)}
                      >
                        <SelectTrigger id={`type-${field.id}`}>
                          <SelectValue placeholder="Chọn loại ô" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="input">Ô nhỏ (Input)</SelectItem>
                          <SelectItem value="textarea">Ô rộng (Textarea)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor={`desc-${field.id}`}>Mô tả / Placeholder</Label>
                      <Input
                        id={`desc-${field.id}`}
                        value={field.description}
                        onChange={(e) => handleFieldChange(field.id, 'description', e.target.value)}
                        placeholder="VD: Mô tả sản phẩm, điểm nổi bật, giá cả..."
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-slate-500 hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex justify-start">
            <Button variant="outline" onClick={handleAddField}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm trường
            </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={handleApply}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};