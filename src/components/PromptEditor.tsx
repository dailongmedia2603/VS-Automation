import React from 'react';
import { type TrainingConfig } from './TrainingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';

interface PromptEditorProps {
  config: TrainingConfig;
  setConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ config, setConfig }) => {
  const handleTemplateChange = (id: string, field: 'title' | 'content', value: string) => {
    const newTemplates = config.promptTemplate.map(template =>
      template.id === id ? { ...template, [field]: value } : template
    );
    setConfig(prev => ({ ...prev, promptTemplate: newTemplates }));
  };

  const handleRemoveTemplate = (id: string) => {
    const newTemplates = config.promptTemplate.filter(template => template.id !== id);
    setConfig(prev => ({ ...prev, promptTemplate: newTemplates }));
  };

  return (
    <div className="space-y-6 mt-6">
      <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold text-slate-900">Cấu hình Prompt Template</CardTitle>
          <CardDescription className="text-sm text-slate-500 pt-1">
            Chỉnh sửa các mẫu prompt để định hình cách AI xây dựng câu trả lời. Sử dụng các biến trong ngoặc kép, ví dụ: {'{{role}}'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6">
          {config.promptTemplate.map(template => (
            <div key={template.id} className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
              <div className="flex justify-between items-center">
                <Label htmlFor={`title-${template.id}`} className="text-base font-semibold text-slate-800">{template.title}</Label>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveTemplate(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor={`title-${template.id}`} className="text-sm font-medium text-slate-600">Tiêu đề</Label>
                <Input
                  id={`title-${template.id}`}
                  value={template.title}
                  onChange={(e) => handleTemplateChange(template.id, 'title', e.target.value)}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label htmlFor={`content-${template.id}`} className="text-sm font-medium text-slate-600">Nội dung</Label>
                <Textarea
                  id={`content-${template.id}`}
                  value={template.content}
                  onChange={(e) => handleTemplateChange(template.id, 'content', e.target.value)}
                  className="mt-1 min-h-[120px] bg-white"
                  rows={5}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};