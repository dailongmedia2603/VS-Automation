import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';

interface KnowledgeChunk {
  id: string; // Use a client-side UUID for key prop
  content: string;
  db_id?: number; // The actual ID from the database, if it exists
}

export const DocumentTrainer = () => {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('id, content')
      .order('id', { ascending: true });

    if (error) {
      showError("Không thể tải kiến thức đã lưu: " + error.message);
      setChunks([]);
    } else {
      setChunks(data.map(doc => ({ id: crypto.randomUUID(), content: doc.content, db_id: doc.id })));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddChunk = () => {
    setChunks(prev => [...prev, { id: crypto.randomUUID(), content: '' }]);
  };

  const handleRemoveChunk = (id: string) => {
    setChunks(prev => prev.filter(chunk => chunk.id !== id));
  };

  const handleContentChange = (id: string, content: string) => {
    setChunks(prev => prev.map(chunk => chunk.id === id ? { ...chunk, content } : chunk));
  };

  const handleSaveAndTrain = async () => {
    const nonEmptyChunks = chunks.map(c => c.content).filter(c => c.trim() !== '');
    if (nonEmptyChunks.length === 0) {
      showError("Vui lòng nhập ít nhất một đoạn kiến thức.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Đang lưu và huấn luyện AI...");

    try {
      // Step 1: Delete all existing documents to ensure a clean slate
      const { error: deleteError } = await supabase.from('documents').delete().neq('id', -1); // A trick to delete all rows
      if (deleteError) {
        throw new Error(`Lỗi dọn dẹp dữ liệu cũ: ${deleteError.message}`);
      }

      // Step 2: Invoke the edge function to embed and save the new chunks
      const { error: embedError } = await supabase.functions.invoke('embed-document', {
        body: { chunks: nonEmptyChunks },
      });

      if (embedError) {
        throw new Error(`Lỗi huấn luyện AI: ${embedError.message}`);
      }

      dismissToast(toastId);
      showSuccess("Đã huấn luyện AI với kiến thức mới thành công!");
      await fetchDocuments(); // Refresh the list from the DB
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 mt-6">
      <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Huấn luyện từ Văn bản</CardTitle>
          <CardDescription className="text-sm text-slate-500 pt-1">
            Nhập hoặc dán các đoạn kiến thức (thông tin sản phẩm, chính sách, câu hỏi thường gặp...) vào các ô bên dưới. Mỗi ô là một "mẩu tri thức" riêng biệt để AI học.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            chunks.map((chunk) => (
              <div key={chunk.id} className="flex items-start gap-2">
                <Textarea
                  placeholder="Nhập một đoạn kiến thức..."
                  value={chunk.content}
                  onChange={(e) => handleContentChange(chunk.id, e.target.value)}
                  className="min-h-[100px] bg-slate-50"
                />
                <Button variant="ghost" size="icon" onClick={() => handleRemoveChunk(chunk.id)} className="text-slate-500 hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={handleAddChunk}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm đoạn kiến thức
            </Button>
            <Button onClick={handleSaveAndTrain} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Đang huấn luyện...' : 'Lưu và Huấn luyện'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};