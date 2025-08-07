import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { useApiSettings } from "@/contexts/ApiSettingsContext";
import { Loader2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacebookApiReference } from "@/components/FacebookApiReference";
import TelegramSettings from "@/components/settings/TelegramSettings";

const geminiModels = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-preview-image-generation', label: 'Gemini 2.0 Flash Preview Image Generation' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
];

const Settings = () => {
  // AI API Settings state
  const { settings, setSettings, isLoading: isLoadingApi } = useApiSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSavingApi, setIsSavingApi] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>("idle");
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Integrations state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);

  // Facebook API Settings state
  const [fbApiUrl, setFbApiUrl] = useState('');
  const [urlTemplates, setUrlTemplates] = useState<{ [key: string]: string }>({ comment_check: '' });
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [isLoadingFb, setIsLoadingFb] = useState(true);
  const [isSavingFb, setIsSavingFb] = useState(false);
  const [fbApiStatus, setFbApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>("idle");
  const [fbApiError, setFbApiError] = useState<string | null>(null);

  // State for the new feature URL form
  const [newFeature, setNewFeature] = useState('comment_check');
  const [newUrl, setNewUrl] = useState('');

  // Effect for AI API settings
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Effect for Integrations and Facebook settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingIntegrations(true);
      setIsLoadingFb(true);
      try {
        const [n8nRes, fbRes] = await Promise.all([
          supabase.from('n8n_settings').select('zalo_webhook_url').eq('id', 1).single(),
          supabase.from('apifb_settings').select('api_url, url_templates, api_key').eq('id', 1).single()
        ]);

        if (n8nRes.error && n8nRes.error.code !== 'PGRST116') throw n8nRes.error;
        if (n8nRes.data) setWebhookUrl(n8nRes.data.zalo_webhook_url || '');

        if (fbRes.error && fbRes.error.code !== 'PGRST116') throw fbRes.error;
        if (fbRes.data) {
          setFbApiUrl(fbRes.data.api_url || '');
          setUrlTemplates(fbRes.data.url_templates || { comment_check: '' });
          setFbAccessToken(fbRes.data.api_key || '');
        }
      } catch (error: any) {
        showError("Không thể tải cài đặt: " + error.message);
      } finally {
        setIsLoadingIntegrations(false);
        setIsLoadingFb(false);
      }
    };
    fetchSettings();
  }, []);

  const handleAddOrUpdateFeatureUrl = () => {
    if (!newFeature || !newUrl) {
      showError("Vui lòng chọn tính năng và nhập URL.");
      return;
    }
    setUrlTemplates(prev => ({ ...prev, [newFeature]: newUrl }));
    setNewUrl('');
    showSuccess(`Đã cập nhật URL cho tính năng: ${newFeature}`);
  };

  const handleDeleteFeatureUrl = (featureKey: string) => {
    setUrlTemplates(prev => {
      const newTemplates = { ...prev };
      delete newTemplates[featureKey];
      return newTemplates;
    });
  };

  // Save handler for AI API
  const handleSaveApi = async () => {
    setIsSavingApi(true);
    try {
      const dataToSave = {
        id: 1,
        api_url: localSettings.apiUrl,
        api_key: localSettings.apiKey,
        embedding_model_name: localSettings.embeddingModelName,
        google_gemini_api_key: localSettings.googleGeminiApiKey,
        gemini_scan_model: localSettings.geminiScanModel,
        gemini_content_model: localSettings.geminiContentModel,
      };
      const { error } = await supabase.from('ai_settings').upsert(dataToSave);
      if (error) throw error;
      setSettings(localSettings);
      showSuccess("Cấu hình API đã được lưu!");
    } catch (error: any) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } finally {
      setIsSavingApi(false);
    }
  };

  // Test connection handler for AI API
  const handleTestConnection = async () => {
    setStatus("testing");
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "multi-ai-proxy",
        {
          body: {
            messages: [{ role: "user", content: "Hello" }],
            apiUrl: localSettings.apiUrl,
            apiKey: localSettings.apiKey,
          },
        }
      );

      if (functionError) {
        let errorMessage = functionError.message;
        if (functionError.context && typeof functionError.context.json === 'function') {
          try {
            const errorBody = await functionError.context.json();
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Bỏ qua lỗi phân tích JSON
          }
        }
        throw new Error(errorMessage);
      }
      
      if (data && data.error) {
        throw new Error(data.error);
      }

      if (data && data.choices && data.choices.length > 0) {
        setStatus("success");
        showSuccess("Kết nối API thành công!");
      } else {
        throw new Error("Phản hồi từ API không hợp lệ.");
      }
    } catch (err: any) {
      setStatus("error");
      const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
      setError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  const handleTestGeminiConnection = async () => {
    setGeminiStatus("testing");
    setGeminiError(null);
    try {
        const { data, error } = await supabase.functions.invoke('test-gemini-api', {
            body: { apiKey: localSettings.googleGeminiApiKey }
        });

        if (error) {
            const errorBody = await error.context.json();
            throw new Error(errorBody.error || error.message);
        }
        if (data.error) throw new Error(data.error);

        setGeminiStatus("success");
        showSuccess("Kết nối API Google Gemini thành công!");
    } catch (err: any) {
        setGeminiStatus("error");
        const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
        setGeminiError(errorMessage);
        showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  // Save handler for Integrations
  const handleSaveIntegrations = async () => {
    setIsSavingIntegrations(true);
    try {
      const { error } = await supabase
        .from('n8n_settings')
        .upsert({ id: 1, zalo_webhook_url: webhookUrl });

      if (error) throw error;
      showSuccess("Đã lưu URL webhook thành công!");
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  // Save handler for Facebook API
  const handleSaveFacebook = async () => {
    setIsSavingFb(true);
    try {
      const { error } = await supabase
        .from('apifb_settings')
        .upsert({ id: 1, api_url: fbApiUrl, url_templates: urlTemplates, api_key: fbAccessToken });

      if (error) throw error;
      showSuccess("Đã lưu cấu hình API Facebook!");
    } catch (error: any) {
      const errorMessage = error?.message || 'Lỗi không xác định. Vui lòng kiểm tra lại cấu hình bảng "apifb_settings" trên Supabase.';
      showError("Lưu thất bại: " + errorMessage);
    } finally {
      setIsSavingFb(false);
    }
  };

  const handleTestFbConnection = async () => {
    setFbApiStatus("testing");
    setFbApiError(null);
    try {
        const { data, error } = await supabase.functions.invoke('test-fb-api', {
            body: { apiUrl: fbApiUrl, accessToken: fbAccessToken }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setFbApiStatus("success");
        showSuccess(`Kết nối thành công! Xin chào, ${data.data.name}.`);
    } catch (err: any) {
        setFbApiStatus("error");
        const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
        setFbApiError(errorMessage);
        showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  const pageIsLoading = isLoadingApi || isLoadingIntegrations || isLoadingFb;

  if (pageIsLoading) {
    return (
      <main className="flex-1 space-y-6 p-6 sm:p-8 overflow-y-auto">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Card className="shadow-sm rounded-2xl bg-white">
          <CardHeader>
            <Skeleton className="h-6 w-1/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt chung</h2>
      <Tabs defaultValue="api-facebook">
        <TabsList className="flex justify-start items-center gap-1 p-0 bg-transparent">
          <TabsTrigger value="api-ai" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Cài đặt API AI</TabsTrigger>
          <TabsTrigger value="api-ai-scan" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">API AI Check Scan</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Tích hợp</TabsTrigger>
          <TabsTrigger value="api-facebook" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">API Facebook Graph</TabsTrigger>
          <TabsTrigger value="telegram" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Telegram</TabsTrigger>
        </TabsList>
        <TabsContent value="api-ai" className="mt-4">
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Kết nối API</CardTitle>
              <CardDescription>
                Quản lý và kiểm tra trạng thái kết nối đến dịch vụ AI của bạn (VD: OpenAI).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-url">API Endpoint URL</Label>
                <Input
                  id="api-url"
                  value={localSettings.apiUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiUrl: e.target.value })}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={localSettings.apiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedding-model">Embedding Model Name</Label>
                <Select
                  value={localSettings.embeddingModelName}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, embeddingModelName: value })}
                >
                  <SelectTrigger className="bg-slate-100 border-none rounded-lg">
                    <SelectValue placeholder="Chọn model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                    <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Quan trọng: Chọn model embedding mà nhà cung cấp API của bạn đã cấp quyền.
                </p>
              </div>
              <Button onClick={handleSaveApi} disabled={isSavingApi} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                {isSavingApi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSavingApi ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                    <p className="font-medium">Kiểm tra kết nối</p>
                    {status === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
                    {status === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
                    {status === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
                    {status === "error" && <Badge variant="destructive">Thất bại</Badge>}
                </div>
                <Button onClick={handleTestConnection} disabled={status === "testing"} className="mt-4 rounded-lg">
                  {status === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                </Button>
                {error && (
                  <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-bold">Chi tiết lỗi:</p>
                    <p className="font-mono break-all">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="api-ai-scan" className="mt-4">
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>API AI Check Scan</CardTitle>
              <CardDescription>Cấu hình API từ Google AI Studio (Gemini) để sử dụng cho các tính năng AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="google-api-key">Google AI Studio API Key</Label>
                <Input
                  id="google-api-key"
                  type="password"
                  value={localSettings.googleGeminiApiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, googleGeminiApiKey: e.target.value })}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="scan-model">Model cho Check content post scan</Label>
                  <Select value={localSettings.geminiScanModel} onValueChange={(value) => setLocalSettings(s => ({...s, geminiScanModel: value}))}>
                    <SelectTrigger id="scan-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {geminiModels.map(model => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-model">Model cho Content AI</Label>
                  <Select value={localSettings.geminiContentModel} onValueChange={(value) => setLocalSettings(s => ({...s, geminiContentModel: value}))}>
                    <SelectTrigger id="content-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {geminiModels.map(model => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveApi} disabled={isSavingApi} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                  {isSavingApi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingApi ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
                <Button onClick={handleTestGeminiConnection} disabled={geminiStatus === "testing"} variant="outline" className="rounded-lg">
                  {geminiStatus === "testing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Kiểm tra kết nối
                </Button>
              </div>
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                    <p className="font-medium">Trạng thái kết nối</p>
                    {geminiStatus === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
                    {geminiStatus === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
                    {geminiStatus === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
                    {geminiStatus === "error" && <Badge variant="destructive">Thất bại</Badge>}
                </div>
                {geminiError && (
                  <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-bold">Chi tiết lỗi:</p>
                    <p className="font-mono break-all">{geminiError}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Tích hợp n8n</CardTitle>
              <CardDescription>
                Cấu hình webhook để gửi dữ liệu từ ứng dụng đến n8n khi có sự kiện xảy ra.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Zalo Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="Dán URL webhook từ n8n vào đây"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="bg-slate-100 border-none rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Sự kiện gửi tin nhắn Zalo sẽ được gửi đến URL này.
                </p>
              </div>
              <Button onClick={handleSaveIntegrations} disabled={isSavingIntegrations} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                {isSavingIntegrations && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSavingIntegrations ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="api-facebook" className="mt-4 space-y-6">
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Cấu hình Chung API Facebook</CardTitle>
              <CardDescription>
                Nhập thông tin kết nối cơ bản đến dịch vụ API của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fb-api-url">URL API Gốc</Label>
                <Input
                  id="fb-api-url"
                  placeholder="http://api.akng.io.vn"
                  value={fbApiUrl}
                  onChange={(e) => setFbApiUrl(e.target.value)}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb-access-token">Access Token</Label>
                <Input
                  id="fb-access-token"
                  type="password"
                  placeholder="EAA..."
                  value={fbAccessToken}
                  onChange={(e) => setFbAccessToken(e.target.value)}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="border-t pt-6 mt-2">
                <div className="flex items-center justify-between">
                    <p className="font-medium">Kiểm tra kết nối</p>
                    {fbApiStatus === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
                    {fbApiStatus === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
                    {fbApiStatus === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
                    {fbApiStatus === "error" && <Badge variant="destructive">Thất bại</Badge>}
                </div>
                <Button onClick={handleTestFbConnection} disabled={fbApiStatus === "testing" || !fbApiUrl} className="mt-4 rounded-lg">
                  {fbApiStatus === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                </Button>
                {fbApiError && (
                  <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-bold">Chi tiết lỗi:</p>
                    <p className="font-mono break-all">{fbApiError}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Cấu hình URL theo Tính năng</CardTitle>
              <CardDescription>
                Định nghĩa các mẫu URL cho từng tính năng cụ thể.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="feature-select">Tính năng</Label>
                    <Select value={newFeature} onValueChange={setNewFeature}>
                      <SelectTrigger id="feature-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comment_check">Check Comment</SelectItem>
                        <SelectItem value="post_approval">Check Duyệt Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="feature-url">Mẫu URL</Label>
                    <Input id="feature-url" placeholder="http://api.example.com/graph/{postId}/comments" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Sử dụng <code>{`{postId}`}</code> hoặc các biến khác nếu cần.</p>
                  </div>
                </div>
                <Button onClick={handleAddOrUpdateFeatureUrl}>Thêm / Cập nhật</Button>
              </div>
              
              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-sm">Danh sách URL đã lưu</h4>
                {Object.keys(urlTemplates).length > 0 ? (
                  <div className="border rounded-lg">
                    {Object.entries(urlTemplates).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div>
                          <p className="font-semibold text-slate-700">{key === 'comment_check' ? 'Check Comment' : key === 'post_approval' ? 'Check Duyệt Post' : key}</p>
                          <p className="text-xs text-muted-foreground font-mono">{value}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFeatureUrl(key)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Chưa có URL nào được cấu hình.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveFacebook} disabled={isSavingFb} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              {isSavingFb && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu tất cả cấu hình Facebook
            </Button>
          </div>

          <FacebookApiReference baseUrl={fbApiUrl} accessToken={fbAccessToken} />
        </TabsContent>
        <TabsContent value="telegram" className="mt-4">
          <TelegramSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Settings;