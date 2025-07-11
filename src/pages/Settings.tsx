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
import { useChatwoot } from "@/contexts/ChatwootContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal } from "lucide-react";

const AiApiSettings = () => {
  const { apiUrl, setApiUrl, apiKey, setApiKey } = useApiSettings();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalApiUrl(apiUrl);
    setLocalApiKey(apiKey);
  }, [apiUrl, apiKey]);

  const handleSave = () => {
    setApiUrl(localApiUrl);
    setApiKey(localApiKey);
    showSuccess("Cấu hình AI API đã được cập nhật!");
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
            apiUrl: localApiUrl,
            apiKey: localApiKey,
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
        showSuccess("Kết nối AI API thành công!");
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
    <Card>
      <CardHeader>
        <CardTitle>Kết nối AI API</CardTitle>
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
        </div>
         <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
          />
        </div>
        <Button onClick={handleSave}>Lưu thay đổi</Button>
        
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
  );
};

const ChatbotSettings = () => {
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

  return (
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
  );
};

const Settings = () => {
  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt</h2>
      <Tabs defaultValue="api" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api">Kết nối AI</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
        </TabsList>
        <TabsContent value="api">
          <AiApiSettings />
        </TabsContent>
        <TabsContent value="chatbot">
          <ChatbotSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Settings;