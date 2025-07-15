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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Settings = () => {
  const { settings, setSettings, isLoading } = useApiSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
        embedding_model_name: localSettings.embeddingModelName,
      };
      const { error } = await supabase.from('ai_settings').upsert(dataToSave);
      if (error) throw error;
      setSettings(localSettings);
      showSuccess("Cấu hình API đã được lưu!");
    } catch (error: any) {
      showError("Lưu cấu hình thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

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
        const errorData = await functionError.context.json();
        throw new Error(errorData.error || functionError.message);
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
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Kết nối API</CardTitle>
          <CardDescription>
            Quản lý và kiểm tra trạng thái kết nối đến dịch vụ AI của bạn.
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
          <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
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
    </main>
  );
};

export default Settings;