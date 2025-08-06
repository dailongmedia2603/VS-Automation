import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";

type InputField = {
  id: string;
  label: string;
  type: 'input' | 'textarea';
  description: string;
};

interface InputStructureConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStructure: InputField[];
  onSave: (newStructure: InputField[]) => Promise<void>;
}

export const InputStructureConfigDialog = ({ open, onOpenChange, initialStructure, onSave }: InputStructureConfigDialogProps) => {
  const [fields, setFields] = useState<InputField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(JSON.parse(JSON.stringify(initialStructure || [])));
    }
  }, [open, initialStructure]);

  const handleFieldChange = (id: string, key: keyof InputField, value: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const addField = () => {
    const newId = `field_${Date.now()}`;
    setFields(prev => [...prev, { id: newId, label: 'Tiêu đề mới', type: 'input', description: '' }]);
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(fields);
      onOpenChange(false);
    } catch (e) {
      showError("Lỗi khi lưu cấu trúc. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cấu hình đầu vào</DialogTitle>
          <DialogDescription>Tùy chỉnh các trường thông tin đầu vào cho kế hoạch AI.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1 pr-6">
            {fields.map(field => (
              <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeField(field.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tiêu đề</Label>
                    <Input value={field.label} onChange={e => handleFieldChange(field.id, 'label', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại ô</Label>
                    <Select value={field.type} onValueChange={(value: 'input' | 'textarea') => handleFieldChange(field.id, 'type', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="input">Ô nhỏ (Input)</SelectItem>
                        <SelectItem value="textarea">Ô rộng (Textarea)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Mô tả (Placeholder)</Label>
                  <Textarea value={field.description} onChange={e => handleFieldChange(field.id, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed" onClick={addField}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm trường
            </Button>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Áp dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};