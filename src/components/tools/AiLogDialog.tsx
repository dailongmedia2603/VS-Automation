import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface AiLog {
  post_content: string;
  ai_check_details: {
    prompt: string;
    response: any;
  } | null;
}

interface AiLogDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    logs: AiLog[];
}

export const AiLogDialog = ({ isOpen, onOpenChange, logs }: AiLogDialogProps) => {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nhật ký làm việc của AI</DialogTitle>
            <DialogDescription>
              Chi tiết các yêu cầu đã gửi đến AI và phản hồi nhận được.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {logs.length > 0 ? logs.map((log, index) => (
                <AccordionItem value={`item-${index}`} key={index} className="border rounded-lg px-4">
                  <AccordionTrigger>
                    <p className="truncate pr-4 text-left">
                      <span className="font-semibold">Post:</span> {log.post_content.substring(0, 80)}...
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {log.ai_check_details ? (
                      <>
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Prompt đã gửi:</h4>
                          <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap">
                            {log.ai_check_details.prompt}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Phản hồi thô từ AI:</h4>
                          <pre className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap overflow-auto">
                            {JSON.stringify(log.ai_check_details.response, null, 2)}
                          </pre>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Không có chi tiết log cho mục này.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )) : (
                <p className="text-center text-sm text-slate-500 py-8">Không có log nào để hiển thị.</p>
              )}
            </Accordion>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};