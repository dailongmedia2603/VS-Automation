import { useState, useEffect } from 'react';
import { settingsService } from '@/api/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, XCircle, Rocket } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

const CliproxySettings = () => {
  const [apiUrl, setApiUrl] = useState('https://cliproxy.pcdl.io.vn');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('gpt-5.2');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const data = await settingsService.getAll();
        setApiUrl(data.cliproxy_settings?.api_url || 'https://cliproxy.pcdl.io.vn');
        setApiKey(data.cliproxy_settings?.api_key || '');
        setDefaultModel(data.cliproxy_settings?.default_model || 'gpt-5.2');
      } catch (error: any) {
        showError("Không thể tải cài đặt Cliproxy: " + error.message);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateCliproxySettings({
        api_url: apiUrl,
        api_key: apiKey,
        default_model: defaultModel
      });
      showSuccess("Đã lưu cài đặt Cliproxy thành công!");
    } catch (error: any) {
      showError("Lưu cài đặt thất bại: " + error.message);
    }
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('testing');
    setTestError(null);
    try {
      const result = await settingsService.testCliproxyConnection(apiUrl, apiKey, defaultModel);
      if (result.success) {
        setTestStatus('success');
        showSuccess(result.message || "Kết nối thành công!");
      } else {
        throw new Error(result.message);
      }
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
          <Rocket className="h-6 w-6 text-blue-600" />
          Cấu hình API Cliproxy
        </CardTitle>
        <CardDescription>
          Kết nối với dịch vụ API Cliproxy để sử dụng mô hình AI tập trung.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cliproxy-url">Base URL</Label>
          <Input
            id="cliproxy-url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://cliproxy.pcdl.io.vn"
            className="bg-slate-100 border-none rounded-lg font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Địa chỉ API endpoint gốc.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliproxy-key">API Key</Label>
          <Input
            id="cliproxy-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Nhập API Key cung cấp bởi hệ thống Cliproxy..."
            className="bg-slate-100 border-none rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliproxy-model">Model Mặc định</Label>
          <Input
            id="cliproxy-model"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            placeholder="gpt-5.2"
            className="bg-slate-100 border-none rounded-lg font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Mô hình mặc định sẽ được gọi khi sử dụng kết nối này.</p>
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

export default CliproxySettings;
