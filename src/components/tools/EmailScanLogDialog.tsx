import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { showError } from "@/utils/toast";

type Log = {
  id: number;
  created_at: string;
  request_url: string | null;
  raw_response: any;
  status: 'success' | 'error';
  error_message: string | null;
};

interface EmailScanLogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}

export const EmailScanLogDialog = ({ isOpen, onOpenChange, projectId }: EmailScanLogDialogProps) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchLogs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('log_email_scan')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        if (error) {
          showError("Không thể tải lịch sử: " + error.message);
        } else {
          setLogs(data || []);
        }
        setIsLoading(false);
      };
      fetchLogs();
    }
  }, [isOpen, projectId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lịch sử Quét</DialogTitle>
          <DialogDescription>
            Danh sách các lần quét đã được thực hiện cho dự án này.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : logs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-2">
              {logs.map(log => (
                <AccordionItem value={`item-${log.id}`} key={log.id} className="border rounded-lg px-4">
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}</span>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={cn(log.status === 'success' && 'bg-green-100 text-green-800')}>
                        {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {log.error_message && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm text-destructive">Thông báo lỗi:</h4>
                        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm font-mono break-all">
                          {log.error_message}
                        </div>
                      </div>
                    )}
                    {log.request_url && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">URL đã gửi đi:</h4>
                        <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs break-all">
                          {log.request_url}
                        </div>
                      </div>
                    )}
                    {log.raw_response && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Kết quả thô trả về:</h4>
                        <pre className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-48">
                          {JSON.stringify(log.raw_response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-sm text-slate-500 py-8">Chưa có lịch sử nào.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};