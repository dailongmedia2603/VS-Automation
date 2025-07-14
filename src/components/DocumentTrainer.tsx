import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Document {
  id: number;
  content: string;
  metadata: { file_name: string };
}

export const DocumentTrainer = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('documents').select('id, metadata').order('id', { ascending: false });
    if (error) {
      showError("Không thể tải danh sách tài liệu: " + error.message);
    } else {
      // Group by file name
      const grouped = (data || []).reduce((acc, doc) => {
        const fileName = doc.metadata?.file_name || 'Không rõ';
        if (!acc[fileName]) {
          acc[fileName] = { count: 0, ids: [] };
        }
        acc[fileName].count++;
        acc[fileName].ids.push(doc.id);
        return acc;
      }, {} as Record<string, { count: number, ids: number[] }>);
      
      const formatted = Object.entries(grouped).map(([name, data], index) => ({
        id: index, // Fake ID for rendering
        content: `${data.count} đoạn`,
        metadata: { file_name: name },
        ids: data.ids,
      }));
      setDocuments(formatted as any);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        showError("Chỉ hỗ trợ tệp PDF.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showError("Vui lòng chọn một tệp để tải lên.");
      return;
    }
    setIsUploading(true);
    const toastId = showLoading("Đang xử lý tệp PDF...");

    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async (e) => {
        try {
          const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => (item as any).str).join(' ') + '\n';
          }

          dismissToast(toastId);
          const embedToastId = showLoading("Đang tạo 'bộ não tri thức' cho AI...");

          const { error } = await supabase.functions.invoke('embed-document', {
            body: { text: fullText, fileName: file.name },
          });

          if (error) throw new Error(error.message);

          dismissToast(embedToastId);
          showSuccess("Tài liệu đã được huấn luyện thành công!");
          setFile(null);
          fetchDocuments();
        } catch (err: any) {
          dismissToast(toastId);
          showError("Xử lý thất bại: " + err.message);
        } finally {
          setIsUploading(false);
        }
      };
    } catch (err: any) {
      dismissToast(toastId);
      showError("Lỗi đọc tệp: " + err.message);
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    const confirmation = confirm(`Bạn có chắc chắn muốn xóa tất cả các đoạn từ tài liệu "${fileName}" không?`);
    if (!confirmation) return;

    const toastId = showLoading("Đang xóa tài liệu...");
    try {
      const { error } = await supabase.from('documents').delete().eq('metadata->>file_name', fileName);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Đã xóa tài liệu thành công.");
      fetchDocuments();
    } catch (err: any) {
      dismissToast(toastId);
      showError("Xóa thất bại: " + err.message);
    }
  };

  return (
    <div className="space-y-8 mt-6">
      <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Tải lên tài liệu</CardTitle>
          <CardDescription className="text-sm text-slate-500 pt-1">
            Tải lên các tệp PDF chứa kiến thức nội bộ (bảng giá, chính sách, thông tin sản phẩm...). Hệ thống sẽ tự động đọc, phân tích và lưu trữ để AI sử dụng khi trả lời tin nhắn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input type="file" onChange={handleFileChange} accept=".pdf" className="flex-1" />
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isUploading ? 'Đang xử lý...' : 'Tải lên & Huấn luyện'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Cơ sở tri thức</CardTitle>
          <CardDescription className="text-sm text-slate-500 pt-1">Danh sách các tài liệu đã được huấn luyện cho AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-100/80">
                <TableRow>
                  <TableHead>Tên tài liệu</TableHead>
                  <TableHead>Số đoạn đã học</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" /></TableCell></TableRow>
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-500" />
                        {doc.metadata.file_name}
                      </TableCell>
                      <TableCell>{doc.content}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.metadata.file_name)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-slate-500">Chưa có tài liệu nào được huấn luyện.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};