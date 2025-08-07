import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Loader2, Bot } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TelegramConfig = {
  id: number;
  name: string;
  bot_token: string;
  chat_id: string;
  creator_id: string;
};

const TelegramSettings = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<TelegramConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<TelegramConfig> | null>(null);
  const [configToDelete, setConfigToDelete] = useState<TelegramConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notificationConfigId, setNotificationConfigId] = useState<string | undefined>(undefined);
  const [isLoadingNotificationConfig, setIsLoadingNotificationConfig] = useState(true);
  const [isSavingNotificationConfig, setIsSavingNotificationConfig] = useState(false);

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('telegram_configs').select('*').order('created_at');
    if (error) {
      showError("Không thể tải cấu hình Telegram: " + error.message);
    } else {
      setConfigs(data || []);
    }
    setIsLoading(false);
  };

  const fetchNotificationConfig = async () => {
    setIsLoadingNotificationConfig(true);
    const { data, error } = await supabase
      .from('n8n_settings')
      .select('telegram_config_id_for_seeding')
      .eq('id', 1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      showError("Không thể tải cài đặt thông báo: " + error.message);
    } else if (data) {
      setNotificationConfigId(data.telegram_config_id_for_seeding?.toString());
    }
    setIsLoadingNotificationConfig(false);
  };

  useEffect(() => {
    fetchConfigs();
    fetchNotificationConfig();
  }, []);

  const handleOpenDialog = (config: TelegramConfig | null = null) => {
    setEditingConfig(config ? { ...config } : { name: '', bot_token: '', chat_id: '' });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingConfig || !editingConfig.name || !editingConfig.bot_token || !editingConfig.chat_id) {
      showError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingConfig.id) {
        const { error } = await supabase
          .from('telegram_configs')
          .update({ name: editingConfig.name, bot_token: editingConfig.bot_token, chat_id: editingConfig.chat_id })
          .eq('id', editingConfig.id);
        if (error) throw error;
        showSuccess("Đã cập nhật cấu hình!");
      } else {
        const { error } = await supabase
          .from('telegram_configs')
          .insert({ name: editingConfig.name, bot_token: editingConfig.bot_token, chat_id: editingConfig.chat_id, creator_id: user?.id });
        if (error) throw error;
        showSuccess("Đã thêm cấu hình mới!");
      }
      setIsDialogOpen(false);
      fetchConfigs();
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    const { error } = await supabase.from('telegram_configs').delete().eq('id', configToDelete.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa cấu hình!");
      fetchConfigs();
    }
    setConfigToDelete(null);
  };

  const handleTestConnection = async () => {
    if (!editingConfig?.bot_token) {
      showError("Vui lòng nhập Bot Token.");
      return;
    }
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-telegram-api', {
        body: { bot_token: editingConfig.bot_token }
      });
      if (error) {
        const errorBody = await error.context.json();
        throw new Error(errorBody.error || error.message);
      }
      if (data.error) throw new Error(data.error);
      showSuccess(data.message);
    } catch (err: any) {
      showError(`Kiểm tra thất bại: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveNotificationConfig = async () => {
    setIsSavingNotificationConfig(true);
    const { error } = await supabase
      .from('n8n_settings')
      .upsert({ id: 1, telegram_config_id_for_seeding: notificationConfigId ? Number(notificationConfigId) : null });
    
    if (error) {
      showError("Lưu cài đặt thông báo thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu cài đặt thông báo!");
    }
    setIsSavingNotificationConfig(false);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Cấu hình Telegram</CardTitle>
              <CardDescription>Quản lý các bot Telegram để gửi thông báo.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm cấu hình
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : configs.length > 0 ? (
              configs.map(config => (
                <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Bot className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">{config.name}</p>
                      <p className="text-sm text-muted-foreground">Chat ID: {config.chat_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(config)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfigToDelete(config)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Chưa có cấu hình nào.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Thông báo Seeding Hoàn Thành</CardTitle>
          <CardDescription>Chọn bot Telegram để nhận thông báo khi một mục trong Check Seeding hoàn thành.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingNotificationConfig ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-2">
              <Label>Gửi thông báo qua bot</Label>
              <Select value={notificationConfigId || 'null'} onValueChange={(value) => setNotificationConfigId(value === 'null' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Không gửi thông báo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Không gửi thông báo</SelectItem>
                  {configs.map(config => (
                    <SelectItem key={config.id} value={String(config.id)}>{config.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleSaveNotificationConfig} disabled={isSavingNotificationConfig}>
            {isSavingNotificationConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu cài đặt thông báo
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig?.id ? 'Sửa cấu hình' : 'Thêm cấu hình mới'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên gợi nhớ</Label>
              <Input id="name" value={editingConfig?.name || ''} onChange={e => setEditingConfig(c => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bot_token">Bot Token</Label>
              <Input id="bot_token" type="password" value={editingConfig?.bot_token || ''} onChange={e => setEditingConfig(c => ({ ...c, bot_token: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat_id">Chat ID</Label>
              <Input id="chat_id" value={editingConfig?.chat_id || ''} onChange={e => setEditingConfig(c => ({ ...c, chat_id: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="justify-between">
            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kiểm tra
            </Button>
            <div>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="mr-2">Hủy</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!configToDelete} onOpenChange={() => setConfigToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này sẽ xóa cấu hình "{configToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TelegramSettings;