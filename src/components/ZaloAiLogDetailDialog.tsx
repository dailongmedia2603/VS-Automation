import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type ZaloAiLog } from '@/types/zalo';

interface ZaloAiLogDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  log: ZaloAiLog | null;
}

export const ZaloAiLogDetailDialog = ({ isOpen, onOpenChange, log }: ZaloAiLogDetailDialogProps) => {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Chi tiết Nhật ký AI Zalo</DialogTitle>
          <DialogDescription>
            Xem lại nhật ký và prompt system đã được sử dụng để tạo ra kết quả này.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh]">
          <div className="space-y-2">
            <h4 className="font-semibold">Nhật ký</h4>
            <p className="text-sm p-3 bg-slate-50 rounded-md">{log.details}</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Prompt System</h4>
            <ScrollArea className="h-96 w-full rounded-md border p-4 bg-slate-50">
              <pre className="text-xs whitespace-pre-wrap break-all">
                {log.system_prompt || 'Không có prompt system được ghi lại.'}
              </pre>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};