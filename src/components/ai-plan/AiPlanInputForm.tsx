import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { InputConfigModal, InputFieldConfig } from './InputConfigModal';

interface AiPlanInputFormProps {
  // The structure of the form fields
  fieldsConfig: InputFieldConfig[];
  // The current data of the form
  formData: { [key: string]: string };
  // Callback when form data changes
  onDataChange: (data: { [key: string]: string }) => void;
  // Callback to save the new fields configuration
  onSaveConfiguration: (fields: InputFieldConfig[]) => Promise<void>;
}

export const AiPlanInputForm = ({ fieldsConfig, formData, onDataChange, onSaveConfiguration }: AiPlanInputFormProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleInputChange = (fieldId: string, value: string) => {
    const newFormData = { ...formData, [fieldId]: value };
    onDataChange(newFormData);
  };

  const handleApplyConfig = async (newFields: InputFieldConfig[]) => {
    await onSaveConfiguration(newFields);
    
    // Prune formData: remove data for fields that no longer exist
    const newFormData = { ...formData };
    const newFieldIds = new Set(newFields.map(f => f.id));
    Object.keys(newFormData).forEach(key => {
      if (!newFieldIds.has(key)) {
        delete newFormData[key];
      }
    });
    onDataChange(newFormData);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Thông tin đầu vào</CardTitle>
            <CardDescription>Nhập thông tin chi tiết về chiến dịch của bạn.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Cấu hình
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {fieldsConfig.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.title}</Label>
                {field.fieldType === 'textarea' ? (
                  <Textarea
                    id={field.id}
                    placeholder={field.description}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="min-h-[100px]"
                  />
                ) : (
                  <Input
                    id={field.id}
                    placeholder={field.description}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}
             {fieldsConfig.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                <p>Bấm "Cấu hình" để thêm các trường thông tin đầu vào.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <InputConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialFields={fieldsConfig}
        onApply={handleApplyConfig}
      />
    </>
  );
};