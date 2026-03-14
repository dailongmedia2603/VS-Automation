import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailScanService, EmailScanResult } from '@/api/tools';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, PlayCircle, Loader2, Download, Trash2, Settings, FileText } from 'lucide-react';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { EmailScanLogDialog } from '@/components/tools/EmailScanLogDialog';

const EmailScanDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  // React Query - data loads instantly from cache
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['email-scan-project', projectId],
    queryFn: () => emailScanService.getProject(Number(projectId)),
    enabled: !!projectId,
  });

  const { data: results = [], isLoading: isLoadingResults, refetch: refetchResults } = useQuery({
    queryKey: ['email-scan-results', projectId],
    queryFn: () => emailScanService.getResults(Number(projectId)),
    enabled: !!projectId,
  });

  const isLoading = isLoadingProject || isLoadingResults;

  const [selectedResultIds, setSelectedResultIds] = useState<number[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [fbPostId, setFbPostId] = useState(project?.fb_post_id || '');

  // Update fbPostId when project loads
  useMemo(() => {
    if (project?.fb_post_id !== undefined) {
      setFbPostId(project.fb_post_id || '');
    }
  }, [project]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () => emailScanService.saveConfig(Number(projectId), { fb_post_id: fbPostId }),
    onSuccess: () => {
      showSuccess("Đã lưu cấu hình thành công!");
      queryClient.invalidateQueries({ queryKey: ['email-scan-project', projectId] });
    },
    onError: (err) => showError("Lưu thất bại: " + (err as Error).message),
  });

  const scanMutation = useMutation({
    mutationFn: () => emailScanService.scanEmails(Number(projectId)),
    onSuccess: (data) => {
      if (data.success) {
        showSuccess(`Quét hoàn tất! Tìm thấy ${data.emails_found || 0} email.`);
        refetchResults();
      } else {
        showError(`Quét thất bại: ${data.error}`);
      }
    },
    onError: (err) => showError(`Quét thất bại: ${(err as Error).message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => emailScanService.deleteMultipleResults(selectedResultIds),
    onSuccess: () => {
      showSuccess("Đã xóa thành công!");
      setSelectedResultIds([]);
      setIsDeleteAlertOpen(false);
      refetchResults();
    },
    onError: (err) => showError("Xóa thất bại: " + (err as Error).message),
  });

  const handleSave = () => {
    if (!project) return;
    saveMutation.mutate();
  };

  const handleRunScan = async () => {
    if (!fbPostId) {
      showError("Vui lòng nhập ID bài viết Facebook.");
      return;
    }
    const toastId = showLoading("Đang quét bình luận...");
    try {
      await scanMutation.mutateAsync();
    } finally {
      dismissToast(toastId);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      showError("Không có dữ liệu để xuất.");
      return;
    }
    const dataToExport = results.map((result: EmailScanResult) => ({
      'Email': result.email,
      'Nội dung bình luận': result.comment_content,
      'Tên tài khoản': result.account_name,
      'Link tài khoản': result.account_id ? `https://facebook.com/${result.account_id}` : '',
      'Link bình luận': result.comment_link,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Email Scan Results");
    XLSX.writeFile(workbook, `export_emails_${project?.name || 'scan'}.xlsx`);
    showSuccess("Đã xuất file Excel thành công!");
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      </main>
    );
  }

  if (!project) return <main className="flex-1 p-6 sm:p-8 bg-slate-50">Không tìm thấy dự án.</main>;

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/tools/email-scan">
            <Button variant="outline" size="icon" className="bg-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Lần quét cuối: {project.last_scanned_at ? format(new Date(project.last_scanned_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa quét'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu cấu hình
          </Button>
        </div>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Cấu hình</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label htmlFor="fb-post-id">ID Bài viết Facebook</Label>
            <Input id="fb-post-id" value={fbPostId} onChange={e => setFbPostId(e.target.value)} placeholder="Dán ID bài viết cần quét vào đây" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kết quả</CardTitle>
              <CardDescription>Tìm thấy {results.length} email.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedResultIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa ({selectedResultIds.length})
                </Button>
              )}
              <Button variant="outline" className="bg-white" onClick={() => setIsLogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Log
              </Button>
              <Button variant="outline" className="bg-white" onClick={handleExportExcel}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
              <Button onClick={handleRunScan} disabled={scanMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                {scanMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Chạy quét
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedResultIds.length === results.length && results.length > 0}
                      onCheckedChange={(checked) => setSelectedResultIds(checked ? results.map((r: EmailScanResult) => r.id) : [])}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nội dung bình luận</TableHead>
                  <TableHead>Tài khoản</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length > 0 ? results.map((result: EmailScanResult) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedResultIds.includes(result.id)}
                        onCheckedChange={() => setSelectedResultIds(prev => prev.includes(result.id) ? prev.filter(id => id !== result.id) : [...prev, result.id])}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{result.email}</TableCell>
                    <TableCell className="max-w-md"><p className="line-clamp-2">{result.comment_content}</p></TableCell>
                    <TableCell>
                      <a href={`https://facebook.com/${result.account_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {result.account_name}
                      </a>
                    </TableCell>
                  </TableRow>
                )) : (<TableRow><TableCell colSpan={4} className="text-center h-24 text-slate-500">Chưa có kết quả.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EmailScanLogDialog
        isOpen={isLogOpen}
        onOpenChange={setIsLogOpen}
        projectId={project.id}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn {selectedResultIds.length} email đã chọn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default EmailScanDetail;