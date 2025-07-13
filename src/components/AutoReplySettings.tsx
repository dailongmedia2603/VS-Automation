import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';

export const AutoReplySettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('auto_reply_settings')
          .select('config')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') {
          showError("Không thể tải cài đặt trả lời tự động.");
        } else if (data) {
          setIsEnabled(data.config?.enabled || false);
        }
      } catch (e) {
        // Bỏ qua lỗi nếu không tìm thấy bảng hoặc dòng
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setIsEnabled(checked);
    try {
      const { data, error } = await supabase
        .from('auto_reply_settings')
        .select('config')
        .eq('id', 1)
        .single();

      const currentConfig = data?.config || {};
      const newConfig = { ...currentConfig, enabled: checked };

      const { error: updateError } = await supabase
        .from('auto_reply_settings')
        .upsert({ id: 1, config: newConfig });

      if (updateError) {
        throw updateError;
      }
      showSuccess(`AI trả lời tự động đã được ${checked ? 'bật' : 'tắt'}.`);
    } catch (error: any) {
      showError("Lưu cài đặt thất bại: " + error.message);
      setIsEnabled(!checked); // Revert on error
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 rounded-lg border p-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI trả lời tự động</CardTitle>
        <CardDescription>
          Kích hoạt tính năng này để AI tự động trả lời các tin nhắn mới từ khách hàng trong các cuộc hội thoại được gắn nhãn "AI Star".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 rounded-lg border p-4">
          <Bot className="h-6 w-6" />
          <div className="flex-1 space-y-1">
            <Label htmlFor="auto-reply-switch" className="text-base font-medium cursor-pointer">
              Kích hoạt trả lời tự động
            </Label>
            <p className="text-sm text-muted-foreground">
              AI sẽ chỉ trả lời khi tính năng này được bật.
            </p>
          </div>
          <Switch
            id="auto-reply-switch"
            checked={isEnabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};