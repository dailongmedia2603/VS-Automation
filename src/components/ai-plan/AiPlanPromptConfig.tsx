import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, Info } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_plan_prompt_config')
          .select('prompt_template')
          .eq('id', 1)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setPrompt(data.prompt_template || '');
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
        .upsert({ id: 1, prompt_template: prompt, updated_at: new Date().toISOString() });
      
      if (error) throw error;
      showSuccess("Đã lưu prompt thành công!");
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-24 mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình Prompt tạo Kế hoạch AI</CardTitle>
          <CardDescription>
            Chỉnh sửa mẫu prompt được sử dụng để giao tiếp với AI. Các biến trong dấu ngoặc nhọn 
            <code>{` {{...}} `}</code> 
            sẽ được tự động thay thế bằng dữ liệu từ cấu hình của mỗi kế hoạch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
            placeholder="Nhập prompt của bạn ở đây..."
          />
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu Prompt
          </Button>
        </CardContent>
      </Card>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Các biến có sẵn</AlertTitle>
        <AlertDescription>
          Bạn có thể sử dụng các biến sau trong prompt của mình:
          <div className="flex flex-wrap gap-2 mt-2">
            {placeholders.map(p => (
              <code key={p} className="text-xs bg-slate-200 text-slate-800 rounded px-2 py-1">{`{{${p}}}`}</code>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};