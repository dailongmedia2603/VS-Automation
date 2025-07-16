import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AiLogDetailDialog } from './AiLogDetailDialog';
import { type AiLog } from '@/types/chatwoot';

export const AiLogViewer = ({ conversationId }: { conversationId: number }) => {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_reply_logs')
        .select('id, created_at, status, details, system_prompt')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching AI logs:', error);
      } else {
        setLogs(data as AiLog[]);
      }
      setLoading(false);
    };

    if (conversationId) {
      fetchLogs();
    }
  }, [conversationId]);

  const handleLogClick = (log: AiLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  return (
    <>
      <div className="flex flex-col">
        <header className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Nhật ký Hoạt động AI
          </h3>
          <p className="text-sm text-muted-foreground">Lịch sử các lần AI trả lời tự động.</p>
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