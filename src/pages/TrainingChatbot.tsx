import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    setPrompts(prev => ({ ...prev, [name]: { ...(prev[name] || {}), ...newPrompt } }));
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

    if (!prompt) return null;

    return (
      <Card className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-full">
        <CardHeader className="flex flex-row items-start justify-between p-0 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={!!prompt.is_active}
            onCheckedChange={(checked) => handlePromptChange(name, { ...prompt, is_active: checked })}
          />
        </CardHeader>
        <CardContent className="flex-grow p-0">
          <Textarea
            placeholder="Nhập nội dung huấn luyện cho AI..."
            value={prompt.prompt_text || ''}
            onChange={(e) => handlePromptChange(name, { ...prompt, prompt_text: e.target.value })}
            className="h-full min-h-[300px] resize-none border rounded-lg bg-gray-50/70 p-4 text-sm focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500"
            disabled={!prompt.is_active}
          />
        </CardContent>
        <CardFooter className="p-0 pt-6">
          <Button onClick={() => handleSave(name)} disabled={saving} size="lg" className="rounded-lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 md:p-10 bg-gray-50/50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Training Chatbot</h1>
        <p className="text-muted-foreground mt-2">
          Dạy cho AI cách trả lời và tương tác trong các tình huống cụ thể.
        </p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[520px] w-full rounded-2xl" />
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {renderPromptCard(
            'auto_reply',
            'Tự động trả lời',
            'Cấu hình tin nhắn tự động khi có khách hàng mới.',
            MessageSquare
          )}
          {renderPromptCard(
            'care_script_suggestion',
            'Kịch bản chăm sóc',
            'Dạy AI cách đề xuất nội dung chăm sóc khách hàng.',
            Bot
          )}
        </div>
      )}
    </main>
  );
};

export default TrainingChatbot;