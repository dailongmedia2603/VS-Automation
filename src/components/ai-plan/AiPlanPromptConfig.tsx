import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, PlusCircle, Trash2, ArrowUp, ArrowDown, Eye, Code, SlidersHorizontal, BrainCircuit, HelpCircle, Shield } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type PromptBlock = {
  id: string;
  title: string;
  content: string;
};

type CotFactor = {
  id: string;
  value: string;
};

type PromptConfig = {
  blocks: PromptBlock[];
  temperature: number;
  topP: number;
  maxTokens: number;
  useCoT: boolean;
  cotFactors: CotFactor[];
  output_instruction: string;
  safety_instruction: string;
};

const DEFAULT_OUTPUT_INSTRUCTION = `
---
### YÊU CẦU ĐẦU RA (CỰC KỲ QUAN TRỌNG)

Bạn PHẢI trả lời bằng một khối mã JSON duy nhất được bao bọc trong \`\`\`json ... \`\`\`.
JSON object phải có cấu trúc chính xác như sau:
\`\`\`json
{
{{json_structure}}
}
\`\`\`
- **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản, lời chào, hoặc giải thích nào bên ngoài khối mã JSON.
- Hãy điền giá trị cho mỗi trường dựa trên thông tin đã được cung cấp và kiến thức của bạn.
`;

const DEFAULT_SAFETY_INSTRUCTION = `Bạn là một trợ lý AI chuyên nghiệp, hữu ích và an toàn. Hãy tập trung vào việc tạo ra nội dung marketing chất lượng cao, phù hợp với ngữ cảnh được cung cấp. TUYỆT ĐỐI TRÁNH các chủ đề nhạy cảm, gây tranh cãi, hoặc có thể bị hiểu lầm là tiêu cực. Luôn duy trì một thái độ tích cực và chuyên nghiệp.`;

const initialConfig: Omit<PromptConfig, 'output_instruction' | 'safety_instruction'> = {
  blocks: [],
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 8192,
  useCoT: false,
  cotFactors: [],
};

const placeholders = [
  { value: 'thong_tin_dau_vao', label: 'Thông tin đầu vào' },
  { value: 'tai_lieu', label: 'Tài liệu' },
];

