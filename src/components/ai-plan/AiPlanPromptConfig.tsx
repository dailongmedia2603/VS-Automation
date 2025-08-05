import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, Info, PlusCircle, Trash2, ArrowUp, ArrowDown, Eye, Code } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';

type PromptBlock = {
  id: string;
  title: string;
  content: string;
};

const placeholders = [
  'productDescription',
  'targetAudience',
  'goals',
  'budget',
  'timeline',
  'keyMessage',
  'competitors',
];

export const AiPlanPromptConfig = () => {
  const [blocks, setBlocks] = useState<PromptBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
        if (data && Array.isArray(data.prompt_structure)) {
          setBlocks(data.prompt_structure);
        }
      } catch (error: any) {
        showError("Không thể tải prompt: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompt();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_plan_prompt_config')
        .upsert({ id: 1, prompt_structure: blocks, updated_at: new Date().toISOString() });
      
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
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, field: 'title' | 'content', value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) {
      return;
    }
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
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
        // Restore focus and cursor position after state update
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + placeholder.length + 4;
        }, 0);
      }
    }
  };

  const previewPrompt = useMemo(() => {
    return blocks.map(block => `### ${block.title.toUpperCase()}\n\n${block.content}`).join('\n\n---\n\n');
  }, [blocks]);

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình Prompt tạo Kế hoạch AI</CardTitle>
          <CardDescription>Xây dựng prompt của bạn bằng cách thêm và sắp xếp các khối nội dung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <Card key={block.id} className="bg-slate-50/70">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={block.title} onChange={e => updateBlock(block.id, 'title', e.target.value)} className="font-semibold border-none bg-transparent focus-visible:ring-1" />
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                      <Popover>
                        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Code className="h-4 w-4" /></Button></PopoverTrigger>
                        <PopoverContent className="w-60 p-1">
                          <div className="text-xs text-muted-foreground p-2">Chèn biến</div>
                          {placeholders.map(p => (
                            <Button key={p} variant="ghost" className="w-full justify-start font-mono text-xs h-8" onClick={() => insertPlaceholder(p)}>{`{{${p}}}`}</Button>
                          ))}
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteBlock(block.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Textarea
                    data-id={block.id}
                    value={block.content}
                    onChange={e => updateBlock(block.id, 'content', e.target.value)}
                    onFocus={e => activeTextareaRef.current = e.target}
                    className="min-h-[100px] bg-white"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={addBlock}><PlusCircle className="mr-2 h-4 w-4" />Thêm khối</Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsPreviewOpen(true)}><Eye className="mr-2 h-4 w-4" />Xem trước</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu Prompt
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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