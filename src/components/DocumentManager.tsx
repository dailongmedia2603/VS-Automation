import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { type User } from '@supabase/supabase-js';
import { type AiSettings } from '@/types/chatwoot';

type Document = {
  id: number;
  title: string | null;
  purpose: string | null;
  document_type: string | null;
  creator_name: string | null;
  created_at: string;
  content: string | null;
};

interface DocumentManagerProps {
  settings: AiSettings | null;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ settings }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<Partial<Document> | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) {
      showError("Không thể tải tài liệu: " + error.message);
    } else {
      setDocuments(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAddNew = () => {
    setCurrentDoc({ document_type: 'faq' });
    setIsDialogOpen(true);
  };

  const handleEdit = (doc: Document) => {
    setCurrentDoc(doc);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.from('documents').delete().eq('id', docToDelete.id);
    if (error) {
      showError("Xóa tài liệu thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa tài liệu thành công!");
      setDocuments(documents.filter(d => d.id !== docToDelete.id));
      setDocToDelete(null);
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!currentDoc || !currentDoc.title || !currentDoc.content) {
      showError("Vui lòng điền đầy đủ Tiêu đề và Nội dung.");
      return;
    }

    setIsSaving(true);
    const docData = {
      ...currentDoc,
      creator_name: currentDoc.creator_name || user?.email,
    };
    
    const { error } = await supabase.from('documents').upsert(docData);

    if (error) {
      showError("Lưu tài liệu thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu tài liệu thành công!");
      setIsDialogOpen(false);
      fetchDocuments();
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý Tài liệu Nội bộ</CardTitle>
          <CardDescription>Thêm, sửa, xóa các tài liệu để cung cấp kiến thức cho AI. AI sẽ sử dụng các tài liệu này để trả lời câu hỏi của khách hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm tài liệu
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : documents.length > 0 ? (
                  documents.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>{doc.document_type}</TableCell>
                      <TableCell>{doc.creator_name}</TableCell>
                      <TableCell>{format(new Date(doc.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(doc)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDocToDelete(doc)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">Chưa có tài liệu nào.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentDoc?.id ? 'Sửa tài liệu' : 'Thêm tài liệu mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={currentDoc?.title || ''} onChange={(e) => setCurrentDoc({ ...currentDoc, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Loại tài liệu</Label>
                    <Select value={currentDoc?.document_type || 'faq'} onValueChange={(value) => setCurrentDoc({ ...currentDoc, document_type: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="faq">FAQ</SelectItem>
                            <SelectItem value="product_info">Thông tin sản phẩm</SelectItem>
                            <SelectItem value="policy">Chính sách</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Mục đích</Label>
                    <Input value={currentDoc?.purpose || ''} onChange={(e) => setCurrentDoc({ ...currentDoc, purpose: e.target.value })} placeholder="VD: Trả lời câu hỏi về giá"/>
                </div>
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea value={currentDoc?.content || ''} onChange={(e) => setCurrentDoc({ ...currentDoc, content: e.target.value })} rows={10} placeholder="Nhập nội dung tài liệu ở đây..."/>
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

      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác. Tài liệu sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
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