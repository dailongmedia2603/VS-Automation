import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface ErrorLog {
    step: string;
    requestUrl?: string;
    rawResponse?: string;
    errorMessage: string;
}

interface LogDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    log: ErrorLog | null;
    isError: boolean;
}

export const LogDialog = ({ isOpen, onOpenChange, log, isError }: LogDialogProps) => {
    if (!log) return null;
    
    let formattedResponse = log.rawResponse;
    try {
        if (log.rawResponse) {
            formattedResponse = JSON.stringify(JSON.parse(log.rawResponse), null, 2);
        }
    } catch (e) {
        // Keep rawResponse as is if it's not valid JSON
    }

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className={cn(isError && "text-destructive")}>
              {isError ? `Chi tiết lỗi - ${log.step}` : "Nhật ký API"}
            </DialogTitle>
            <DialogDescription>
              {isError 
                ? "Đã xảy ra lỗi trong quá trình kiểm tra. Dưới đây là thông tin chi tiết để gỡ lỗi."
                : "Chi tiết về yêu cầu đã gửi và phản hồi nhận được từ API."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            {isError && (
                <div>
                    <h3 className="font-semibold mb-2 text-destructive">Thông báo lỗi:</h3>
                    <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm font-mono break-all">
                        {log.errorMessage}
                    </div>
                </div>
            )}
            {log.requestUrl && (
              <div>
                <h3 className="font-semibold mb-2">URL đã gửi đi:</h3>
                <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs break-all">
                  {log.requestUrl}
                </div>
              </div>
            )}
            {log.rawResponse && (
              <div>
                <h3 className="font-semibold mb-2">Kết quả thô trả về:</h3>
                <ScrollArea className="h-48 w-full bg-slate-100 rounded-md border p-4">
                  <pre className="text-xs whitespace-pre-wrap break-all"><code>{formattedResponse}</code></pre>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};