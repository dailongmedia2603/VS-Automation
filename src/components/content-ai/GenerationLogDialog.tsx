import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from 'lucide-react';

type Log = {
  id: number;
  created_at: string;
  prompt: string;
  response: any;
};

interface GenerationLogDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    logs: Log[];
    isLoading: boolean;
    onClearLogs: () => Promise<void>;
}

export const GenerationLogDialog = ({ isOpen, onOpenChange, logs, isLoading, onClearLogs }: GenerationLogDialogProps) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmClear = async () => {
        setIsDeleting(true);
        await onClearLogs();
        setIsDeleting(false);
    };

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lịch sử Nhật ký AI</DialogTitle>
            <DialogDescription>
              Chi tiết các prompt đã gửi và phản hồi thô từ AI.
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
                {logs.map((log, index) => (
                  <AccordionItem value={`item-${index}`} key={log.id} className="border rounded-lg px-4">
                    <AccordionTrigger>
                      Tạo lúc: {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Prompt đã gửi:</h4>
                        <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap">
                          {log.prompt}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Phản hồi thô từ AI:</h4>
                        <pre className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap overflow-auto">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-sm text-slate-500 py-8">Chưa có log nào được ghi lại.</p>
            )}
          </ScrollArea>
          <DialogFooter className="justify-between">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={logs.length === 0 || isLoading || isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xoá tất cả
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ xóa vĩnh viễn toàn bộ lịch sử nhật ký AI cho mục này.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmClear} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};