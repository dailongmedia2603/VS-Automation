import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ChatwootLabel {
  id: number;
  name: string;
  color: string;
}

export const ChatwootLabelManager = () => {
  const [labels, setLabels] = useState<ChatwootLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<Partial<ChatwootLabel> | null>(null);
  const [labelToDelete, setLabelToDelete] = useState<ChatwootLabel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLabels = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('chatwoot_labels').select('*').order('name', { ascending: true });
    if (error) {
      showError("Không thể tải danh sách nhãn: " + error.message);
    } else {
      setLabels(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleAddNew = () => {
    setCurrentLabel({ name: '', color: '#6B7280' });
    setIsDialogOpen(true);
  };

  const handleEdit = (label: ChatwootLabel) => {
    setCurrentLabel(label);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (!labelToDelete) return;
    setIsSaving(true);
    supabase.from('chatwoot_labels').delete().eq('id', labelToDelete.id).then(({ error }) => {
      if (error) {
        showError("Xóa nhãn thất bại: " + error.message);
      } else {
        showSuccess("Đã xóa nhãn thành công!");
        setLabels(labels.filter(l => l.id !== labelToDelete.id));
        setLabelToDelete(null);
      }
      setIsSaving(false);
    });
  };

  const handleSave = async () => {
    if (!currentLabel || !currentLabel.name) {
      showError("Tên nhãn không được để trống.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from('chatwoot_labels').upsert({
      id: currentLabel.id,
      name: currentLabel.name,
      color: currentLabel.color,
    });

    if (error) {
      showError("Lưu nhãn thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu nhãn thành công!");
      setIsDialogOpen(false);
      fetchLabels(); // Refresh the list
    }
    setIsSaving(false);
  };

  const filteredLabels = useMemo(() => {
    return labels.filter(label => label.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [labels, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thẻ hội thoại</CardTitle>
        <CardDescription>Sử dụng thẻ hội thoại giúp phân biệt các hội thoại hoặc khách hàng</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm thẻ..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNew}>Thêm thẻ</Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">STT</TableHead>
                <TableHead>Tên thẻ</TableHead>
                <TableHead>Màu sắc</TableHead>
                <TableHead className="text-right w-[120px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLabels.length > 0 ? (
                filteredLabels.map((label, index) => (
                  <TableRow key={label.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium flex items-center">
                      <Tag className="h-4 w-4 mr-2" style={{ color: label.color }} />
                      {label.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-5 h-5 rounded-full mr-2" style={{ backgroundColor: label.color }}></div>
                        {label.color}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(label)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setLabelToDelete(label)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">Không tìm thấy thẻ nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentLabel?.id ? 'Sửa thẻ' : 'Thêm thẻ mới'}</DialogTitle>
            <DialogDescription>
              Tùy chỉnh tên và màu sắc cho thẻ của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Tên thẻ</Label>
              <Input
                id="label-name"
                value={currentLabel?.name || ''}
                onChange={(e) => setCurrentLabel({ ...currentLabel, name: e.target.value })}
                className="bg-slate-100 border-none rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-color">Màu sắc</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="label-color-picker"
                  type="color"
                  className="w-12 h-10 p-1 rounded-lg"
                  value={currentLabel?.color || '#6B7280'}
                  onChange={(e) => setCurrentLabel({ ...currentLabel, color: e.target.value })}
                />
                <Input
                  id="label-color-text"
                  value={currentLabel?.color || ''}
                  onChange={(e) => setCurrentLabel({ ...currentLabel, color: e.target.value })}
                  placeholder="#6B7280"
                  className="bg-slate-100 border-none rounded-lg"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button>
            <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!labelToDelete} onOpenChange={() => setLabelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Nhãn "{labelToDelete?.name}" sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="rounded-lg bg-red-600 hover:bg-red-700">
              {isSaving ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};