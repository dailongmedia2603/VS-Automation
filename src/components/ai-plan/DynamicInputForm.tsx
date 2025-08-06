import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormFieldConfig } from "@/types/ai-plan";
import { Pencil, Settings2, Loader2 } from "lucide-react";

interface DynamicInputFormProps {
  fields: FormFieldConfig[];
  formData: { [key: string]: string };
  onFormDataChange: (fieldId: string, value: string) => void;
  onConfigure: () => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

export const DynamicInputForm = ({ fields, formData, onFormDataChange, onConfigure, onSubmit, isGenerating }: DynamicInputFormProps) => {
  return (
    <div className="sticky top-24">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Thông tin đầu vào</h2>
          <p className="text-sm text-slate-500">Nhập thông tin chi tiết về chiến dịch của bạn.</p>
        </div>
        <Button variant="outline" onClick={onConfigure}>
          <Settings2 className="h-4 w-4 mr-2" />
          Cấu hình đầu vào
        </Button>
      </div>
      <div className="space-y-6">
        {fields.map((field) => (
          <Card key={field.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil className="h-4 w-4" />
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-slate-800 mb-1">{field.title}</h3>
                  <p className="text-sm text-slate-500 mb-4">{field.placeholder}</p>
                  {field.type === 'textarea' ? (
                    <Textarea
                      placeholder={`Nhập ${field.title.toLowerCase()}...`}
                      value={formData[field.id] || ''}
                      onChange={(e) => onFormDataChange(field.id, e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <Input
                      placeholder={`Nhập ${field.title.toLowerCase()}...`}
                      value={formData[field.id] || ''}
                      onChange={(e) => onFormDataChange(field.id, e.target.value)}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <Button size="lg" className="w-full" onClick={onSubmit} disabled={isGenerating}>
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGenerating ? 'Đang tạo kế hoạch...' : 'Tạo kế hoạch AI'}
        </Button>
      </div>
    </div>
  );
};