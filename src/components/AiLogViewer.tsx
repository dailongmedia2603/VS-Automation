import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, Bot, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AiLogDetailDialog } from './AiLogDetailDialog';
import { type AiLog } from '@/types/chatwoot';
import { showError, showSuccess } from '@/utils/toast';

export const AiLogViewer = ({ conversationId }: { conversationId: number }) => {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_reply_logs')
      .select('id, created_at, status, details, system_prompt')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      showError("Không thể tải log AI.");
    } else {
      setLogs(data as AiLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (conversationId) {
      fetchLogs();
    }
  }, [conversationId]);

  const handleLogClick = (log: AiLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleDeleteAllLogs = async () => {
    setIsDeleting(true);
    const { error } = await supabase
      .from('ai_reply_logs')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) {
      showError("Xóa log thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa tất cả log cho cuộc trò chuyện này.");
      setLogs([]);
    }
    setIsDeleting(false);
  };

  return (
    <>
      <div className="flex flex-col">
        <header className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Nhật ký Hoạt động AI
            </h3>
            <p className="text-sm text-muted-foreground">Lịch sử các lần AI trả lời tự động.</p>
          </div>
          {logs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa Log
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này sẽ xóa vĩnh viễn tất cả nhật ký AI cho cuộc trò chuyện này. Không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllLogs} disabled={isDeleting}>
                    {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>
        <ScrollArea className="h-96">
          <div className="p-4 space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : logs.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">Chưa có hoạt động nào.</p>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleLogClick(log)}
                >
                  <div>
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{log.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      <AiLogDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        log={selectedLog}
      />
    </>
  );
};