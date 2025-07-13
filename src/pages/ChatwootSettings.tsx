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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatwoot } from "@/contexts/ChatwootContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Terminal, Loader2, Link, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatwootLabelManager } from "@/components/ChatwootLabelManager";
import { AutoReplySettings } from "@/components/AutoReplySettings";

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
      const dataToSave = {
        id: 1,
        chatwoot_url: localSettings.chatwootUrl,
        account_id: localSettings.accountId,
        inbox_id: localSettings.inboxId,
        api_token: localSettings.apiToken,
      };
      const { error } = await supabase.from('chatwoot_settings').upsert(dataToSave);
      if (error) throw error;
      setSettings(localSettings);
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
        body: { action: 'list_conversations', settings: localSettings },
      });
      if (functionError) {
        const errorData = await functionError.context.json();
        throw new Error(errorData.error || functionError.message);
      }
      if (data.error) throw new Error(data.error);
      setStatus("success");
      showSuccess("Kết nối Chatwoot thành công!");
    } catch (err: any) {
      setStatus("error");
      const errorMessage = err.message || 'Đã xảy ra lỗi không xác định.';
      setError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  const handleConnectFanpage = () => {
    if (settings.chatwootUrl && settings.accountId) {
      const connectUrl = `${settings.chatwootUrl}/app/accounts/${settings.accountId}/inboxes/new?channel_type=facebook`;
      window.open(connectUrl, '_blank');
    } else {
      showError("Vui lòng điền Chatwoot URL và Account ID trong tab Kết nối trước.");
    }
  };

  if (isLoadingContext) {
    return (
      <main className="flex-1 space-y-6 p-6 sm:p-8">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Card className="shadow-sm rounded-2xl bg-white"><CardHeader><Skeleton className="h-6 w-1/4 rounded-md" /><Skeleton className="h-4 w-1/2 rounded-md" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-24 rounded-lg" /></CardContent></Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt Chatbot</h2>
      <Tabs defaultValue="connection">
        <TabsList className="flex justify-start items-center gap-1 p-0 bg-transparent">
          <TabsTrigger value="connection" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Kết nối</TabsTrigger>
          <TabsTrigger value="fanpage" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Fanpage</TabsTrigger>
          <TabsTrigger value="inbox-config" className="rounded-lg px-4 py-2 text-muted-foreground font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Cấu hình hộp thư</TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <Card className="mt-4 shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Kết nối Chatwoot</CardTitle>
              <CardDescription>Nhập thông tin để kết nối với tài khoản Chatwoot Cloud của bạn. Dữ liệu sẽ được lưu trữ an toàn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="chatwoot-url">Chatwoot URL</Label><Input id="chatwoot-url" value={localSettings.chatwootUrl} onChange={(e) => setLocalSettings({ ...localSettings, chatwootUrl: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
              <div className="space-y-2"><Label htmlFor="account-id">Account ID</Label><Input id="account-id" value={localSettings.accountId} onChange={(e) => setLocalSettings({ ...localSettings, accountId: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
              <div className="space-y-2"><Label htmlFor="inbox-id">Inbox ID</Label><Input id="inbox-id" value={localSettings.inboxId} onChange={(e) => setLocalSettings({ ...localSettings, inboxId: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
              <div className="space-y-2"><Label htmlFor="api-token">API Access Token</Label><Input id="api-token" type="password" value={localSettings.apiToken} onChange={(e) => setLocalSettings({ ...localSettings, apiToken: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSaving ? "Đang lưu..." : "Lưu cấu hình"}</Button>
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between"><p className="font-medium">Kiểm tra kết nối</p>{status === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}{status === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}{status === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}{status === "error" && <Badge variant="destructive">Thất bại</Badge>}</div>
                <Button onClick={handleTestConnection} disabled={status === "testing"} className="rounded-lg">{status === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</Button>
                {error && (<div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg"><Terminal className="h-4 w-4 inline-block mr-2" /><p className="font-bold inline">Chi tiết lỗi:</p><p className="font-mono break-all mt-2">{error}</p></div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="fanpage">
          <Card className="mt-4 shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Quản lý Fanpage</CardTitle>
              <CardDescription>Kết nối Fanpage mới hoặc đồng bộ hóa danh sách các inbox của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Thêm Fanpage mới</h3>
                <p className="text-sm text-muted-foreground mt-2">Nhấp vào nút bên dưới để mở trang kết nối của Chatwoot. Quá trình này an toàn và được thực hiện trực tiếp trên trang của Chatwoot.</p>
                <Button className="mt-4 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={handleConnectFanpage} disabled={!settings.chatwootUrl || !settings.accountId}>
                  <Link className="mr-2 h-4 w-4" />
                  Kết nối Fanpage mới trên Chatwoot
                </Button>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium">Đồng bộ hóa</h3>
                <p className="text-sm text-muted-foreground mt-2">Sau khi kết nối thành công trên trang Chatwoot, hãy quay lại đây và nhấn nút bên dưới để cập nhật danh sách các inbox trong ứng dụng.</p>
                <Button variant="outline" className="mt-4 rounded-lg" onClick={() => showSuccess("Đang đồng bộ hóa...")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Đồng bộ hóa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inbox-config" className="mt-4 space-y-6">
          <AutoReplySettings />
          <ChatwootLabelManager />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default ChatwootSettings;