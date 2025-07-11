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

const API_KEY_PROVIDED = "sk-EWcoOk8zZtfGel2Utawq3Y09Wrf9m6A3u1XzvtafHDaEPJhX";

const Settings = () => {
  const { apiUrl, setApiUrl } = useApiSettings();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalApiUrl(apiUrl);
  }, [apiUrl]);

  const handleSave = () => {
    setApiUrl(localApiUrl);
    showSuccess("API Endpoint URL đã được cập nhật!");
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
            apiUrl: localApiUrl, // Gửi URL đang được kiểm tra
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
              value={localApiUrl}
              onChange={(e) => setLocalApiUrl(e.target.value)}
            />
            <Button onClick={handleSave}>Lưu thay đổi</Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">API Key (được lấy từ máy chủ)</p>
              <p className="text-sm text-muted-foreground font-mono">
                ...bí mật...
              </p>
            </div>
          </div>
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