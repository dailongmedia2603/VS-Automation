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
import { Loader2, Terminal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt</h2>
      <Card>
        <CardHeader>
          <CardTitle>Kết nối API</CardTitle>
          <CardDescription>
            Quản lý và kiểm tra trạng thái kết nối đến dịch vụ MultiApp AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-url">API Endpoint URL</Label>
            <Input
              id="api-url"
              value={localSettings.apiUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, apiUrl: e.target.value })}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          
          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
                <p className="font-medium">Kiểm tra kết nối</p>
                {status === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
                {status === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
                {status === "success" && <Badge variant="default">Thành công</Badge>}
                {status === "error" && <Badge variant="destructive">Thất bại</Badge>}
            </div>
            <Button onClick={handleTestConnection} disabled={status === "testing"} className="mt-4">
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