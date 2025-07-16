import React, { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PlusCircle, Trash2, Database } from 'lucide-react';
import { type PromptTemplateItem } from './TrainingForm';

interface PromptConfiguratorProps {
  template: PromptTemplateItem[];
  setTemplate: (template: PromptTemplateItem[]) => void;
}

const dataFields = [
  { key: '{{industry}}', label: 'Lĩnh vực / Ngành nghề' },
  { key: '{{role}}', label: 'Vai trò của AI' },
  { key: '{{products}}', label: 'Danh sách sản phẩm / dịch vụ' },
  { key: '{{style}}', label: 'Phong cách trả lời' },
  { key: '{{tone}}', label: 'Tông giọng trả lời' },
  { key: '{{language}}', label: 'Ngôn ngữ trả lời' },
  { key: '{{pronouns}}', label: 'Page xưng hô' },
  { key: '{{customerPronouns}}', label: 'KH xưng hô' },
  { key: '{{goal}}', label: 'Mục tiêu trò chuyện' },
  { key: '{{processSteps}}', label: 'Quy trình tư vấn' },
  { key: '{{conditions}}', label: 'Điều kiện bắt buộc' },
  { key: '{{conversation_history}}', label: 'Lịch sử trò chuyện (Động)' },
  { key: '{{document_context}}', label: 'Tài liệu nội bộ (Động)' },
];

export const PromptConfigurator: React.FC<PromptConfiguratorProps> = ({ template, setTemplate }) => {
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const addBlock = () => {
    setTemplate([...template, { id: crypto.randomUUID(), title: '', content: '' }]);
  };

  const removeBlock = (id: string) => {
    setTemplate(template.filter(block => block.id !== id));
  };

  const updateBlock = (id: string, field: 'title' | 'content', value: string) => {
    setTemplate(template.map(block => block.id === id ? { ...block, [field]: value } : block));
  };

  const insertDataKey = (key: string) => {
    if (activeTextareaRef.current) {
      const textarea = activeTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + key + text.substring(end);
      
      const blockId = textarea.dataset.id;
      if (blockId) {
        updateBlock(blockId, 'content', newText);
      }

      // Focus and set cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + key.length;
      }, 0);
    }
  };

  return (
    <div className="space-y-8 mt-6">
      <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold text-slate-900">Cấu hình Prompt</CardTitle>
          <CardDescription className="text-sm text-slate-500 pt-1">
            Xây dựng cấu trúc prompt cho AI. Bạn có thể thêm các khối nội dung tĩnh và chèn các trường dữ liệu động từ tab "Thông tin Train".
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6">
          {template.map((block, index) => (
            <div key={block.id} className="p-4 border rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-slate-700">Khối {index + 1}</Label>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-destructive hover:bg-destructive/10" onClick={() => removeBlock(block.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`title-${block.id}`}>Tiêu đề khối</Label>
                <Input
                  id={`title-${block.id}`}
                  placeholder="VD: YÊU CẦU TƯ VẤN"
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`content-${block.id}`}>Nội dung khối</Label>
                <Textarea
                  id={`content-${block.id}`}
                  data-id={block.id}
                  placeholder="Nhập nội dung tĩnh và chèn dữ liệu động..."
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
                  onFocus={(e) => activeTextareaRef.current = e.target}
                  className="bg-white min-h-[100px]"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-slate-600 border-slate-300 hover:bg-slate-100">
                      <Database className="h-4 w-4 mr-2" />
                      Thêm dữ liệu
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Tìm trường dữ liệu..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        <CommandGroup>
                          {dataFields.map(field => (
                            <CommandItem key={field.key} onSelect={() => insertDataKey(field.key)}>
                              {field.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addBlock} className="w-full border-dashed text-slate-600 border-slate-400 hover:bg-slate-100">
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm khối nội dung
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};