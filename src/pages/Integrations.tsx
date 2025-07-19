import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const Integrations = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('n8n_settings')
          .select('zalo_webhook_url')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setWebhookUrl(data.zalo_webhook_url || '');
        }
      } catch (error: any) {
        showError("Không thể tải cài đặt n8n: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('n8n_settings')
        .upsert({ id: 1, zalo_webhook_url: webhookUrl });

      if (error) throw error;
      showSuccess("Đã lưu URL webhook thành công!");
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
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
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Tích hợp</h2>
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Tích hợp n8n</CardTitle>
          <CardDescription>
            Cấu hình webhook để gửi dữ liệu từ ứng dụng đến n8n khi có sự kiện xảy ra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Zalo Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="Dán URL webhook từ n8n vào đây"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-slate-100 border-none rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Sự kiện gửi tin nhắn Zalo sẽ được gửi đến URL này.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default Integrations;