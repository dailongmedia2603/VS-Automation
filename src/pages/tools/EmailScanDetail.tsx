import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, PlayCircle, Loader2, Download, Trash2, Settings, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

type Project = {
  id: number;
  name: string;
  fb_post_id: string | null;
  last_scanned_at: string | null;
};

type ScanResult = {
  id: number;
  email: string;
  comment_content: string;
  account_name: string | null;
  account_id: string | null;
  comment_link: string | null;
};

const EmailScanDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedResultIds, setSelectedResultIds] = useState<number[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Form state
  const [fbPostId, setFbPostId] = useState('');

  const fetchProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('email_scan_projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      setProject(data);
      setFbPostId(data.fb_post_id || '');

      const { data: resultsData, error: resultsError } = await supabase.from('email_scan_results').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (resultsError) throw resultsError;
      setResults(resultsData || []);

    } catch (error: any) {
      showError("Không thể tải dữ liệu dự án: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('email_scan_projects')
      .update({ fb_post_id: fbPostId })
      .eq('id', project.id);
    
    if (error) showError("Lưu thất bại: " + error.message);
    else showSuccess("Đã lưu cấu hình thành công!");
    setIsSaving(false);
  };

  const handleRunScan = async () => {
    if (!fbPostId) {
      showError("Vui lòng nhập ID bài viết Facebook.");
      return;
    }
    setIsScanning(true);
    const toastId = showLoading("Đang quét bình luận...");
    try {
      const { data, error } = await supabase.functions.invoke('scan-comments-for-emails', {
        body: { projectId }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      dismissToast(toastId);
      showSuccess(`Quét hoàn tất! Tìm thấy ${data.count} email.`);
      fetchProjectData(); // Refresh all data
    } catch (error: any) {
      if (toastId) dismissToast(toastId);
      showError(`Quét thất bại: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      showError("Không có dữ liệu để xuất.");
      return;
    }
    setIsExporting(true);
    const dataToExport = results.map(result => ({
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
    setIsExporting(false);
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    const toastId = showLoading(`Đang xóa ${selectedResultIds.length} email...`);
    try {
        const { error } = await supabase
            .from('email_scan_results')
            .delete()
            .in('id', selectedResultIds);
        
        if (error) throw error;

        showSuccess("Đã xóa thành công!");
        setResults(prev => prev.filter((r: ScanResult) => !selectedResultIds.includes(r.id)));
        setSelectedResultIds([]);
    } catch (error: any) {
        showError("Xóa thất bại: " + error.message);
    } finally {
        dismissToast(toastId);
        setIsDeleteAlertOpen(false);
        setIsDeleting(false);
    }
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
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
              <Button variant="outline" className="bg-white" onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Xuất Excel
              </Button>
              <Button onClick={handleRunScan} disabled={isScanning} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
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
                      onCheckedChange={(checked) => setSelectedResultIds(checked ? results.map(r => r.id) : [])}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nội dung bình luận</TableHead>
                  <TableHead>Tài khoản</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length > 0 ? results.map(result => (
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
            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default EmailScanDetail;