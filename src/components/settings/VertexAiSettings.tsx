import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const VertexAiSettings = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setStatus("testing");
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('check-vertex-ai-key');

      if (functionError) {
        let errorMessage = functionError.message;
        try {
          const errorBody = await functionError.context.json();
          if (errorBody.error) errorMessage = errorBody.error;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }
      
      if (data.error) throw new Error(data.error);

      setStatus("success");
      showSuccess(data.message || "Kết nối thành công!");
    } catch (err: any) {
      setStatus("error");
      const errorMessage = err.message || "Đã xảy ra lỗi không xác định.";
      setError(errorMessage);
      showError(`Kiểm tra thất bại: ${errorMessage}`);
    }
  };

  return (
    <Card className="shadow-sm rounded-2xl bg-white">
      <CardHeader>
        <CardTitle>Kết nối API Gemini qua Vertex AI</CardTitle>
        <CardDescription>
          Quản lý và kiểm tra trạng thái kết nối đến Google Cloud Vertex AI bằng Service Account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Hướng dẫn cấu hình</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1">
              <li>Tạo một Service Account trên Google Cloud Platform với quyền "Vertex AI User".</li>
              <li>Tải tệp JSON credentials của Service Account về máy.</li>
              <li>Truy cập Supabase Dashboard: <strong>Project Settings &gt; Vault</strong>.</li>
              <li>Tạo một secret mới với tên chính xác là <strong>GOOGLE_CREDENTIALS_JSON</strong>.</li>
              <li>Dán toàn bộ nội dung của tệp JSON credentials vào giá trị của secret và lưu lại.</li>
            </ol>
          </AlertDescription>
        </Alert>
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
              <p className="font-medium">Kiểm tra kết nối</p>
              {status === "idle" && <Badge variant="outline">Chưa kiểm tra</Badge>}
              {status === "testing" && <Badge variant="secondary">Đang kiểm tra...</Badge>}
              {status === "success" && <Badge variant="default" className="bg-green-100 text-green-800">Thành công</Badge>}
              {status === "error" && <Badge variant="destructive">Thất bại</Badge>}
          </div>
          <Button onClick={handleTestConnection} disabled={status === "testing"} className="mt-4 rounded-lg">
            {status === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối Vertex AI"}
          </Button>
          {error && (
            <div className="mt-4 text-sm text-destructive p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-bold">Chi tiết lỗi:</p>
              <p className="font-mono break-all">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VertexAiSettings;