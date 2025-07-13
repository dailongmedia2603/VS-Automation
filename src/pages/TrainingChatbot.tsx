import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Bot, MessageSquare } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

type AIPrompt = {
  id: number;
  name: string;
  prompt_text: string;
  is_active: boolean;
};

const TrainingChatbot = () => {
  const [prompts, setPrompts] = useState<Record<string, Partial<AIPrompt>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_training_prompts')
        .select('*')
        .in('name', ['auto_reply', 'care_script_suggestion']);

      if (error) {
        showError("Không thể tải dữ liệu huấn luyện: " + error.message);
      } else if (data) {
        const promptsMap = data.reduce((acc, p) => ({ ...acc, [p.name]: p }), {});
        setPrompts(promptsMap);
      }
      setIsLoading(false);
    };
    fetchPrompts();
  }, []);

  const handlePromptChange = (name: string, newPrompt: Partial<AIPrompt>) => {
    setPrompts(prev => ({ ...prev, [name]: newPrompt }));
  };

  const handleSave = async (name: string) => {
    const prompt = prompts[name];
    if (!prompt) return;
    setIsSaving(prev => ({ ...prev, [name]: true }));
    const { error } = await supabase
      .from('ai_training_prompts')
      .update({ prompt_text: prompt.prompt_text, is_active: prompt.is_active })
      .eq('name', name);
    
    if (error) {
      showError(`Lưu thất bại: ${error.message}`);
    } else {
      showSuccess("Đã lưu thay đổi!");
    }
    setIsSaving(prev => ({ ...prev, [name]: false }));
  };

  const renderPromptCard = (
    name: string,
    title: string,
    description: string,
    icon: React.ElementType
  ) => {
    const prompt = prompts[name];
    const saving = isSaving[name];
    const Icon = icon;

    if (isLoading) {
      return (
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          <CardFooter><Skeleton className="h-10 w-28" /></CardFooter>
        </Card>
      );
    }

    if (!prompt) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Icon className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{prompt.is_active ? 'Bật' : 'Tắt'}</span>
              <Switch
                checked={prompt.is_active}
                onCheckedChange={(checked) => handlePromptChange(name, { ...prompt, is_active: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Nhập nội dung huấn luyện cho AI..."
            value={prompt.prompt_text || ''}
            onChange={(e) => handlePromptChange(name, { ...prompt, prompt_text: e.target.value })}
            rows={15}
            className="font-mono text-sm leading-6"
            disabled={!prompt.is_active}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={() => handleSave(name)} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Huấn luyện AI cho Chatbot</h2>
      </div>
      <Tabs defaultValue="auto-reply">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto-reply">Tự động trả lời</TabsTrigger>
          <TabsTrigger value="care-scenario">Kịch bản chăm sóc</TabsTrigger>
        </TabsList>
        <TabsContent value="auto-reply" className="mt-4">
          {renderPromptCard(
            'auto_reply',
            'Tự động trả lời tin nhắn đầu tiên',
            'Cấu hình nội dung AI sẽ tự động gửi khi có khách hàng mới nhắn tin.',
            MessageSquare
          )}
        </TabsContent>
        <TabsContent value="care-scenario" className="mt-4">
          {renderPromptCard(
            'care_script_suggestion',
            'Gợi ý kịch bản chăm sóc khách hàng',
            'Dạy AI cách phân tích và đề xuất nội dung chăm sóc khách hàng tự động.',
            Bot
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default TrainingChatbot;