import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const geminiModels = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-pro', label: 'Gemini 1.0 Pro (Legacy)' },
];

const VertexAiSettings = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scanModel, setScanModel] = useState('gemini-2.5-flash');
  const [contentModel, setContentModel] = useState('gemini-2.5-pro');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isSavingModels, setIsSavingModels] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      const { data, error } = await supabase.from('ai_settings').select('gemini_scan_model, gemini_content_model').eq('id', 1).single();
      if (data) {
        setScanModel(data.gemini_scan_model || 'gemini-2.5-flash');
        setContentModel(data.gemini_content_model || 'gemini-2.5-pro');
      }
      setIsLoadingModels(false);
    };
    fetchModels();
  }, []);

  const handleSaveModels = async () => {
    setIsSavingModels(true);
    const { error } = await supabase.from('ai_settings').upsert({ id: 1, gemini_scan_model: scanModel, gemini_content_model: contentModel });
    if (error) {
      showError("Lưu cấu hình model thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu cấu hình model!");
    }
    setIsSavingModels(false);
  };

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
        <CardTitle>Kết nối API Gemini qua Google Cloud Vertex AI</CardTitle>
        <CardDescription>
          Quản lý xác thực qua Service Account và chọn model cho các tính năng AI.
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
        <div className="border-t pt-6">
          <CardTitle className="text-lg">Cấu hình Model</CardTitle>
          <CardDescription className="mb-4">Chọn model Gemini sẽ được sử dụng cho các tính năng khác nhau.</CardDescription>
          {isLoadingModels ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="scan-model">Model cho Check content post scan</Label>
                  <Select value={scanModel} onValueChange={setScanModel}>
                    <SelectTrigger id="scan-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {geminiModels.map(model => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-model">Model cho Content AI</Label>
                  <Select value={contentModel} onValueChange={setContentModel}>
                    <SelectTrigger id="content-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {geminiModels.map(model => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveModels} disabled={isSavingModels} className="mt-4 rounded-lg">
                {isSavingModels && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu cấu hình Model
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VertexAiSettings;