import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MoreHorizontal, MessageCircle, PlayCircle, CheckCircle2, XCircle, Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';

type Project = { id: number; name: string; };
type Post = { id: number; name: string; link: string | null; };
type Item = { id: number; content: string; status: 'found' | 'not_found'; };
interface CheckResult { found: number; notFound: number; total: number; }

interface KeywordCommentDetailProps {
  project: Project;
  post: Post;
  onCheckComplete: () => void;
}

export const KeywordCommentDetail = ({ project, post, onCheckComplete }: KeywordCommentDetailProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'not_found'>('all');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemsText, setNewItemsText] = useState('');
  const [isSavingItems, setIsSavingItems] = useState(false);

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('keyword_check_items').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    if (error) showError("Không thể tải danh sách từ khóa: " + error.message);
    else setItems(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchItems(); }, [post.id]);

  const handleRunCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);
    const toastId = showLoading("Đang quét nội dung...");
    try {
      const { data, error } = await supabase.functions.invoke('check-keywords-in-comments', { body: { postId: post.id } });
      if (error || data.error) throw new Error(error?.message || data?.error);
      setCheckResult(data);
      showSuccess(`Quét hoàn tất! Tìm thấy ${data.found}/${data.total} từ khóa.`);
      fetchItems();
      onCheckComplete();
    } catch (e: any) {
      showError(`Quét thất bại: ${e.message}`);
    } finally {
      dismissToast(toastId);
      setIsChecking(false);
    }
  };

  const handleSaveNewItems = async () => {
    const itemsToInsert = newItemsText.split('\n').map(line => line.trim()).filter(line => line).map(content => ({ post_id: post.id, content }));
    if (itemsToInsert.length === 0) return showError("Vui lòng nhập ít nhất một từ khóa.");
    setIsSavingItems(true);
    const { error } = await supabase.from('keyword_check_items').insert(itemsToInsert);
    if (error) showError("Thêm từ khóa thất bại: " + error.message);
    else {
      showSuccess(`Đã thêm thành công ${itemsToInsert.length} từ khóa!`);
      setIsAddItemDialogOpen(false);
      setNewItemsText('');
      fetchItems();
    }
    setIsSavingItems(false);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editedContent.trim()) return;
    const { error } = await supabase.from('keyword_check_items').update({ content: editedContent.trim() }).eq('id', editingItem.id);
    if (error) showError("Cập nhật thất bại: " + error.message);
    else {
      showSuccess("Đã cập nhật từ khóa!");
      setEditingItem(null);
      fetchItems();
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('keyword_check_items').delete().eq('id', itemToDelete.id);
    if (error) showError("Xóa thất bại: " + error.message);
    else {
      showSuccess("Đã xóa từ khóa!");
      setItemToDelete(null);
      fetchItems();
    }
  };

  const filteredItems = useMemo(() => items.filter(item => 
    (statusFilter === 'all' || item.status === statusFilter) &&
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  ), [items, searchTerm, statusFilter]);

  return (
    <>
      <Card className="w-full h-full shadow-none border-none flex flex-col">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-800">{post.name}</h2>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Card className="mb-4 bg-slate-50 border-slate-200"><CardContent className="p-4"><div className="flex items-center justify-between">
            <div><h3 className="font-semibold text-slate-800">Kiểm tra từ khóa</h3><p className="text-sm text-slate-500">Quét nội dung và cập nhật trạng thái các từ khóa trong danh sách.</p></div>
            <div className="flex items-center gap-4">
              {checkResult && <div className="flex items-center gap-4 text-sm"><div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /><div><p className="font-bold">{checkResult.found}</p><p className="text-xs">Tìm thấy</p></div></div><div className="flex items-center gap-2 text-amber-600"><XCircle className="h-5 w-5" /><div><p className="font-bold">{checkResult.notFound}</p><p className="text-xs">Chưa thấy</p></div></div></div>}
              <Button onClick={handleRunCheck} disabled={isChecking} className="bg-blue-600 hover:bg-blue-700 rounded-lg">{isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}{isChecking ? 'Đang chạy...' : 'Chạy Check'}</Button>
            </div>
          </div></CardContent></Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" /><Input placeholder="Tìm kiếm từ khóa..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="found">Tìm thấy</SelectItem><SelectItem value="not_found">Chưa tìm thấy</SelectItem></SelectContent></Select>
              <Button onClick={() => setIsAddItemDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Thêm từ khóa</Button>
            </div>
          </div>
          <div className="border rounded-lg overflow-auto flex-1"><Table><TableHeader><TableRow><TableHead>STT</TableHead><TableHead>Từ khóa</TableHead><TableHead>Kết quả</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? ([...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)) : 
              filteredItems.length > 0 ? (filteredItems.map((item, index) => <TableRow key={item.id}>
                <TableCell>{index + 1}</TableCell><TableCell>{item.content}</TableCell>
                <TableCell><Badge className={cn(item.status === 'found' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>{item.status === 'found' ? 'Tìm thấy' : 'Chưa tìm thấy'}</Badge></TableCell>
                <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { setEditingItem(item); setEditedContent(item.content); }}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem><DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>)) : 
              (<TableRow><TableCell colSpan={4} className="text-center h-24">Không có từ khóa nào.</TableCell></TableRow>)}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}><DialogContent><DialogHeader><DialogTitle>Thêm từ khóa</DialogTitle><DialogDescription>Nhập danh sách từ khóa, mỗi từ khóa trên một dòng.</DialogDescription></DialogHeader><div className="py-4"><Textarea value={newItemsText} onChange={(e) => setNewItemsText(e.target.value)} className="min-h-[150px]" /></div><DialogFooter><Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Hủy</Button><Button onClick={handleSaveNewItems} disabled={isSavingItems}>{isSavingItems && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}><DialogContent><DialogHeader><DialogTitle>Sửa từ khóa</DialogTitle></DialogHeader><div className="py-4"><Input value={editedContent} onChange={(e) => setEditedContent(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingItem(null)}>Hủy</Button><Button onClick={handleUpdateItem}>Lưu</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Từ khóa "{itemToDelete?.content}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem} className="bg-red-600">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};