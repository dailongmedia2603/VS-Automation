import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlusCircle, Search, Trash2, Loader2, Edit, FileText, Info, ChevronsUpDown, User, Calendar } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { type User as SupabaseUser } from '@supabase/supabase-js';

type Document = {
  id: number;
  created_at: string;
  title: string;
  purpose: string | null;
  document_type: string | null;
  content: string | null;
  example_customer_message: string | null;
  example_agent_reply: string | null;
  creator_name: string | null;
};

const DocumentDialog = ({ isOpen, onOpenChange, onSave, document, user }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (doc: Partial<Document>) => void, document: Partial<Document> | null, user: SupabaseUser | null }) => {
  const [currentDoc, setCurrentDoc] = useState<Partial<Document>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setCurrentDoc(document);
    } else {
      setCurrentDoc({ document_type: 'Chung' });
    }
  }, [document]);

  const handleSave = async () => {
    if (!currentDoc.title || !currentDoc.content) {
      showError("Tiêu đề và Nội dung không được để trống.");
      return;
    }
    setIsSaving(true);
    await onSave({ ...currentDoc, creator_name: currentDoc.creator_name || user?.email || 'Không rõ' });
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document?.id ? 'Sửa tài liệu' : 'Thêm tài liệu mới'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Tiêu đề</Label>
            <Input id="title" value={currentDoc.title || ''} onChange={e => setCurrentDoc(d => ({ ...d, title: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right pt-2">
              <Label htmlFor="purpose">Mục đích</Label>
              <p className="text-xs text-muted-foreground">Để AI hiểu mục tiêu khi đọc nội dung này.</p>
            </div>
            <Textarea id="purpose" value={currentDoc.purpose || ''} onChange={e => setCurrentDoc(d => ({ ...d, purpose: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="document_type" className="text-right">Loại tài liệu</Label>
            <Input id="document_type" value={currentDoc.document_type || ''} onChange={e => setCurrentDoc(d => ({ ...d, document_type: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="content" className="text-right pt-2">Nội dung</Label>
            <Textarea id="content" value={currentDoc.content || ''} onChange={e => setCurrentDoc(d => ({ ...d, content: e.target.value }))} className="col-span-3 min-h-[120px]" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="example_customer_message" className="text-right pt-2">Ví dụ tin nhắn KH</Label>
            <Textarea id="example_customer_message" value={currentDoc.example_customer_message || ''} onChange={e => setCurrentDoc(d => ({ ...d, example_customer_message: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right pt-2">
              <Label htmlFor="example_agent_reply">Ví dụ tin nhắn trả lời</Label>
              <p className="text-xs text-muted-foreground">Dựa theo nội dung tài liệu để trả lời.</p>
            </div>
            <Textarea id="example_agent_reply" value={currentDoc.example_agent_reply || ''} onChange={e => setCurrentDoc(d => ({ ...d, example_agent_reply: e.target.value }))} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DocumentCard = ({ document, onSelect, isSelected, onEdit, onDelete }: { document: Document, onSelect: (id: number, checked: boolean) => void, isSelected: boolean, onEdit: () => void, onDelete: () => void }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
        <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(document.id, !!checked)} className="mt-1" />
        <div className="flex-1">
          <CardTitle className="text-base">{document.title}</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1.5"><User className="h-3 w-3" /><span>{document.creator_name || 'Không rõ'}</span></div>
            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /><span>{format(new Date(document.created_at), 'dd/MM/yyyy')}</span></div>
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        <Collapsible>
          <div className="text-sm text-muted-foreground space-y-1 max-h-24 overflow-hidden">
            <p>{document.content}</p>
          </div>
          <CollapsibleTrigger asChild>
            <button className="text-sm text-blue-600 font-medium mt-2 flex items-center">
              Xem thêm <ChevronsUpDown className="h-4 w-4 ml-1" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{document.content}</p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export const DocumentTrainer = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Partial<Document> | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) {
      showError("Không thể tải tài liệu: " + error.message);
    } else {
      setDocuments(data as Document[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || doc.content?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [documents, searchQuery]);

  const pageCount = useMemo(() => {
    return pagination.pageSize > 0 ? Math.ceil(filteredDocuments.length / pagination.pageSize) : 1;
  }, [filteredDocuments.length, pagination.pageSize]);

  const paginatedDocuments = useMemo(() => {
    if (pagination.pageSize === 0) return filteredDocuments;
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredDocuments.slice(start, end);
  }, [filteredDocuments, pagination]);

  const handleSave = async (doc: Partial<Document>) => {
    const toastId = showLoading("Đang xử lý và nhúng dữ liệu...");
    try {
      const { error } = await supabase.functions.invoke('embed-document', { body: { document: doc } });
      if (error) throw new Error(`Lỗi huấn luyện: ${error.message}`);
      dismissToast(toastId);
      showSuccess("Đã lưu tài liệu thành công!");
      setIsDialogOpen(false);
      setEditingDocument(null);
      fetchDocuments();
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message);
    }
  };

  const handleDelete = async (ids: number[]) => {
    const toastId = showLoading("Đang xóa...");
    const { error } = await supabase.from('documents').delete().in('id', ids);
    dismissToast(toastId);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa thành công!");
      fetchDocuments();
      setSelectedIds([]);
      setDocToDelete(null);
      setIsBulkDeleteAlertOpen(false);
    }
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? paginatedDocuments.map(d => d.id) : []);
  };

  return (
    <>
      <div className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm kiếm tài liệu..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingDocument(null); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm tài liệu
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedIds.length > 0 && (
              <div className="mb-4 flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                <span className="text-sm font-medium">{selectedIds.length} đã chọn</span>
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa hàng loạt
                </Button>
              </div>
            )}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : paginatedDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDocuments.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    isSelected={selectedIds.includes(doc.id)}
                    onSelect={handleSelect}
                    onEdit={() => { setEditingDocument(doc); setIsDialogOpen(true); }}
                    onDelete={() => setDocToDelete(doc)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Không có tài liệu nào</h3>
                <p className="mt-1 text-sm">Hãy bắt đầu bằng cách thêm tài liệu huấn luyện mới.</p>
              </div>
            )}
          </CardContent>
        </Card>
        {pageCount > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Đã chọn {selectedIds.length} trên {documents.length} tài liệu.
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Hiển thị</p>
                <Select value={String(pagination.pageSize)} onValueChange={value => setPagination(p => ({ ...p, pageSize: Number(value) }))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="0">Tất cả</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))} />
                  </PaginationItem>
                  <PaginationItem><PaginationLink>{pagination.pageIndex + 1}</PaginationLink></PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" onClick={() => setPagination(p => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }))} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
      <DocumentDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleSave} document={editingDocument} user={user} />
      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn tài liệu "{docToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete([docToDelete!.id])}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa hàng loạt?</AlertDialogTitle><AlertDialogDescription>Bạn có chắc chắn muốn xóa {selectedIds.length} tài liệu đã chọn không?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(selectedIds)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};