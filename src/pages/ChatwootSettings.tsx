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
import { useChatwoot } from "@/contexts/ChatwootContext";
import { showSuccess } from "@/utils/toast";

const ChatwootSettings = () => {
  const { settings, setSettings } = useChatwoot();

  const handleSave = () => {
    // Trong một ứng dụng thực tế, bạn có thể muốn mã hóa token trước khi lưu
    showSuccess("Cấu hình Chatwoot đã được lưu!");
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
        </CardContent>
      </Card>
    </main>
  );
};

export default ChatwootSettings;