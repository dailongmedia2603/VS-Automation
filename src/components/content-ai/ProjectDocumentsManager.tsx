import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Trash2, Loader2, Edit, FileText, User, Lightbulb, MoreHorizontal } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { type User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

  useEffect(() => {
    if (document) {
      setCurrentDoc(document);
    } else {
      setCurrentDoc({});
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

  const [isSaving, setIsSaving] = useState(false);

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

const DocumentViewDialog = ({ document, isOpen, onOpenChange }: { document: Document | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document.title}</DialogTitle>
          <DialogDescription>{document.purpose || 'Không có mô tả mục đích.'}</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content || ''}</ReactMarkdown>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DocumentCard = ({ document, onSelect, isSelected, onEdit, onDelete, onView }: { document: Document, onSelect: (id: number, checked: boolean) => void, isSelected: boolean, onEdit: () => void, onDelete: () => void, onView: () => void }) => {
  return (
    <Card className="group flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl bg-white">
      <CardHeader className="flex-row items-start justify-between pb-2 p-4">
        <div className="flex items-center gap-3">
          <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(document.id, !!checked)} />
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow cursor-pointer" onClick={onView}>
        <CardTitle className="text-base font-bold text-slate-800">{document.title}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{document.content}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{document.creator_name || 'Không rõ'}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export const ProjectDocumentsManager = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Partial<Document> | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) {
      showError("Không thể tải tài liệu: " + error.message);
    } else {
      setDocuments(data as Document[]);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const query = searchQuery.toLowerCase();
      return (doc.title?.toLowerCase().includes(query) || doc.content?.toLowerCase().includes(query));
    });
  }, [documents, searchQuery]);

  const handleSave = async (doc: Partial<Document>) => {
    const toastId = showLoading("Đang xử lý và nhúng dữ liệu...");
    try {
      const textToEmbed = `Tiêu đề: ${doc.title || ''}\nMục đích: ${doc.purpose || ''}\nNội dung: ${doc.content || ''}`.trim();
      const { data: embeddingData, error: functionError } = await supabase.functions.invoke('embed-document', { body: { textToEmbed } });

      if (functionError || embeddingData.error) throw new Error(functionError?.message || embeddingData.error);
      if (!embeddingData.embedding) throw new Error("Không nhận được vector embedding.");

      const documentToSave = { ...doc, embedding: embeddingData.embedding, project_id: projectId };
      
      if (documentToSave.id) {
        const { error } = await supabase.from('documents').update(documentToSave).eq('id', documentToSave.id);
        if (error) throw error;
      } else {
        const { id, ...docWithoutId } = documentToSave;
        const { error } = await supabase.from('documents').insert(docWithoutId);
        if (error) throw error;
      }

      dismissToast(toastId);
      showSuccess("Đã lưu tài liệu thành công!");
      setIsAddEditDialogOpen(false);
      setEditingDocument(null);
      fetchDocuments();

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
    <div className="space-y-6 h-full flex flex-col">
      <Card className="flex-shrink-0 shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm tài liệu..." className="pl-9 rounded-lg bg-slate-100 border-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button onClick={() => { setEditingDocument(null); setIsAddEditDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm tài liệu
            </Button>
          </div>
        </CardHeader>
        {selectedIds.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
              <span className="text-sm font-medium">{selectedIds.length} đã chọn</span>
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)} className="rounded-lg">
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa hàng loạt
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
        <Lightbulb className="h-4 w-4 !text-yellow-600" />
        <AlertTitle className="font-semibold !text-yellow-900">Gợi ý</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Để AI thông tin và viết đúng hơn, nên bổ sung đầy đủ các tài liệu bao gồm:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Danh sách xưng hô (để AI chủ động xưng hô đúng theo mong muốn)</li>
            <li>Thông tin sản phẩm</li>
            <li>Khách hàng mục tiêu</li>
            <li>Lợi ích sản phẩm (sản phẩm giúp được gì cho khách hàng)</li>
            <li>Vấn đề & nhu cầu của khách hàng</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isSelected={selectedIds.includes(doc.id)}
                onSelect={handleSelect}
                onView={() => setViewingDocument(doc)}
                onEdit={() => { setEditingDocument(doc); setIsAddEditDialogOpen(true); }}
                onDelete={() => setDocToDelete(doc)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">Chưa có tài liệu nào</h3>
            <p className="mt-1 text-sm">Hãy bắt đầu bằng cách thêm tài liệu cho dự án này.</p>
          </div>
        )}
      </div>
      <DocumentDialog isOpen={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen} onSave={handleSave} document={editingDocument} user={user} />
      <DocumentViewDialog isOpen={!!viewingDocument} onOpenChange={() => setViewingDocument(null)} document={viewingDocument} />
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
    </div>
  );
};