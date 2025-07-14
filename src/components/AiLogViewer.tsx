import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ServerCrash, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showSuccess, showError } from '@/utils/toast';

interface AiLog {
  id: number;
  created_at: string;
  status: 'success' | 'error';
  details: string;
}

interface AiLogViewerProps {
  conversationId: number;
}

export const AiLogViewer: React.FC<AiLogViewerProps> = ({ conversationId }) => {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_reply_logs')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch AI logs:", error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('ai_reply_logs')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) {
        if (error.code === '42501') {
          throw new Error("Bạn không có quyền xoá nhật ký. Vui lòng liên hệ quản trị viên.");
        }
        throw error;
      }

      setLogs([]);
      showSuccess('Đã xoá tất cả nhật ký thành công!');
    } catch (error: any) {
      showError('Xoá nhật ký thất bại: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b flex justify-between items-center">
        <h4 className="font-semibold">Nhật ký hoạt động AI</h4>
        {logs.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Xoá tất cả
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này không thể hoàn tác. Thao tác này sẽ xoá vĩnh viễn tất cả nhật ký AI cho cuộc trò chuyện này.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>Tiếp tục</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center h-80">
          <ServerCrash className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold">Không có nhật ký</h3>
          <p className="text-sm text-muted-foreground">Chưa có hoạt động nào của AI được ghi lại cho cuộc trò chuyện này.</p>
        </div>
      ) : (
        <ScrollArea className="h-80">
          <div className="p-4 space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div>
                  {log.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={log.status === 'success' ? 'bg-green-100 text-green-800' : ''}>
                      {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 break-words">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};