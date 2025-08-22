import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

type ScanLog = {
  id: number;
  created_at: string;
  request_urls: string[];
};

type ScanResult = {
  id: number;
  post_content: string;
  ai_check_details: { prompt: string; response: any; } | null;
};

interface ComprehensiveScanLogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  logs: ScanLog[];
}

export const ComprehensiveScanLogDialog = ({ isOpen, onOpenChange, projectId, logs }: ComprehensiveScanLogDialogProps) => {
  const [selectedLog, setSelectedLog] = useState<ScanLog | null>(null);
  const [associatedAiResults, setAssociatedAiResults] = useState<ScanResult[]>([]);
  const [isLoadingAiResults, setIsLoadingAiResults] = useState(false);

  const handleLogSelect = async (log: ScanLog) => {
    if (selectedLog?.id === log.id) {
      setSelectedLog(null);
      return;
    }
    setSelectedLog(log);
    setIsLoadingAiResults(true);
    setAssociatedAiResults([]);

    try {
      const startTime = new Date(log.created_at);
      const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // 10 minute window for safety

      const { data, error } = await supabase
        .from('post_scan_results')
        .select('id, post_content, ai_check_details')
        .eq('project_id', projectId)
        .gte('scanned_at', startTime.toISOString())
        .lt('scanned_at', endTime.toISOString());

      if (error) throw error;
      
      setAssociatedAiResults(data.filter(r => r.ai_check_details) || []);
    } catch (error: any) {
      showError("Không thể tải kết quả AI: " + error.message);
    } finally {
      setIsLoadingAiResults(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lịch sử Quét & Log AI</DialogTitle>
          <DialogDescription>
            Xem lại các lần quét, URL đã gọi và kết quả AI trả về cho từng lần.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          {logs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-2" onValueChange={(value) => {
              const log = logs.find(l => `item-${l.id}` === value);
              if (log) handleLogSelect(log);
              else setSelectedLog(null);
            }}>
              {logs.map(logItem => (
                <AccordionItem value={`item-${logItem.id}`} key={logItem.id} className="border rounded-lg px-4">
                  <AccordionTrigger>
                    Quét lúc: {format(new Date(logItem.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">URL đã gọi (Facebook API):</h4>
                      <div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs space-y-2 max-h-40 overflow-y-auto">
                        {logItem.request_urls.map((url, urlIndex) => (
                          <div key={urlIndex} className="break-all">{url}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Kết quả AI trả về:</h4>
                      {isLoadingAiResults ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                      ) : associatedAiResults.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-1">
                          {associatedAiResults.map((result) => (
                            <AccordionItem value={`result-${result.id}`} key={result.id} className="border rounded-md px-3 bg-white">
                              <AccordionTrigger className="text-sm py-2">
                                <p className="truncate pr-4 text-left">
                                  <span className="font-semibold">Post:</span> {result.post_content.substring(0, 80)}...
                                </p>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-2 pt-1 pb-3">
                                {result.ai_check_details ? (
                                  <>
                                    <div>
                                      <h5 className="font-semibold mb-1 text-xs">Prompt đã gửi:</h5>
                                      <div className="p-2 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {result.ai_check_details.prompt}
                                      </div>
                                    </div>
                                    <div>
                                      <h5 className="font-semibold mb-1 text-xs">Phản hồi thô từ AI:</h5>
                                      <pre className="p-2 bg-slate-100 rounded-md text-slate-900 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-40">
                                        {JSON.stringify(result.ai_check_details.response, null, 2)}
                                      </pre>
                                    </div>
                                  </>
                                ) : null}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <p className="text-sm text-slate-500 p-4 text-center">Không có kết quả AI cho lần quét này.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-slate-500 text-center py-8">Chưa có lịch sử quét nào.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};