export const AiPlanPromptConfig = () => {
  const [config, setConfig] = useState<Omit<PromptConfig, 'output_instruction' | 'safety_instruction'>>(initialConfig);
  const [outputInstruction, setOutputInstruction] = useState(DEFAULT_OUTPUT_INSTRUCTION);
  const [safetyInstruction, setSafetyInstruction] = useState(DEFAULT_SAFETY_INSTRUCTION);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [templateInputFields, setTemplateInputFields] = useState<any[]>([]);
  const [globalDocuments, setGlobalDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_plan_prompt_config')
          .select('prompt_structure')
          .eq('id', 1)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data && data.prompt_structure) {
          const loadedConfig = { ...initialConfig, ...data.prompt_structure };
          setConfig(loadedConfig);
          setOutputInstruction(loadedConfig.output_instruction || DEFAULT_OUTPUT_INSTRUCTION);
          setSafetyInstruction(loadedConfig.safety_instruction || DEFAULT_SAFETY_INSTRUCTION);
        } else {
          setOutputInstruction(DEFAULT_OUTPUT_INSTRUCTION);
          setSafetyInstruction(DEFAULT_SAFETY_INSTRUCTION);
        }
      } catch (error: any) {
        showError("Không thể tải prompt: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompt();

    const fetchPreviewData = async () => {
        try {
            const templatePromise = supabase
                .from('ai_plan_templates')
                .select('structure')
                .eq('id', 1) // Default template
                .single();
            
            const documentsPromise = supabase
                .from('documents')
                .select('title, content')
                .is('project_id', null)
                .limit(3); // Limit for preview

            const [{ data: templateData, error: templateError }, { data: documentsData, error: documentsError }] = await Promise.all([templatePromise, documentsPromise]);

            if (templateError) console.error("Error fetching template for preview:", templateError);
            else if (templateData?.structure) {
                setTemplateInputFields((templateData.structure as any).input_fields || []);
            }

            if (documentsError) console.error("Error fetching documents for preview:", documentsError);
            else {
                setGlobalDocuments(documentsData || []);
            }
        } catch (error) {
            console.error("Failed to fetch data for prompt preview:", error);
        }
    };
    fetchPreviewData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configToSave = { ...config, output_instruction: outputInstruction, safety_instruction: safetyInstruction };
      const { error } = await supabase
        .from('ai_plan_prompt_config')
        .upsert({ id: 1, prompt_structure: configToSave, updated_at: new Date().toISOString() });
      
      if (error) throw error;
      showSuccess("Đã lưu prompt thành công!");
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addBlock = () => {
    const newBlock: PromptBlock = { id: crypto.randomUUID(), title: 'Tiêu đề mới', content: '' };
    setConfig(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
  };

  const updateBlock = (id: string, field: 'title' | 'content', value: string) => {
    setConfig(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id === id ? { ...b, [field]: value } : b) }));
  };

  const deleteBlock = (id: string) => {
    setConfig(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === config.blocks.length - 1)) {
      return;
    }
    const newBlocks = [...config.blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setConfig(prev => ({ ...prev, blocks: newBlocks }));
  };

  const insertPlaceholder = (placeholder: string) => {
    if (activeTextareaRef.current) {
      const textarea = activeTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = `${text.substring(0, start)}{{${placeholder}}}${text.substring(end)}`;
      
      const blockId = textarea.dataset.id;
      if (blockId) {
        updateBlock(blockId, 'content', newText);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + placeholder.length + 4;
        }, 0);
      }
    }
  };

  const handleConfigChange = (field: keyof Omit<PromptConfig, 'blocks' | 'output_instruction' | 'safety_instruction'>, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCotFactorChange = (id: string, value: string) => {
    setConfig(prev => ({ ...prev, cotFactors: prev.cotFactors.map(f => f.id === id ? { ...f, value } : f) }));
  };

  const addCotFactor = () => {
    setConfig(prev => ({ ...prev, cotFactors: [...prev.cotFactors, { id: crypto.randomUUID(), value: '' }] }));
  };

  const removeCotFactor = (id: string) => {
    setConfig(prev => ({ ...prev, cotFactors: prev.cotFactors.filter(f => f.id !== id) }));
  };

  const previewPrompt = useMemo(() => {
    let prompt = `### CHỈ THỊ AN TOÀN\n\n${safetyInstruction}\n\n---\n\n` + config.blocks.map(block => `### ${block.title.toUpperCase()}\n\n${block.content}`).join('\n\n---\n\n');

    const inputDescriptions = templateInputFields
        .map(field => `*   **${field.label}:** (Giá trị người dùng nhập)\n    *   *Mô tả/Hướng dẫn cho AI:* ${field.description || 'Không có.'}`)
        .join('\n');
    prompt = prompt.replace(/{{thong_tin_dau_vao}}/g, inputDescriptions || '(Không có thông tin đầu vào.)');

    const documentContext = globalDocuments.length > 0
        ? globalDocuments.map(doc => `--- TÀI LIỆU: ${doc.title} ---\n${doc.content}`).join('\n\n')
        : '(Không có tài liệu tham khảo)';
    prompt = prompt.replace(/{{tai_lieu}}/g, documentContext);

    if (config.useCoT) {
        let cotPrompt = "Let's think step by step.";
        if (config.cotFactors && config.cotFactors.length > 0) {
            const factorsText = config.cotFactors
                .map(factor => `- ${factor.value}`)
                .join('\n');
            cotPrompt += "\n\nHere are the key factors to consider in your thinking process:\n" + factorsText;
        }
        prompt += `\n\n---\n\n${cotPrompt}`;
    }

    const finalOutputInstruction = outputInstruction.replace(/{{json_structure}}/g, '(Cấu trúc JSON động sẽ được chèn vào đây)');
    prompt += finalOutputInstruction;

    return prompt;
  }, [config, outputInstruction, safetyInstruction, templateInputFields, globalDocuments]);

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-600" />
                Chỉ thị An toàn
              </CardTitle>
              <CardDescription>
                Thêm một chỉ thị chung vào đầu mỗi prompt để hướng dẫn AI tránh các bộ lọc an toàn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={safetyInstruction} 
                onChange={e => setSafetyInstruction(e.target.value)} 
                className="min-h-[120px] font-mono text-xs bg-green-50/50 border-green-200" 
              />
            </CardContent>
          </Card>
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Cấu trúc Prompt</CardTitle>
              <CardDescription>Xây dựng prompt của bạn bằng cách thêm và sắp xếp các khối nội dung.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.blocks.map((block, index) => (
                <Card key={block.id} className="bg-slate-50/70">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={block.title} onChange={e => updateBlock(block.id, 'title', e.target.value)} className="font-semibold border-none bg-transparent focus-visible:ring-1" />
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(index, 'down')} disabled={index === config.blocks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                        <Popover>
                          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Code className="h-4 w-4" /></Button></PopoverTrigger>
                          <PopoverContent className="w-60 p-1">
                            <div className="text-xs text-muted-foreground p-2">Chèn biến</div>
                            {placeholders.map(p => (
                              <Button key={p.value} variant="ghost" className="w-full justify-start h-auto py-1.5" onClick={() => insertPlaceholder(p.value)}>
                                <div className="flex flex-col items-start">
                                  <span className="font-mono text-xs">{`{{${p.value}}}`}</span>
                                  <span className="font-sans text-xs text-muted-foreground font-normal">{p.label}</span>
                                </div>
                              </Button>
                            ))}
                          </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteBlock(block.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <Textarea data-id={block.id} value={block.content} onChange={e => updateBlock(block.id, 'content', e.target.value)} onFocus={e => activeTextareaRef.current = e.target} className="min-h-[100px] bg-white" />
                  </CardContent>
                </Card>
              ))}
              <div className="pt-2">
                <Button variant="outline" onClick={addBlock} className="w-full border-dashed"><PlusCircle className="mr-2 h-4 w-4" />Thêm khối</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Yêu cầu đầu ra
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><HelpCircle className="h-4 w-4 text-muted-foreground" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <p>Sử dụng biến <code className="font-mono bg-slate-100 p-1 rounded-sm">{`{{json_structure}}`}</code> để chèn cấu trúc JSON động của kế hoạch vào prompt.</p>
                  </PopoverContent>
                </Popover>
              </CardTitle>
              <CardDescription>Cấu hình phần hướng dẫn AI trả về kết quả theo định dạng mong muốn.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={outputInstruction} onChange={e => setOutputInstruction(e.target.value)} className="min-h-[250px] font-mono text-xs" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white rounded-2xl shadow-sm border border-slate-200/80">
            <CardHeader className="p-6 flex flex-row items-center gap-4">
              <div className="flex-shrink-0 bg-purple-100 p-3 rounded-lg"><SlidersHorizontal className="h-6 w-6 text-purple-600" /></div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Tham Số Đầu Ra</CardTitle>
                <CardDescription className="text-sm text-slate-500 pt-1">Kiểm soát cách LLM tạo ra phản hồi.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <div>
                <Label className="flex justify-between text-sm font-medium text-slate-800"><span>Temperature:</span><span>{config.temperature}</span></Label>
                <Slider value={[config.temperature]} onValueChange={(val) => handleConfigChange('temperature', val[0])} max={1} step={0.05} />
                <p className="text-xs text-slate-500">Thấp: Chính xác, cao: Sáng tạo.</p>
              </div>
              <div>
                <Label className="flex justify-between text-sm font-medium text-slate-800"><span>Top-P:</span><span>{config.topP}</span></Label>
                <Slider value={[config.topP]} onValueChange={(val) => handleConfigChange('topP', val[0])} max={1} step={0.01} />
                <p className="text-xs text-slate-500">Chọn token dựa trên tổng xác suất.</p>
              </div>
              <div>
                <Label htmlFor="max-tokens" className="text-sm font-medium text-slate-800">Max Tokens</Label>
                <Input id="max-tokens" type="number" value={config.maxTokens} onChange={e => handleConfigChange('maxTokens', parseInt(e.target.value, 10))} className="bg-slate-100/70 border-slate-200 rounded-lg h-11" />
                <p className="text-xs text-slate-500">Giới hạn độ dài tối đa của phản hồi.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-2xl shadow-sm border border-slate-200/80">
            <CardHeader className="p-6 flex flex-row items-center gap-4">
              <div className="flex-shrink-0 bg-amber-100 p-3 rounded-lg"><BrainCircuit className="h-6 w-6 text-amber-600" /></div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Kỹ Thuật Nâng Cao</CardTitle>
                <CardDescription className="text-sm text-slate-500 pt-1">Cải thiện khả năng suy luận của mô hình.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="p-3 border rounded-lg bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="cot-switch">Chain of Thought (CoT)</Label>
                    <p className="text-xs text-muted-foreground">Hướng dẫn AI suy luận logic hơn.</p>
                  </div>
                  <Switch id="cot-switch" checked={config.useCoT} onCheckedChange={(checked) => handleConfigChange('useCoT', checked)} />
                </div>
                {config.useCoT && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Label className="text-sm font-medium">Các yếu tố cần suy nghĩ</Label>
                    {(config.cotFactors || []).map(factor => (
                      <div key={factor.id} className="flex items-center gap-2">
                        <Textarea value={factor.value} onChange={(e) => handleCotFactorChange(factor.id, e.target.value)} placeholder="VD: Phân tích cảm xúc của khách hàng" className="bg-white" rows={2} />
                        <Button variant="ghost" size="icon" onClick={() => removeCotFactor(factor.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addCotFactor} className="border-dashed"><PlusCircle className="mr-2 h-4 w-4" />Thêm yếu tố</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsPreviewOpen(true)}><Eye className="mr-2 h-4 w-4" />Xem trước</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu Prompt
          </Button>
        </div>
      </div>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Xem trước Prompt</DialogTitle></DialogHeader>
          <div className="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto p-4 bg-slate-100 rounded-md">
            <ReactMarkdown>{previewPrompt.replace(/\n/g, '  \n')}</ReactMarkdown>
          </div>
          <DialogFooter><Button onClick={() => setIsPreviewOpen(false)}>Đóng</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};