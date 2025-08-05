import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export type InputField = {
  id: string;
  label: string;
  description: string;
  type: 'text' | 'textarea';
};

interface InputConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialFields: InputField[];
  onApply: (fields: InputField[]) => Promise<void>;
}

export const InputConfigDialog = ({ isOpen, onOpenChange, initialFields, onApply }: InputConfigDialogProps) => {
  const [fields, setFields] = useState<InputField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Deep copy and ensure IDs exist
      setFields(JSON.parse(JSON.stringify(initialFields.map(f => ({ ...f, id: f.id || crypto.randomUUID() })))));
    }
  }, [isOpen, initialFields]);

  const handleFieldChange = (id: string, field: keyof Omit<InputField, 'id'>, value: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const addField = () => {
    setFields([...fields, { id: crypto.randomUUID(), label: '', description: '', type: 'text' }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleApply = async () => {
    setIsSaving(true);
    try {
      await onApply(fields);
      onOpenChange(false);
    } catch (error) {
      // Parent shows toast, dialog stays open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cấu hình đầu vào</DialogTitle>
          <DialogDescription>Tùy chỉnh các trường thông tin đầu vào cho kế hoạch AI.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-4 py-4 pr-4">
            {fields.map((field) => (
              <div key={field.id} className="p-4 border rounded-lg bg-slate-50 space-y-3 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tiêu đề</Label>
                    <Input value={field.label} onChange={e => handleFieldChange(field.id, 'label', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại ô</Label>
                    <Select value={field.type} onValueChange={(v: 'text' | 'textarea') => handleFieldChange(field.id, 'type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Ô nhỏ (Input)</SelectItem>
                        <SelectItem value="textarea">Ô rộng (Textarea)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả (Placeholder)</Label>
                  <Textarea value={field.description} onChange={e => handleFieldChange(field.id, 'description', e.target.value)} rows={2} />
                </div>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removeField(field.id)} disabled={isSaving}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addField} className="w-full border-dashed" disabled={isSaving}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm trường
            </Button>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Hủy</Button>
          <Button onClick={handleApply} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Áp dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};