import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MoreHorizontal, PlayCircle, CheckCircle2, XCircle, Loader2, Edit, Trash2, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Project = { id: number; name: string; };
type Post = { id: number; name: string; link: string | null; keywords: string | null; };
type Item = { id: number; content: string; status: 'found' | 'not_found'; found_keywords: string[] | null };
interface CheckResult { found: number; notFound: number; total: number; }

interface KeywordPostDetailProps {
  project: Project;
  post: Post;
  onCheckComplete: () => void;
}

const normalizeString = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.normalize('NFC').toLowerCase();
};

export const KeywordPostDetail = ({ project, post, onCheckComplete }: KeywordPostDetailProps) => {
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isKeywordListOpen, setIsKeywordListOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'not_found'>('all');

  const fetchItem = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('keyword_check_items').select('*').eq('post_id', post.id).maybeSingle();
    if (error) showError("Không thể tải nội dung post: " + error.message);
    else setItem(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchItem(); }, [post.id]);

  const handleRunCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);
    const toastId = showLoading("Đang quét nội dung...");
    try {
      const { data, error } = await supabase.functions.invoke('check-keywords-in-comments', { body: { postId: post.id } });
      if (error || data.error) throw new Error(error?.message || data?.error);
      setCheckResult(data);
      showSuccess(`Quét hoàn tất! Tìm thấy ${data.found}/${data.total} từ khóa.`);
      fetchItem();
      onCheckComplete();
    } catch (e: any) {
      showError(`Quét thất bại: ${e.message}`);
    } finally {
      dismissToast(toastId);
      setIsChecking(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editedContent.trim()) return;
    const { error } = await supabase.from('keyword_check_items').update({ content: editedContent.trim() }).eq('id', editingItem.id);
    if (error) showError("Cập nhật thất bại: " + error.message);
    else {
      showSuccess("Đã cập nhật nội dung post!");
      setEditingItem(null);
      fetchItem();
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('keyword_check_items').delete().eq('id', itemToDelete.id);
    if (error) showError("Xóa thất bại: " + error.message);
    else {
      showSuccess("Đã xóa nội dung post!");
      setItemToDelete(null);
      fetchItem();
    }
  };

  const keywordStats = useMemo(() => {
    if (!post.keywords) return [];
    const keywords = post.keywords.split('\n').map(k => k.trim()).filter(Boolean);
    
    return keywords.map(keyword => {
        const normalizedKeyword = normalizeString(keyword);
        const count = (item?.found_keywords && Array.isArray(item.found_keywords) && item.found_keywords.some(foundKw => normalizeString(foundKw) === normalizedKeyword)) ? 1 : 0;
        return { keyword, count };
    });
  }, [post.keywords, item]);

  const filteredItem = useMemo(() => {
    if (!item) return null;
    if (statusFilter !== 'all' && item.status !== statusFilter) return null;
    if (searchTerm && !item.content.toLowerCase().includes(searchTerm.toLowerCase())) return null;
    return item;
  }, [item, searchTerm, statusFilter]);

  return (
    <>
      <Card className="w-full h-full shadow-none border-none flex flex-col">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-800">{post.name}</h2>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Card className="mb-4 bg-slate-50 border-slate-200"><CardContent className="p-4"><div className="flex items-center justify-between">
            <div><h3 className="font-semibold text-slate-800">Kiểm tra từ khóa</h3><p className="text-sm text-slate-500">Quét nội dung post và cập nhật trạng thái các từ khóa trong danh sách.</p></div>
            <div className="flex items-center gap-4">
              {checkResult && <div className="flex items-center gap-4 text-sm"><div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /><div><p className="font-bold">{checkResult.found}</p><p className="text-xs">Tìm thấy</p></div></div><div className="flex items-center gap-2 text-amber-600"><XCircle className="h-5 w-5" /><div><p className="font-bold">{checkResult.notFound}</p><p className="text-xs">Chưa thấy</p></div></div></div>}
              <Button onClick={handleRunCheck} disabled={isChecking} className="bg-blue-600 hover:bg-blue-700 rounded-lg">{isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}{isChecking ? 'Đang chạy...' : 'Chạy Check'}</Button>
            </div>
          </div></CardContent></Card>
          
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm trong nội dung..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="found">Tìm thấy</SelectItem>
                  <SelectItem value="not_found">Chưa tìm thấy</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setIsKeywordListOpen(true)}><List className="mr-2 h-4 w-4" />List từ khoá</Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto flex-1"><Table><TableHeader><TableRow><TableHead>Nội dung Post</TableHead><TableHead>Kết quả</TableHead><TableHead>Từ khoá tìm thấy</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (<TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : 
              filteredItem ? (<TableRow key={filteredItem.id}>
                <TableCell className="max-w-md break-words whitespace-pre-wrap">{filteredItem.content}</TableCell>
                <TableCell><Badge className={cn(filteredItem.status === 'found' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>{filteredItem.status === 'found' ? 'Tìm thấy' : 'Chưa tìm thấy'}</Badge></TableCell>
                <TableCell>{filteredItem.found_keywords?.join(', ')}</TableCell>
                <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { setEditingItem(filteredItem); setEditedContent(filteredItem.content); }}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem><DropdownMenuItem onClick={() => setItemToDelete(filteredItem)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>) : 
              (<TableRow><TableCell colSpan={4} className="text-center h-24">{item ? 'Không có kết quả phù hợp với bộ lọc.' : 'Không có nội dung nào.'}</TableCell></TableRow>)}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}><DialogContent><DialogHeader><DialogTitle>Sửa nội dung Post</DialogTitle></DialogHeader><div className="py-4"><Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="min-h-[200px]" /></div><DialogFooter><Button variant="outline" onClick={() => setEditingItem(null)}>Hủy</Button><Button onClick={handleUpdateItem}>Lưu</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Nội dung post sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem} className="bg-red-600">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isKeywordListOpen} onOpenChange={setIsKeywordListOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Danh sách từ khóa cho "{post.name}"</DialogTitle>
            <DialogDescription>
              Thống kê số lượng bình luận chứa từng từ khóa.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Từ khóa</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywordStats.length > 0 ? (
                    keywordStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{stat.keyword}</TableCell>
                        <TableCell className="text-right font-bold">{stat.count}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        Chưa có từ khóa nào được thêm.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsKeywordListOpen(false)} className="bg-blue-600 hover:bg-blue-700">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};