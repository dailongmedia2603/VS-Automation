import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, Trash2, Loader2, Edit, FileText, User, Calendar, MessageSquare, Bot, Cpu } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { format } from 'date-fns';
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
  embedding: number[] | string | null;
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
          <DialogDescription>Điền thông tin chi tiết cho tài liệu huấn luyện.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input id="title" value={currentDoc.title || ''} onChange={e => setCurrentDoc(d => ({ ...d, title: e.target.value }))} className="bg-slate-100 border-none rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Mục đích</Label>
            <Textarea id="purpose" value={currentDoc.purpose || ''} onChange={e => setCurrentDoc(d => ({ ...d, purpose: e.target.value }))} className="bg-slate-100 border-none rounded-lg" />
            <p className="text-xs text-muted-foreground">Để AI hiểu mục tiêu khi đọc nội dung này.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_type">Loại tài liệu</Label>
            <Input id="document_type" value={currentDoc.document_type || ''} onChange={e => setCurrentDoc(d => ({ ...d, document_type: e.target.value }))} className="bg-slate-100 border-none rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Nội dung</Label>
            <Textarea id="content" value={currentDoc.content || ''} onChange={e => setCurrentDoc(d => ({ ...d, content: e.target.value }))} className="bg-slate-100 border-none rounded-lg min-h-[120px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DocumentDetailDialog = ({ isOpen, onOpenChange, document }: { isOpen: boolean, onOpenChange: (open: boolean) => void, document: Document | null }) => {
  if (!document) return null;

  const DetailSection = ({ title, content, icon }: { title: string, content: string | null | undefined, icon?: React.ElementType }) => {
    const Icon = icon;
    return content ? (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </h4>
        <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-700 whitespace-pre-wrap break-all">{content}</div>
      </div>
    ) : null;
  };

  let embeddingArray: number[] | null = null;
  if (document.embedding) {
    if (typeof document.embedding === 'string') {
      try {
        embeddingArray = JSON.parse(document.embedding);
      } catch (e) {
        console.error("Failed to parse embedding string:", document.embedding);
      }
    } else if (Array.isArray(document.embedding)) {
      embeddingArray = document.embedding;
    }
  }

  const embeddingSnippet = embeddingArray
    ? `[${embeddingArray.slice(0, 4).join(', ')}, ..., ${embeddingArray.slice(-4).join(', ')}] (${embeddingArray.length} chiều)`
    : (document.embedding ? 'Dữ liệu embedding không hợp lệ' : 'Chưa có');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{document.title}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <div className="flex items-center gap-1.5"><User className="h-3 w-3" /><span>{document.creator_name || 'Không rõ'}</span></div>
              <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /><span>{format(new Date(document.created_at), 'dd/MM/yyyy')}</span></div>
              <div className="flex items-center gap-1.5"><FileText className="h-3 w-3" /><span>{document.document_type || 'Chung'}</span></div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <DetailSection title="Mục đích" content={document.purpose} />
          <DetailSection title="Nội dung chính" content={document.content} />
          <DetailSection title="Vector Embedding (xác nhận)" content={embeddingSnippet} icon={Cpu} />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="rounded-lg">Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DocumentCard = ({ document, onSelect, isSelected, onEdit, onDelete, onView }: { document: Document, onSelect: (id: number, checked: boolean) => void, isSelected: boolean, onEdit: () => void, onDelete: () => void, onView: () => void }) => {
  return (
    <Card className="flex flex-col transition-all hover:shadow-md hover:-translate-y-1">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
        <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(document.id, !!checked)} className="mt-1" />
        <div className="flex-1 cursor-pointer" onClick={onView}>
          <CardTitle className="text-base">{document.title}</CardTitle>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{document.content}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 mt-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><User className="h-3 w-3" /><span>{document.creator_name || 'Không rõ'}</span></div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const DocumentTrainer = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Partial<Document> | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('documents').select('*').is('project_id', null).order('created_at', { ascending: false });
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
    return documents.filter(doc => {
      const query = searchQuery.toLowerCase();
      const titleMatch = doc.title ? doc.title.toLowerCase().includes(query) : false;
      const contentMatch = doc.content ? doc.content.toLowerCase().includes(query) : false;
      return titleMatch || contentMatch;
    });
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
      const textToEmbed = `
        Tiêu đề: ${doc.title || ''}
        Mục đích: ${doc.purpose || ''}
        Nội dung: ${doc.content || ''}
      `.trim();
      const { data: embeddingData, error: functionError } = await supabase.functions.invoke('embed-document', { body: { textToEmbed } });

      if (functionError) {
        let errorMessage = functionError.message;
        if (functionError.context && typeof functionError.context.json === 'function') {
          try {
            const errorBody = await functionError.context.json();
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Bỏ qua lỗi phân tích JSON
          }
        }
        throw new Error(errorMessage);
      }
      if (embeddingData.error) throw new Error(embeddingData.error);
      if (!embeddingData.embedding) throw new Error("Không nhận được vector embedding từ server.");

      const documentToSave = { ...doc, embedding: embeddingData.embedding };
      
      let savedDocument;
      if (documentToSave.id) {
        const { data, error } = await supabase.from('documents').update(documentToSave).eq('id', documentToSave.id).select().single();
        if (error) throw error;
        savedDocument = data;
      } else {
        const { id, ...docWithoutId } = documentToSave;
        const { data, error } = await supabase.from('documents').insert(docWithoutId).select().single();
        if (error) throw error;
        savedDocument = data;
      }

      if (!savedDocument) throw new Error("Lưu tài liệu thất bại.");

      dismissToast(toastId);
      showSuccess("Đã lưu tài liệu thành công!");
      setIsAddEditDialogOpen(false);
      setEditingDocument(null);

      setDocuments(prevDocs => {
        const docIndex = prevDocs.findIndex(d => d.id === savedDocument.id);
        if (docIndex > -1) {
          const newDocs = [...prevDocs];
          newDocs[docIndex] = savedDocument;
          return newDocs;
        } else {
          return [savedDocument, ...prevDocs];
        }
      });

    } catch (err: any) {
      dismissToast(toastId);
      showError(`Lỗi huấn luyện: ${err.message}`);
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
      setDocuments(prev => prev.filter(d => !ids.includes(d.id)));
      setSelectedIds([]);
      setDocToDelete(null);
      setIsBulkDeleteAlertOpen(false);
    }
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
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
              <Button onClick={() => { setEditingDocument(null); setIsAddEditDialogOpen(true); }}>
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
                    onView={() => { setViewingDocument(doc); setIsDetailDialogOpen(true); }}
                    onEdit={() => { setEditingDocument(doc); setIsAddEditDialogOpen(true); }}
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
      <DocumentDialog isOpen={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen} onSave={handleSave} document={editingDocument} user={user} />
      <DocumentDetailDialog isOpen={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen} document={viewingDocument} />
      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn tài liệu "{docToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete([docToDelete!.id])} className="bg-red-600 hover:bg-red-700 rounded-lg">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa hàng loạt?</AlertDialogTitle><AlertDialogDescription>Bạn có chắc chắn muốn xóa {selectedIds.length} tài liệu đã chọn không?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(selectedIds)} className="bg-red-600 hover:bg-red-700 rounded-lg">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};