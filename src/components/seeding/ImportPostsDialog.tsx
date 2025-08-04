import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, FileDown, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import * as XLSX from 'xlsx';

interface ImportPostsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
  onSuccess: (importedPosts: any[]) => void;
}

type ParsedRow = {
  post_name: string;
  post_type: 'comment_check' | 'post_approval';
  id_list: string;
  post_content?: string;
  comment_content?: string;
};

export const ImportPostsDialog = ({ isOpen, onOpenChange, projectId, onSuccess }: ImportPostsDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const postCount = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return 0;
    const postNames = new Set(parsedData.map(row => String(row.post_name || '').trim()).filter(Boolean));
    return postNames.size;
  }, [parsedData]);

  const commentCount = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return 0;
    return parsedData.reduce((acc, row) => {
      const content = String(row.comment_content || '');
      if (content.trim()) {
        acc += content.trim().split('\n').filter(line => line.trim()).length;
      }
      return acc;
    }, 0);
  }, [parsedData]);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setIsParsing(false);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleDownloadTemplate = () => {
    const data = [
      {
        post_name: 'Bài Viết Mẫu 1 (Check Comment)',
        post_type: 'comment_check',
        id_list: '123456789012345 (ID bài viết)',
        post_content: '',
        comment_content: 'Comment mẫu 1 cho bài viết 1\nComment mẫu 2 cho bài viết 1',
      },
      {
        post_name: 'Bài Viết Mẫu 2 (Check Duyệt Post)',
        post_type: 'post_approval',
        id_list: 'group_id_1\ngroup_id_2 (mỗi ID group 1 dòng)',
        post_content: 'Đây là nội dung của bài viết cần duyệt.',
        comment_content: '',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ImportData");
    XLSX.writeFile(workbook, "import_template.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (fileToParse: File) => {
    setIsParsing(true);
    setParsedData([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (jsonData.length === 0) {
          throw new Error("File Excel trống hoặc không có dữ liệu.");
        }

        const firstRow = jsonData[0] || {};
        const headers = Object.keys(firstRow).map(h => h.toLowerCase().trim());
        const requiredFields = ['post_name', 'post_type', 'id_list'];
        
        if (!requiredFields.every(field => headers.includes(field))) {
          throw new Error(`File Excel thiếu các cột bắt buộc. Cần có: ${requiredFields.join(', ')}.`);
        }

        const normalizedData = jsonData.map(row => {
          const newRow: any = {};
          for (const key in row) {
            newRow[key.toLowerCase().trim()] = row[key];
          }
          return newRow;
        });

        setParsedData(normalizedData as ParsedRow[]);
      } catch (error: any) {
        showError(`Lỗi đọc file: ${error.message}`);
        setFile(null);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setImportResult({ success: 0, failed: 0 });

    const postsToImport = parsedData;
    const totalPosts = postsToImport.length;
    let successCount = 0;
    let failedCount = 0;
    const successfulPosts: any[] = [];

    for (let i = 0; i < totalPosts; i++) {
      const row = postsToImport[i];
      try {
        const postData = {
          name: String(row.post_name || '').trim(),
          type: row.post_type,
          links: String(row.id_list || ''),
          content: String(row.post_content || ''),
          comments: String(row.comment_content || '').trim() ? String(row.comment_content).trim().split('\n').filter(c => c.trim()) : []
        };

        if (!postData.name) {
          throw new Error(`Dòng ${i + 2} thiếu tên bài viết.`);
        }

        const { data: newPost, error: postError } = await supabase
          .from('seeding_posts')
          .insert({
            project_id: projectId,
            name: postData.name,
            type: postData.type,
            links: postData.links,
            content: postData.content,
            is_active: true,
            status: 'checking',
          })
          .select()
          .single();
        if (postError) throw postError;

        if (newPost) {
          successfulPosts.push(newPost);
          if (postData.type === 'comment_check' && postData.comments.length > 0) {
            const commentsToInsert = postData.comments.map(commentContent => ({
              post_id: newPost.id,
              content: commentContent.trim(),
            }));
            const { error: commentsError } = await supabase.from('seeding_comments').insert(commentsToInsert);
            if (commentsError) throw commentsError;
          }

          if (postData.type === 'post_approval' && postData.links) {
            const groupIds = String(postData.links).split('\n').map(id => id.trim()).filter(id => id);
            if (groupIds.length > 0) {
              const groupsToInsert = groupIds.map(groupId => ({
                post_id: newPost.id,
                group_id: groupId,
              }));
              const { error: groupsError } = await supabase.from('seeding_groups').insert(groupsToInsert);
              if (groupsError) throw groupsError;
            }
          }
        }
        successCount++;
      } catch (error: any) {
        console.error(`Lỗi import dòng ${i + 2} ("${row.post_name}"):`, error.message);
        failedCount++;
      }
      setImportProgress(((i + 1) / totalPosts) * 100);
      setImportResult({ success: successCount, failed: failedCount });
    }

    showSuccess(`Hoàn tất! Nhập thành công ${successCount}/${totalPosts} bài viết.`);
    if (failedCount > 0) {
      showError(`Có ${failedCount} bài viết nhập thất bại. Vui lòng kiểm tra console để biết chi tiết.`);
    }
    setIsImporting(false);
    if (successCount > 0) {
      onSuccess(successfulPosts);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isImporting) { onOpenChange(open); resetState(); } }}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold">Import hàng loạt</DialogTitle>
          <DialogDescription>Tải lên file Excel để thêm nhiều bài viết và bình luận cùng lúc.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 space-y-4 bg-slate-50">
          <div className="p-4 rounded-lg bg-white border">
            <h4 className="font-semibold text-slate-800">Bước 1: Tải file mẫu</h4>
            <p className="text-sm text-slate-500 mt-1 mb-3">Sử dụng file mẫu để đảm bảo dữ liệu của bạn được định dạng chính xác.</p>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <FileDown className="mr-2 h-4 w-4" />
              Tải file mẫu
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-white border">
            <h4 className="font-semibold text-slate-800">Bước 2: Tải lên file của bạn</h4>
            <Label htmlFor="file-upload" className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 mt-3">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                <p className="mb-1 text-sm text-slate-600">Nhấn để tải lên hoặc kéo thả</p>
                <p className="text-xs text-slate-500">XLSX, XLS, hoặc CSV</p>
              </div>
              <Input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
            </Label>
            {file && (
              <div className="mt-3 flex items-center justify-between p-2 bg-slate-100 rounded-md border">
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-slate-700">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-800" onClick={() => { setFile(null); setParsedData([]); }}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {parsedData.length > 0 && !isImporting && (
            <div className="text-center text-sm text-slate-600 pt-2">
              <p>Đã tìm thấy <span className="font-bold">{postCount}</span> bài viết và <span className="font-bold">{commentCount}</span> bình luận.</p>
            </div>
          )}
          {isImporting && (
            <div className="pt-2">
              <Progress value={importProgress} className="w-full" />
              <div className="mt-2 flex justify-between text-sm">
                <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /><span>Thành công: {importResult?.success || 0}</span></div>
                <div className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /><span>Thất bại: {importResult?.failed || 0}</span></div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 bg-white border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>Hủy</Button>
          <Button 
            onClick={handleImport} 
            disabled={isParsing || parsedData.length === 0 || isImporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isImporting ? 'Đang xử lý...' : 'Bắt đầu Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};