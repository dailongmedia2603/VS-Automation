import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Image as ImageIcon, Link as LinkIcon, MoreHorizontal, Edit, Trash2, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Project = {
  id: number;
  name: string;
};

type Result = {
  id: number;
  name: string | null;
  url: string;
  css_selector: string | null;
  image_url: string | null;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
};

const ReportScreenshotDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<Partial<Result> | null>(null);
  const [resultToDelete, setResultToDelete] = useState<Result | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const projectPromise = supabase.from('report_screenshot_projects').select('id, name').eq('id', projectId).single();
      const resultsPromise = supabase.from('report_screenshot_results').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      
      const [{ data: projectData, error: projectError }, { data: resultsData, error: resultsError }] = await Promise.all([projectPromise, resultsPromise]);

      if (projectError) throw projectError;
      if (resultsError) throw resultsError;

      setProject(projectData);
      setResults(resultsData as Result[]);
    } catch (error: any) {
      showError("Không thể tải dữ liệu dự án: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleOpenDialog = (result: Partial<Result> | null = null) => {
    setEditingResult(result ? { ...result } : { name: '', url: '', css_selector: '' });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingResult || !editingResult.name || !editingResult.url) {
      showError("Tên và Link bài viết không được để trống.");
      return;
    }
    setIsSaving(true);
    try {
      const dataToSave = {
        project_id: projectId,
        name: editingResult.name,
        url: editingResult.url,
        css_selector: editingResult.css_selector,
      };

      if (editingResult.id) {
        const { error } = await supabase.from('report_screenshot_results').update(dataToSave).eq('id', editingResult.id);
        if (error) throw error;
        showSuccess("Đã cập nhật thành công!");
      } else {
        const { error } = await supabase.from('report_screenshot_results').insert(dataToSave);
        if (error) throw error;
        showSuccess("Đã thêm bài viết vào hàng đợi!");
      }
      setIsDialogOpen(false);
      fetchProjectData();
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resultToDelete) return;
    const { error } = await supabase.from('report_screenshot_results').delete().eq('id', resultToDelete.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa thành công!");
      fetchProjectData();
    }
    setResultToDelete(null);
  };

  return (
    <>
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/report-screenshot">
              <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              {isLoading ? <Skeleton className="h-9 w-64" /> : <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project?.name}</h1>}
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Chụp ảnh bài viết
          </Button>
        </div>

        <Card className="shadow-sm rounded-2xl bg-white">
          <CardHeader>
            <CardTitle>Danh sách bài viết</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên bài viết</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Thời gian thêm</TableHead>
                    <TableHead>Ảnh Report</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? ([...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)) : 
                  results.length > 0 ? (results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.name}</TableCell>
                      <TableCell><a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><LinkIcon className="h-4 w-4" />Link</a></TableCell>
                      <TableCell>{format(new Date(result.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</TableCell>
                      <TableCell>
                        {result.image_url ? (
                          <Button variant="outline" size="sm" onClick={() => setViewingImageUrl(result.image_url)}><ImageIcon className="mr-2 h-4 w-4" />Xem ảnh</Button>
                        ) : (
                          <Badge variant="secondary">{result.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleOpenDialog(result)}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setResultToDelete(result)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))) : 
                  (<TableRow><TableCell colSpan={5} className="text-center h-24">Chưa có bài viết nào.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResult?.id ? 'Sửa thông tin' : 'Thêm bài viết cần chụp'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Tên bài viết</Label><Input id="name" value={editingResult?.name || ''} onChange={e => setEditingResult(r => ({ ...r, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="url">Link bài viết</Label><Input id="url" value={editingResult?.url || ''} onChange={e => setEditingResult(r => ({ ...r, url: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="css_selector">CSS Selector (tùy chọn)</Label><Input id="css_selector" value={editingResult?.css_selector || ''} onChange={e => setEditingResult(r => ({ ...r, css_selector: e.target.value }))} /><p className="text-xs text-muted-foreground">Nếu để trống, extension sẽ chụp toàn bộ trang.</p></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!resultToDelete} onOpenChange={() => setResultToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn mục "{resultToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingImageUrl} onOpenChange={() => setViewingImageUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Ảnh Report</DialogTitle></DialogHeader>
          <div className="py-4 max-h-[80vh] overflow-auto">
            <img src={viewingImageUrl || ''} alt="Screenshot" className="w-full h-auto" />
          </div>
          <DialogFooter>
            <Button asChild variant="outline"><a href={viewingImageUrl || ''} download target="_blank"><Download className="mr-2 h-4 w-4" />Tải xuống</a></Button>
            <Button onClick={() => setViewingImageUrl(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportScreenshotDetail;