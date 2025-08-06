import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle } from "lucide-react";
import { FormFieldConfig } from "@/types/ai-plan";
import { useState, useEffect } from "react";
import { ScrollArea } from "../ui/scroll-area";

interface InputConfigurationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialFields: FormFieldConfig[];
  onSave: (fields: FormFieldConfig[]) => void;
}

export const InputConfigurationDialog = ({ isOpen, onOpenChange, initialFields, onSave }: InputConfigurationDialogProps) => {
  const [fields, setFields] = useState<FormFieldConfig[]>([]);

  useEffect(() => {
    setFields(JSON.parse(JSON.stringify(initialFields)));
  }, [initialFields, isOpen]);

  const handleFieldChange = (id: string, key: keyof FormFieldConfig, value: string) => {
    setFields(fields.map(field => field.id === id ? { ...field, [key]: value } : field));
  };

  const addNewField = () => {
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}`,
      title: "Tiêu đề mới",
      type: 'input',
      placeholder: "Mô tả cho ô nhập liệu mới"
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const handleSave = () => {
    onSave(fields);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cấu hình đầu vào</DialogTitle>
          <p className="text-sm text-slate-500">Tùy chỉnh các trường thông tin đầu vào cho kế hoạch AI.</p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-6 p-6">
            {fields.map((field) => (
              <div key={field.id} className="p-6 border rounded-lg bg-slate-50/50 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tiêu đề</label>
                    <Input
                      value={field.title}
                      onChange={(e) => handleFieldChange(field.id, 'title', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Loại ô</label>
                    <Select
                      value={field.type}
                      onValueChange={(value: 'input' | 'textarea') => handleFieldChange(field.id, 'type', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Chọn loại ô" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="input">Ô nhỏ (Input)</SelectItem>
                        <SelectItem value="textarea">Ô lớn (Textarea)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Mô tả (Placeholder)</label>
                  <Textarea
                    value={field.placeholder}
                    onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                    className="bg-white"
                    rows={3}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-slate-500 hover:text-red-500"
                  onClick={() => removeField(field.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addNewField} className="w-full border-dashed">
              <PlusCircle className="h-4 w-4 mr-2" />
              Thêm trường mới
            </Button>
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Hủy</Button>
          </DialogClose>
          <Button onClick={handleSave}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};