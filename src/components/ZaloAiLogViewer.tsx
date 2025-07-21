import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Bot, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ZaloAiLogDetailDialog } from './ZaloAiLogDetailDialog';
import { type ZaloAiLog } from '@/types/zalo';
import { showSuccess, showError } from '@/utils/toast';

export const ZaloAiLogViewer = ({ threadId }: { threadId: string }) => {
  const [logs, setLogs] = useState<ZaloAiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ZaloAiLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('zalo_ai_reply_logs')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching Zalo AI logs:', error);
      } else {
        setLogs(data as ZaloAiLog[]);
      }
      setLoading(false);
    };

    if (threadId) {
      fetchLogs();
    }
  }, [threadId]);

  const handleLogClick = (log: ZaloAiLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleDeleteAllLogs = async () => {
    try {
      const { error } = await supabase
        .from('zalo_ai_reply_logs')
        .delete()
        .eq('thread_id', threadId);

      if (error) throw error;

      setLogs([]);
      showSuccess("Đã xóa toàn bộ lịch sử AI cho cuộc trò chuyện này.");
    } catch (error: any) {
      showError("Xóa lịch sử thất bại: " + error.message);
    } finally {
      setIsAlertOpen(false);
    }
  };

  const renderLogList = (logType: 'auto_reply' | 'care_script_suggestion') => {
    const filteredLogs = logs.filter(log => log.log_type === logType);
    return (
      <ScrollArea className="h-80">
        <div className="p-4 space-y-4">
          {loading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : filteredLogs.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">Chưa có hoạt động nào.</p>
          ) : (
            filteredLogs.map(log => (
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
    );
  };

  return (
    <>
      <div className="flex flex-col">
        <header className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Nhật ký Hoạt động AI Zalo
            </h3>
            <p className="text-sm text-muted-foreground">Lịch sử các lần AI hoạt động.</p>
          </div>
          {logs.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setIsAlertOpen(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </header>
        <Tabs defaultValue="auto_reply" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto_reply">Trả lời</TabsTrigger>
            <TabsTrigger value="care_script_suggestion">Chăm sóc</TabsTrigger>
          </TabsList>
          <TabsContent value="auto_reply">
            {renderLogList('auto_reply')}
          </TabsContent>
          <TabsContent value="care_script_suggestion">
            {renderLogList('care_script_suggestion')}
          </TabsContent>
        </Tabs>
      </div>
      <ZaloAiLogDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        log={selectedLog}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn toàn bộ nhật ký hoạt động AI cho cuộc trò chuyện này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllLogs} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};