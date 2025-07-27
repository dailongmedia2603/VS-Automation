import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, MoreHorizontal, Link as LinkIcon, MessageCircle, Code, PlayCircle, CheckCircle2, XCircle, Loader2, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Post = {
  id: number;
  name: string;
  links: string | null;
  type: 'comment_check' | 'post_approval';
};

type Comment = {
  id: number;
  content: string;
  status: 'visible' | 'not_visible';
  account_name: string | null;
  comment_link: string | null;
  account_id: string | null;
};

interface CheckResult {
  found: number;
  notFound: number;
  total: number;
}

interface ErrorLog {
    step: string;
    requestUrl?: string;
    rawResponse?: string;
    errorMessage: string;
}

interface CommentCheckDetailProps {
  post: Post;
  autoCheckActive: boolean;
  onAutoCheckChange: (checked: boolean) => void;
  frequencyValue: string;
  onFrequencyValueChange: (value: string) => void;
  frequencyUnit: string;
  onFrequencyUnitChange: (unit: string) => void;
  onSaveSettings: () => void;
}

const LogDialog = ({ isOpen, onOpenChange, log, isError }: { isOpen: boolean, onOpenChange: (open: boolean) => void, log: ErrorLog | null, isError: boolean }) => {
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

export const CommentCheckDetail = ({ 
  post,
  autoCheckActive,
  onAutoCheckChange,
  frequencyValue,
  onFrequencyValueChange,
  frequencyUnit,
  onFrequencyUnitChange,
  onSaveSettings
}: CommentCheckDetailProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'not_visible'>('all');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [log, setLog] = useState<ErrorLog | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const fetchComments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('seeding_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) {
      showError("Không thể tải danh sách comment: " + error.message);
    } else {
      setComments(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchComments();
    setCheckResult(null);
    setLog(null);
  }, [post.id]);

  const handleRunCheck = async () => {
    if (!post.links) {
      showError("Bài viết này thiếu ID để có thể kiểm tra.");
      return;
    }
    setIsChecking(true);
    setCheckResult(null);
    setLog(null);
    let toastId;

    try {
      // Step 1: Fetch raw data
      toastId = showLoading("Bước 1/3: Đang lấy dữ liệu thô từ API...");
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke('get-fb-comments', {
        body: { fbPostId: post.links }
      });
      if (fetchError || fetchData.error) {
        throw { step: 'Lấy dữ liệu', error: fetchError || fetchData, logData: fetchData };
      }
      
      setLog({
          step: 'Lấy dữ liệu thành công',
          errorMessage: 'Không có lỗi',
          requestUrl: fetchData.requestUrl,
          rawResponse: fetchData.rawResponse
      });

      // Step 2: Process and store data
      dismissToast(toastId);
      toastId = showLoading("Bước 2/3: Đang xử lý và lưu trữ dữ liệu...");
      const { data: processData, error: processError } = await supabase.functions.invoke('process-and-store-comments', {
        body: { rawResponse: fetchData.rawResponse, internalPostId: post.id }
      });
      if (processError || processData.error) {
        throw { step: 'Xử lý dữ liệu', error: processError || processData, logData: fetchData };
      }

      // Step 3: Compare and update
      dismissToast(toastId);
      toastId = showLoading("Bước 3/3: Đang so sánh và cập nhật trạng thái...");
      const { data: compareResult, error: compareError } = await supabase.functions.invoke('compare-and-update-comments', {
        body: { postId: post.id }
      });
      if (compareError || compareResult.error) {
        throw { step: 'So sánh dữ liệu', error: compareError || compareResult, logData: fetchData };
      }

      dismissToast(toastId);
      setCheckResult(compareResult);
      showSuccess(`Kiểm tra hoàn tất! Tìm thấy ${compareResult.found}/${compareResult.total} bình luận.`);
      fetchComments();

    } catch (e: any) {
      if (toastId) dismissToast(toastId);
      const errorMessage = e.error?.message || 'Đã xảy ra lỗi không xác định.';
      setLog({
          step: e.step || 'Không xác định',
          errorMessage: errorMessage,
          requestUrl: e.logData?.requestUrl,
          rawResponse: e.logData?.rawResponse,
      });
      showError(`Kiểm tra thất bại ở bước: ${e.step}.`);
    } finally {
      setIsChecking(false);
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      if (statusFilter !== 'all' && comment.status !== statusFilter) return false;
      if (searchTerm && !comment.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [comments, searchTerm, statusFilter]);

  const postUrl = post.links ? (post.links.startsWith('http') ? post.links : `https://www.facebook.com/${post.links}`) : '#';

  return (
    <>
      <Card className="w-full h-full shadow-none border-none flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">{post.name}</h2>
              <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="Mở bài viết gốc">
                  <LinkIcon className="h-4 w-4" />
              </a>
          </div>
          {post.links && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md text-slate-900 font-mono text-xs flex items-center gap-2">
                  <Code className="h-4 w-4 flex-shrink-0 text-slate-600" />
                  <span className="font-bold text-green-600">ID</span>
                  <span className="text-slate-700 break-all">{post.links}</span>
              </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Card className="mb-4 bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Kiểm tra bình luận tự động</h3>
                  <p className="text-sm text-slate-500">Quét bài viết và cập nhật trạng thái các bình luận trong danh sách.</p>
                </div>
                <div className="flex items-center gap-4">
                  {checkResult && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                          <p className="font-bold">{checkResult.found}</p>
                          <p className="text-xs text-slate-500">Đã hiện</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <XCircle className="h-5 w-5" />
                        <div>
                          <p className="font-bold">{checkResult.notFound}</p>
                          <p className="text-xs text-slate-500">Chưa hiện</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {log && (
                      <Button 
                          variant={log.errorMessage !== 'Không có lỗi' ? 'destructive' : 'outline'} 
                          size="sm" 
                          onClick={() => setIsLogOpen(true)}
                      >
                          <FileText className="mr-2 h-4 w-4" />
                          {log.errorMessage !== 'Không có lỗi' ? 'Xem Log Lỗi' : 'Xem Log API'}
                      </Button>
                  )}
                  <Button onClick={handleRunCheck} disabled={isChecking} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                    {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {isChecking ? 'Đang chạy...' : 'Chạy Check'}
                  </Button>
                </div>
              </div>
            </CardContent>
            <Accordion type="single" collapsible className="w-full px-4 pb-2">
              <AccordionItem value="settings" className="border-b-0">
                <AccordionTrigger className="text-sm text-slate-600 hover:no-underline py-2 -mx-2 px-2 rounded-md hover:bg-slate-200/50">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Cài đặt tự động
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white border">
                    <Label htmlFor="auto-check-switch" className="font-medium text-slate-700">Tự động chạy check</Label>
                    <Switch id="auto-check-switch" checked={autoCheckActive} onCheckedChange={onAutoCheckChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tần suất quét lại</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={frequencyValue} onChange={(e) => onFrequencyValueChange(e.target.value)} className="w-24 bg-white" />
                      <Select value={frequencyUnit} onValueChange={onFrequencyUnitChange}>
                        <SelectTrigger className="w-[120px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minute">Phút</SelectItem>
                          <SelectItem value="hour">Giờ</SelectItem>
                          <SelectItem value="day">Ngày</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={onSaveSettings} size="sm">Lưu cài đặt</Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm comment..." className="pl-9 rounded-lg bg-slate-100 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px] rounded-lg">
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="visible">Đã hiện</SelectItem>
                  <SelectItem value="not_visible">Chưa hiện</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="rounded-lg">
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
          </div>
          <div className="border rounded-lg overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>Content comment</TableHead>
                  <TableHead>Kết quả</TableHead>
                  <TableHead>Báo cáo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredComments.length > 0 ? (
                  filteredComments.map((comment, index) => (
                    <TableRow key={comment.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell className="max-w-xs break-words text-slate-700">{comment.content}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'pointer-events-none',
                          comment.status === 'visible' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        )}>
                          {comment.status === 'visible' ? 'Đã hiện' : 'Chưa hiện'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <strong>Account:</strong>
                            {comment.account_id && comment.account_name ? (
                              <a href={`https://www.facebook.com/${comment.account_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                {comment.account_name}
                              </a>
                            ) : (
                              <span>{comment.account_name || 'N/A'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <strong>Link:</strong> 
                            {comment.comment_link ? (
                              <a href={comment.comment_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700" title={comment.comment_link}>
                                <LinkIcon className="h-3.5 w-3.5" />
                              </a>
                            ) : 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Sửa</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-48 text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <MessageCircle className="h-10 w-10 text-slate-400" />
                        <span className="font-medium">Không có comment nào</span>
                        <span className="text-xs">Hãy thử thêm comment mới hoặc thay đổi bộ lọc.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <LogDialog isOpen={isLogOpen} onOpenChange={setIsLogOpen} log={log} isError={log?.errorMessage !== 'Không có lỗi'} />
    </>
  );
};