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
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Settings = () => {
  const { settings, setSettings, isLoading } = useApiSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  
  const [chatApiStatus, setChatApiStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [chatApiError, setChatApiError] = useState<string | null>(null);

  const [openaiApiStatus, setOpenaiApiStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [openaiApiError, setOpenaiApiError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        id: 1,
        api_url: localSettings.apiUrl,
        api_key: localSettings.apiKey,
        // embedding_model_name is removed for clarity
        openai_api_url: localSettings.openaiApiUrl,
        openai_api_key: localSettings.openaiApiKey,
        openai_embedding_model: localSettings.openaiEmbeddingModel,
      };
      const { error } = await supabase.from('ai_settings').upsert(dataToSave, { onConflict: 'id' });
      if (error) throw error;
      setSettings(localSettings);
      showSuccess("Cấu hình API đã được lưu!");
    } catch (error: any) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestChatApi = async () => {
    setChatApiStatus("testing");
    setChatApiError(null);

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
        const errorData = await functionError.context.json();
        throw new Error(errorData.error || functionError.message);
      }
      
      if (data && data.error) {
        throw new Error(data.error);
      }

      if (data && data.choices && data.choices.length > 0) {
        setChatApiStatus("success");
        showSuccess("Kết nối API Chat thành công!");
      } else {
        throw new Error("Phản hồi từ API không hợp lệ.");
      }
    } catch (err: any) {
      setChatApiStatus("error");
      const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
      setChatApiError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  const handleTestOpenaiApi = async () => {
    setOpenaiApiStatus("testing");
    setOpenaiApiError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "multi-ai-proxy",
        {
          body: {
            input: "test",
            apiUrl: localSettings.openaiApiUrl,
            apiKey: localSettings.openaiApiKey,
            embeddingModelName: localSettings.openaiEmbeddingModel,
          },
        }
      );
      if (functionError) {
        const errorData = await functionError.context.json();
        throw new Error(errorData.error || functionError.message);
      }
      if (data && data.error) throw new Error(data.error);
      if (data && data.data && data.data.length > 0) {
        setOpenaiApiStatus("success");
        showSuccess("Kết nối API OpenAI Embedding thành công!");
      } else {
        throw new Error("Phản hồi từ API không hợp lệ.");
      }
    } catch (err: any) {
      setOpenaiApiStatus("error");
      const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
      setOpenaiApiError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 space-y-6 p-6 sm:p-8">
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
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt API AI</h2>
      <Tabs defaultValue="chat-api" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="chat-api">API Chat</TabsTrigger>
          <TabsTrigger value="embedding-api">API Embedding</TabsTrigger>
        </TabsList>
        <TabsContent value="chat-api">
          <Card className="mt-4 shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Kết nối API Chat</CardTitle>
              <CardDescription>
                Quản lý và kiểm tra trạng thái kết nối đến dịch vụ AI cho việc chat (VD: MultiApp AI).
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
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                    <p className="font-medium">Kiểm tra kết nối</p>
                    {chatApiStatus === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
                    {chatApiStatus === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
                    {chatApiStatus === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
                    {chatApiStatus === "error" && <Badge variant="destructive">Thất bại</Badge>}
                </div>
                <Button onClick={handleTestChatApi} disabled={chatApiStatus === "testing"} className="mt-4 rounded-lg">
                  {chatApiStatus === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối API Chat"}
                </Button>
                {chatApiError && (
                  <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-bold">Chi tiết lỗi:</p>
                    <p className="font-mono break-all">{chatApiError}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="embedding-api">
          <Card className="mt-4 shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>API chính thức dùng Embedding Model</CardTitle>
              <CardDescription>
                Cấu hình API chính thức của OpenAI để sử dụng cho tính năng embedding tài liệu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="openai-api-url">API Endpoint URL</Label>
                <Input
                  id="openai-api-url"
                  value={localSettings.openaiApiUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, openaiApiUrl: e.target.value })}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                <Input
                  id="openai-api-key"
                  type="password"
                  value={localSettings.openaiApiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, openaiApiKey: e.target.value })}
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-embedding-model">Embedding Model Name</Label>
                <Select
                  value={localSettings.openaiEmbeddingModel}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, openaiEmbeddingModel: value })}
                >
                  <SelectTrigger className="bg-slate-100 border-none rounded-lg">
                    <SelectValue placeholder="Chọn model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                    <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                    <p className="font-medium">Kiểm tra kết nối</p>
                    {openaiApiStatus === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
                    {openaiApiStatus === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
                    {openaiApiStatus === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
                    {openaiApiStatus === "error" && <Badge variant="destructive">Thất bại</Badge>}
                </div>
                <Button onClick={handleTestOpenaiApi} disabled={openaiApiStatus === "testing"} className="mt-4 rounded-lg">
                  {openaiApiStatus === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối API Embedding"}
                </Button>
                {openaiApiError && (
                  <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-bold">Chi tiết lỗi:</p>
                    <p className="font-mono break-all">{openaiApiError}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="rounded-lg bg-blue-600 hover:bg-blue-700">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? "Đang lưu..." : "Lưu tất cả thay đổi"}
        </Button>
      </div>
    </main>
  );
};

export default Settings;