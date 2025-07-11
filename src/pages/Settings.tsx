import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { showSuccess, showError } from "@/utils/toast";

const API_KEY_PROVIDED = "sk-EWcoOk8zZtfGel2Utawq3Y09Wrf9m6A3u1XzvtafHDaEPJhX";
const API_URL = "https://multiappai-api.itmovnteam.com/api/v1/chat/completions";

const Settings = () => {
  const [status, setStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setStatus("testing");
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "multi-ai-proxy",
        {
          body: {
            messages: [{ role: "user", content: "Hello" }],
          },
        }
      );

      if (functionError) {
        // Cải tiến: Cố gắng đọc lỗi chi tiết từ phản hồi của function
        if (functionError.context && typeof functionError.context.json === 'function') {
            const errorData = await functionError.context.json();
            throw new Error(errorData.error || functionError.message);
        }
        // Nếu không có, dùng lỗi mặc định
        throw new Error(functionError.message);
      }
      
      if (data && data.error) {
        throw new Error(data.error);
      }

      if (data && data.choices && data.choices.length > 0) {
        setStatus("success");
        showSuccess("Kết nối API thành công!");
      } else {
        throw new Error("Phản hồi từ API không hợp lệ hoặc không chứa nội dung.");
      }
    } catch (err: any) {
      setStatus("error");
      const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
      setError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "success":
        return <Badge variant="default">Đã kết nối</Badge>;
      case "error":
        return <Badge variant="destructive">Lỗi</Badge>;
      case "testing":
        return <Badge variant="secondary">Đang kiểm tra...</Badge>;
      default:
        return <Badge variant="outline">Chưa kiểm tra</Badge>;
    }
  };

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Cài đặt</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Kết nối API</CardTitle>
          <CardDescription>
            Quản lý và kiểm tra trạng thái kết nối đến dịch vụ MultiApp AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">API Endpoint URL</p>
              <p className="text-sm text-muted-foreground font-mono">
                {API_URL}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">API Key</p>
              <p className="text-sm text-muted-foreground font-mono">
                {`${API_KEY_PROVIDED.substring(0, 8)}...${API_KEY_PROVIDED.substring(API_KEY_PROVIDED.length - 8)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Trạng thái</p>
              <p className="text-sm text-muted-foreground">
                Trạng thái hiện tại của kết nối API.
              </p>
            </div>
            {getStatusBadge()}
          </div>
          {error && (
            <div className="text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-bold">Chi tiết lỗi:</p>
              <p>{error}</p>
            </div>
          )}
          <Button onClick={handleTestConnection} disabled={status === "testing"}>
            {status === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default Settings;