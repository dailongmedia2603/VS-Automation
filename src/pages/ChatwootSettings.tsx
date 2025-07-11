import { useState } from "react";
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
import { Terminal } from "lucide-react";

const ChatwootSettings = () => {
  const { settings, setSettings } = useChatwoot();
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    showSuccess("Cấu hình Chatwoot đã được lưu!");
  };

  const handleTestConnection = async () => {
    setStatus("testing");
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'list_conversations',
          settings: settings,
        },
      });

      if (functionError) {
        if (functionError.context && typeof functionError.context.json === 'function') {
            const errorData = await functionError.context.json();
            throw new Error(errorData.error || functionError.message);
        }
        throw functionError;
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

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt Chatbot</h2>
      <Card>
        <CardHeader>
          <CardTitle>Kết nối Chatwoot</CardTitle>
          <CardDescription>
            Nhập thông tin để kết nối với tài khoản Chatwoot Cloud của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatwoot-url">Chatwoot URL</Label>
            <Input
              id="chatwoot-url"
              value={settings.chatwootUrl}
              onChange={(e) => setSettings({ ...settings, chatwootUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-id">Account ID</Label>
            <Input
              id="account-id"
              value={settings.accountId}
              onChange={(e) => setSettings({ ...settings, accountId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inbox-id">Inbox ID</Label>
            <Input
              id="inbox-id"
              value={settings.inboxId}
              onChange={(e) => setSettings({ ...settings, inboxId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-token">API Access Token</Label>
            <Input
              id="api-token"
              type="password"
              value={settings.apiToken}
              onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
            />
          </div>
          <Button onClick={handleSave}>Lưu cấu hình</Button>

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