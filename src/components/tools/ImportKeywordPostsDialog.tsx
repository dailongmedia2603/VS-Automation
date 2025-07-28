import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, FileDown, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import * as XLSX from 'xlsx';

interface ImportKeywordPostsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

type ParsedRow = {
  post_name: string;
  post_type: 'comment' | 'post';
  content: string;
  keywords: string;
};

export const ImportKeywordPostsDialog = ({ isOpen, onOpenChange, projectId, onSuccess }: ImportKeywordPostsDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

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
        post_type: 'comment',
        content: 'Comment mẫu 1\nComment mẫu 2',
        keywords: 'từ khóa 1\ntừ khóa 2',
      },
      {
        post_name: 'Bài Viết Mẫu 2 (Check Post)',
        post_type: 'post',
        content: 'Đây là toàn bộ nội dung của bài viết cần được kiểm tra.',
        keywords: 'từ khóa 3\ntừ khóa 4',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ImportData");
    XLSX.writeFile(workbook, "keyword_import_template.xlsx");
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
        
        const requiredFields = ['post_name', 'post_type', 'content', 'keywords'];
        const firstRow = jsonData[0] || {};
        if (!requiredFields.every(field => field in firstRow)) {
          throw new Error("File Excel thiếu các cột bắt buộc: post_name, post_type, content, keywords.");
        }

        setParsedData(jsonData as ParsedRow[]);
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

    for (let i = 0; i < totalPosts; i++) {
      const row = postsToImport[i];
      try {
        const postToInsert = {
          project_id: projectId,
          name: row.post_name,
          type: row.post_type,
          link: row.post_type === 'post' ? row.content : null,
          keywords: row.keywords,
        };

        const { data: newPost, error: postError } = await supabase
          .from('keyword_check_posts')
          .insert(postToInsert)
          .select()
          .single();
        if (postError) throw postError;

        if (newPost) {
          let itemsToInsert = [];
          if (row.post_type === 'comment') {
            itemsToInsert = row.content
              .split('\n')
              .filter(line => line.trim() !== '')
              .map(content => ({
                post_id: newPost.id,
                content: content.trim(),
              }));
          } else { // type === 'post'
            itemsToInsert.push({
              post_id: newPost.id,
              content: row.content.trim(),
            });
          }
          
          if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
              .from('keyword_check_items')
              .insert(itemsToInsert);
            if (itemsError) throw itemsError;
          }

          await supabase.functions.invoke('check-keywords-in-comments', { 
            body: { postId: newPost.id } 
          });
        }
        successCount++;
      } catch (error: any) {
        console.error(`Failed to import post "${row.post_name}":`, error.message);
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
      onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isImporting) { onOpenChange(open); resetState(); } }}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold">Import hàng loạt</DialogTitle>
          <DialogDescription>Tải lên file Excel để thêm nhiều bài viết và từ khóa cùng lúc.</DialogDescription>
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
            <Label htmlFor="file-upload-keyword" className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 mt-3">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                <p className="mb-1 text-sm text-slate-600">Nhấn để tải lên hoặc kéo thả</p>
                <p className="text-xs text-slate-500">XLSX, XLS, hoặc CSV</p>
              </div>
              <Input id="file-upload-keyword" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
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
              <p>Đã tìm thấy <span className="font-bold">{parsedData.length}</span> bài viết để import.</p>
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