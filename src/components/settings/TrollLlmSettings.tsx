import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, XCircle, Rocket } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

const TrollLlmSettings = () => {
  const [apiUrl, setApiUrl] = useState('https://chat.trollllm.xyz/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('gemini-3-pro-preview');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_settings')
        .select('troll_llm_api_url, troll_llm_api_key, troll_llm_model_id')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        showError("Không thể tải cài đặt: " + error.message);
      } else if (data) {
        setApiUrl(data.troll_llm_api_url || 'https://chat.trollllm.xyz/v1');
        setApiKey(data.troll_llm_api_key || '');
        setModelId(data.troll_llm_model_id || 'gemini-3-pro-preview');
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('ai_settings')
      .upsert({ 
        id: 1, 
        troll_llm_api_url: apiUrl, 
        troll_llm_api_key: apiKey,
        troll_llm_model_id: modelId
      });
    
    if (error) {
      showError("Lưu cài đặt thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu cài đặt Troll LLM thành công!");
    }
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('testing');
    setTestError(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-troll-llm', {
        body: { apiUrl, apiKey, model: modelId }
      });

      if (error) {
        const errorBody = await error.context.json().catch(() => ({}));
        throw new Error(errorBody.error || error.message);
      }
      if (data.error) throw new Error(data.error);

      setTestStatus('success');
      showSuccess(data.message || "Kết nối thành công!");
    } catch (err: any) {
      setTestStatus('error');
      setTestError(err.message);
      showError(`Kiểm tra thất bại: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm rounded-2xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-purple-600" />
          Cấu hình API Troll LLM
        </CardTitle>
        <CardDescription>
          Kết nối với dịch vụ Troll LLM để sử dụng các mô hình ngôn ngữ mạnh mẽ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="troll-url">Base URL</Label>
          <Input
            id="troll-url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://chat.trollllm.xyz/v1"
            className="bg-slate-100 border-none rounded-lg font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Địa chỉ API endpoint (OpenAI compatible).</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="troll-key">API Key</Label>
          <Input
            id="troll-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="bg-slate-100 border-none rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="troll-model">Model ID</Label>
          <Input
            id="troll-model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gemini-3-pro-preview"
            className="bg-slate-100 border-none rounded-lg font-mono text-sm"
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu cấu hình
        </Button>

        <div className="border-t pt-6 mt-2">
          <div className="flex items-center justify-between">
              <p className="font-medium text-sm text-slate-700">Trạng thái kết nối</p>
              {testStatus === "idle" && <Badge variant="outline" className="bg-slate-50">Chưa kiểm tra</Badge>}
              {testStatus === "testing" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Đang kiểm tra...</Badge>}
              {testStatus === "success" && <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Thành công</Badge>}
              {testStatus === "error" && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Thất bại</Badge>}
          </div>
          
          <Button onClick={handleTestConnection} disabled={isTesting || !apiKey} variant="outline" className="mt-4 w-full border-dashed">
            {isTesting ? "Đang kết nối..." : "Kiểm tra kết nối ngay"}
          </Button>
          
          {testError && (
            <div className="mt-4 text-xs text-red-600 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="font-bold mb-1">Chi tiết lỗi:</p>
              <p className="font-mono break-all">{testError}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrollLlmSettings;