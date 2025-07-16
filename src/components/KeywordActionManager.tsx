import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { type User } from '@supabase/supabase-js';
import { type KeywordAction } from '@/types/chatwoot';

export const KeywordActionManager = () => {
  const [rules, setRules] = useState<KeywordAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<KeywordAction> | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<KeywordAction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('keyword_actions').select('*').order('created_at', { ascending: false });
    if (error) {
      showError("Không thể tải danh sách quy tắc: " + error.message);
    } else {
      setRules(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleActive = async (rule: KeywordAction, checked: boolean) => {
    setRules(prevRules =>
      prevRules.map(r => (r.id === rule.id ? { ...r, is_active: checked } : r))
    );
    const { error } = await supabase
      .from('keyword_actions')
      .update({ is_active: checked })
      .eq('id', rule.id);
    if (error) {
      showError(`Cập nhật trạng thái thất bại: ${error.message}`);
      fetchRules();
    }
  };

  const handleAddNew = () => {
    setCurrentRule({ type: 'keyword', action_type: 'reply_with_content', is_active: true });
    setIsDialogOpen(true);
  };

  const handleEdit = (rule: KeywordAction) => {
    setCurrentRule(rule);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.from('keyword_actions').delete().eq('id', ruleToDelete.id);
    if (error) {
      showError("Xóa quy tắc thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa quy tắc thành công!");
      setRules(rules.filter(r => r.id !== ruleToDelete.id));
      setRuleToDelete(null);
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!currentRule || !currentRule.type || !currentRule.action_type) {
      showError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (currentRule.type === 'keyword' && !currentRule.keyword) {
      showError("Từ khoá không được để trống.");
      return;
    }
    if (currentRule.action_type === 'reply_with_content' && !currentRule.reply_content) {
      showError("Nội dung trả lời không được để trống.");
      return;
    }

    setIsSaving(true);
    const ruleData = {
      ...currentRule,
      creator_email: currentRule.creator_email || user?.email,
      keyword: currentRule.type === 'phone_number' ? null : currentRule.keyword,
      reply_content: currentRule.action_type === 'stop_auto_reply' ? null : currentRule.reply_content,
    };

    const { error } = await supabase.from('keyword_actions').upsert(ruleData);

    if (error) {
      showError("Lưu quy tắc thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu quy tắc thành công!");
      setIsDialogOpen(false);
      fetchRules();
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý Hành động theo Từ khoá</CardTitle>
          <CardDescription>Tạo quy tắc để tự động hóa các hành động dựa trên nội dung tin nhắn của khách hàng. Các quy tắc này sẽ được ưu tiên thực hiện trước khi AI trả lời.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm quy tắc
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Từ khoá</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Nội dung trả lời</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Kích hoạt</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : rules.length > 0 ? (
                  rules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.type === 'keyword' ? 'Từ khoá' : 'Số điện thoại'}</TableCell>
                      <TableCell className="font-mono">{rule.keyword || '---'}</TableCell>
                      <TableCell>{rule.action_type === 'stop_auto_reply' ? 'Dừng trả lời tự động' : 'Trả lời theo nội dung'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{rule.reply_content || '---'}</TableCell>
                      <TableCell>{format(new Date(rule.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{rule.creator_email || 'N/A'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => handleToggleActive(rule, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setRuleToDelete(rule)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">Chưa có quy tắc nào.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentRule?.id ? 'Sửa quy tắc' : 'Thêm quy tắc mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại</Label>
                <Select value={currentRule?.type} onValueChange={(value) => setCurrentRule({ ...currentRule, type: value as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Từ khoá</SelectItem>
                    <SelectItem value="phone_number">Số điện thoại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loại hành động</Label>
                <Select value={currentRule?.action_type} onValueChange={(value) => setCurrentRule({ ...currentRule, action_type: value as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reply_with_content">Nội dung trả lời</SelectItem>
                    <SelectItem value="stop_auto_reply">Dừng trả lời tự động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Từ khoá</Label>
              <Input
                value={currentRule?.keyword || ''}
                onChange={(e) => setCurrentRule({ ...currentRule, keyword: e.target.value })}
                disabled={currentRule?.type === 'phone_number'}
                placeholder={currentRule?.type === 'phone_number' ? 'Không áp dụng' : 'Nhập từ khoá, ví dụ: "báo giá"'}
              />
            </div>
            <div className="space-y-2">
              <Label>Nội dung trả lời</Label>
              <Textarea
                value={currentRule?.reply_content || ''}
                onChange={(e) => setCurrentRule({ ...currentRule, reply_content: e.target.value })}
                disabled={currentRule?.action_type === 'stop_auto_reply'}
                placeholder={currentRule?.action_type === 'stop_auto_reply' ? 'Không áp dụng' : 'Nhập nội dung tin nhắn trả lời...'}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="font-medium">Kích hoạt quy tắc</Label>
                <p className="text-xs text-muted-foreground">Nếu tắt, quy tắc này sẽ không được áp dụng.</p>
              </div>
              <Switch
                id="is_active"
                checked={currentRule?.is_active ?? true}
                onCheckedChange={(checked) => setCurrentRule({ ...currentRule, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!ruleToDelete} onOpenChange={() => setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-red-600 hover:bg-red-700">
              {isSaving ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};