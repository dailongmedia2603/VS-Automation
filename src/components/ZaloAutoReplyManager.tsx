import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Bot } from 'lucide-react';

export const ZaloAutoReplyManager = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('zalo_auto_reply_settings')
          .select('config')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data && data.config && typeof data.config === 'object') {
          setIsEnabled((data.config as { enabled?: boolean }).enabled || false);
        }
      } catch (error: any) {
        showError("Không thể tải cài đặt trả lời tự động Zalo: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setIsEnabled(checked);
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('zalo_auto_reply_settings')
        .select('config')
        .eq('id', 1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentConfig = (currentData?.config || {}) as object;
      const newConfig = { ...currentConfig, enabled: checked };

      const { error } = await supabase
        .from('zalo_auto_reply_settings')
        .upsert({ id: 1, config: newConfig });

      if (error) {
        throw error;
      }
      showSuccess(`AI trả lời tự động Zalo đã được ${checked ? 'kích hoạt' : 'tắt'}.`);
    } catch (error: any) {
      showError("Lưu cài đặt thất bại: " + error.message);
      setIsEnabled(!checked);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI trả lời tự động Zalo</CardTitle>
        <CardDescription>
          Kích hoạt để AI tự động trả lời các tin nhắn Zalo dựa trên dữ liệu đã được huấn luyện.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <Label htmlFor="zalo-auto-reply-switch" className="flex items-center gap-3 cursor-pointer">
            <Bot className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-800">Kích hoạt trả lời tự động</span>
          </Label>
          <Switch
            id="zalo-auto-reply-switch"
            checked={isEnabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};