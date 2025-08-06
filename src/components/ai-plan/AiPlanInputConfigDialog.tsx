import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export type InputFieldStructure = {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
};

interface AiPlanInputConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialStructure: InputFieldStructure[];
  onApply: (newStructure: InputFieldStructure[]) => void;
}

export const AiPlanInputConfigDialog = ({ isOpen, onOpenChange, initialStructure, onApply }: AiPlanInputConfigDialogProps) => {
  const [structure, setStructure] = useState<InputFieldStructure[]>([]);

  useEffect(() => {
    // Deep copy to prevent modifying the original state directly
    setStructure(JSON.parse(JSON.stringify(initialStructure)));
  }, [initialStructure, isOpen]);

  const handleFieldChange = (index: number, field: keyof InputFieldStructure, value: string) => {
    const newStructure = [...structure];
    newStructure[index] = { ...newStructure[index], [field]: value };
    setStructure(newStructure);
  };

  const addField = () => {
    setStructure([
      ...structure,
      { id: `field_${Date.now()}`, label: 'Tiêu đề mới', placeholder: '', type: 'input' }
    ]);
  };

  const removeField = (index: number) => {
    const newStructure = structure.filter((_, i) => i !== index);
    setStructure(newStructure);
  };

  const handleApply = () => {
    onApply(structure);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cấu hình đầu vào</DialogTitle>
          <p className="text-sm text-muted-foreground">Tùy chỉnh các trường thông tin đầu vào cho kế hoạch AI.</p>
        </DialogHeader>
        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto px-2 -mx-2">
          {structure.map((field, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative bg-slate-50/50">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => removeField(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`label-${index}`}>Tiêu đề</Label>
                  <Input id={`label-${index}`} value={field.label} onChange={(e) => handleFieldChange(index, 'label', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`type-${index}`}>Loại ô</Label>
                  <Select value={field.type} onValueChange={(value: 'input' | 'textarea') => handleFieldChange(index, 'type', value)}>
                    <SelectTrigger id={`type-${index}`}>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">Ô nhỏ (Input)</SelectItem>
                      <SelectItem value="textarea">Ô lớn (Textarea)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`placeholder-${index}`}>Mô tả (Placeholder)</Label>
                <Textarea id={`placeholder-${index}`} value={field.placeholder} onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={addField} className="mt-4">Thêm trường mới</Button>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Hủy</Button>
          </DialogClose>
          <Button onClick={handleApply}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};