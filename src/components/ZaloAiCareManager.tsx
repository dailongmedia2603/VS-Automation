import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Bot, Tag, Loader2 } from 'lucide-react';
import type { ZaloLabel } from '@/types/zalo';

export const ZaloAiCareManager = () => {
  const [labels, setLabels] = useState<ZaloLabel[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const [labelsRes, settingsRes] = await Promise.all([
          supabase.from('zalo_labels').select('*'),
          supabase.from('zalo_care_settings').select('config').eq('id', 1).single()
        ]);

        if (labelsRes.error) throw labelsRes.error;
        setLabels(labelsRes.data || []);

        if (settingsRes.data?.config && typeof settingsRes.data.config === 'object') {
          const config = settingsRes.data.config as { trigger_label_id?: number };
          if (config.trigger_label_id) {
            setSelectedLabelId(String(config.trigger_label_id));
          }
        }
      } catch (error: any) {
        if (error.code !== 'PGRST116') {
          showError("Không thể tải cài đặt: " + error.message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newConfig = { trigger_label_id: selectedLabelId ? parseInt(selectedLabelId, 10) : null };
      const { error } = await supabase
        .from('zalo_care_settings')
        .upsert({ id: 1, config: newConfig });

      if (error) throw error;
      showSuccess("Đã lưu cấu hình AI chăm sóc!");
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu hình AI chăm sóc</CardTitle>
        <CardDescription>
          Chọn một thẻ để tự động kích hoạt AI tạo kịch bản chăm sóc khi bạn gắn thẻ đó vào một cuộc trò chuyện.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trigger-label" className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-slate-600" />
            <span>Thẻ kích hoạt</span>
          </Label>
          <Select value={selectedLabelId} onValueChange={setSelectedLabelId}>
            <SelectTrigger id="trigger-label">
              <SelectValue placeholder="Chọn một thẻ..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">-- Tắt tính năng --</SelectItem>
              {labels.map(label => (
                <SelectItem key={label.id} value={String(label.id)}>{label.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </Button>
      </CardContent>
    </Card>
  );
};