import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

const GeminiCustomSettings = () => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
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
        .select('custom_gemini_api_url, custom_gemini_api_key')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        showError("Không thể tải cài đặt: " + error.message);
      } else if (data) {
        setApiUrl(data.custom_gemini_api_url || '');
        setApiKey(data.custom_gemini_api_key || '');
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('ai_settings')
      .upsert({ id: 1, custom_gemini_api_url: apiUrl, custom_gemini_api_key: apiKey });
    
    if (error) {
      showError("Lưu cài đặt thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu cài đặt thành công!");
    }
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('testing');
    setTestError(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-gemini-custom', {
        body: { apiUrl, token: apiKey }
      });

      if (error) {
        const errorBody = await error.context.json();
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
        <CardTitle>Kết nối API Gemini Custom</CardTitle>
        <CardDescription>
          Cấu hình API Gemini tùy chỉnh của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="custom-gemini-url">API URL</Label>
          <Input
            id="custom-gemini-url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://aquarius.qcv.vn/api/chat"
            className="bg-slate-100 border-none rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-gemini-key">Token</Label>
          <Input
            id="custom-gemini-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-slate-100 border-none rounded-lg"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu cấu hình
        </Button>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
              <p className="font-medium">Kiểm tra kết nối</p>
              {testStatus === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
              {testStatus === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
              {testStatus === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
              {testStatus === "error" && <Badge variant="destructive">Thất bại</Badge>}
          </div>
          <Button onClick={handleTestConnection} disabled={isTesting} className="mt-4 rounded-lg">
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kiểm tra kết nối
          </Button>
          {testError && (
            <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-bold">Chi tiết lỗi:</p>
              <p className="font-mono break-all">{testError}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeminiCustomSettings;