import { useState, useEffect } from "react";
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
import { useChatwoot } from "@/contexts/ChatwootContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Terminal, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ChatwootSettings = () => {
  const { settings, setSettings, isLoading: isLoadingContext } = useChatwoot();
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
      // SỬA LỖI: Ánh xạ từ camelCase (JS) sang snake_case (DB)
      const dataToSave = {
        id: 1, // Luôn cập nhật dòng có id = 1
        chatwoot_url: localSettings.chatwootUrl,
        account_id: localSettings.accountId,
        inbox_id: localSettings.inboxId,
        api_token: localSettings.apiToken,
      };

      const { error } = await supabase
        .from('chatwoot_settings')
        .upsert(dataToSave);

      if (error) throw error;

      setSettings(localSettings); // Cập nhật context sau khi lưu thành công
      showSuccess("Cấu hình Chatwoot đã được lưu!");
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
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'list_conversations',
          settings: localSettings, // Sử dụng cài đặt cục bộ để kiểm tra
        },
      });

      if (functionError) {
        const errorData = await functionError.context.json();
        throw new Error(errorData.error || functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }
      
      setStatus("success");
      showSuccess("Kết nối Chatwoot thành công!");

    } catch (err: any) {
      setStatus("error");
      const errorMessage = err.message || 'Đã xảy ra lỗi không xác định.';
      setError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  if (isLoadingContext) {
    return (
      <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt Chatbot</h2>
      <Card>
        <CardHeader>
          <CardTitle>Kết nối Chatwoot</CardTitle>
          <CardDescription>
            Nhập thông tin để kết nối với tài khoản Chatwoot Cloud của bạn. Dữ liệu sẽ được lưu trữ an toàn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatwoot-url">Chatwoot URL</Label>
            <Input
              id="chatwoot-url"
              value={localSettings.chatwootUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, chatwootUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-id">Account ID</Label>
            <Input
              id="account-id"
              value={localSettings.accountId}
              onChange={(e) => setLocalSettings({ ...localSettings, accountId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inbox-id">Inbox ID</Label>
            <Input
              id="inbox-id"
              value={localSettings.inboxId}
              onChange={(e) => setLocalSettings({ ...localSettings, inboxId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-token">API Access Token</Label>
            <Input
              id="api-token"
              type="password"
              value={localSettings.apiToken}
              onChange={(e) => setLocalSettings({ ...localSettings, apiToken: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Kiểm tra kết nối</p>
              {status === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
              {status === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
              {status === "success" && <Badge variant="default">Thành công</Badge>}
              {status === "error" && <Badge variant="destructive">Thất bại</Badge>}
            </div>
            <Button onClick={handleTestConnection} disabled={status === "testing"}>
              {status === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
            </Button>
            {error && (
              <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <Terminal className="h-4 w-4 inline-block mr-2" />
                <p className="font-bold inline">Chi tiết lỗi:</p>
                <p className="font-mono break-all mt-2">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default ChatwootSettings;