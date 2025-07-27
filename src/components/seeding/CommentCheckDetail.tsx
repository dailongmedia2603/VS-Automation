import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, MoreHorizontal, Link as LinkIcon, MessageCircle, Code, PlayCircle, CheckCircle2, XCircle, Loader2, FileText, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Post = {
  id: number;
  name: string;
  links: string | null;
  type: 'comment_check' | 'post_approval';
  is_active: boolean;
  check_frequency: string | null;
  status: 'checking' | 'completed';
};

type Comment = {
  id: number;
  content: string;
  status: 'visible' | 'not_visible';
  account_name: string | null;
  comment_link: string | null;
};

interface FbComment {
  message: string;
  from?: {
    id: string;
    name: string;
    link?: string;
  };
  permalink_url?: string;
  id: string;
}

interface CheckResult {
  found: number;
  notFound: number;
  total: number;
}

interface LogData {
    requestUrl: string;
    rawResponse: string;
}

interface CommentCheckDetailProps {
  post: Post;
  onPostUpdate: () => void;
}

export const CommentCheckDetail = ({ post, onPostUpdate }: CommentCheckDetailProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'not_visible'>('all');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [logData, setLogData] = useState<LogData | null>(null);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  const [isActive, setIsActive] = useState(post.is_active);
  const [checkInterval, setCheckInterval] = useState('1');
  const [checkUnit, setCheckUnit] = useState('hours');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
    setLogData(null);
    setIsActive(post.is_active);
    if (post.check_frequency) {
      const [interval, unit] = post.check_frequency.split('_');
      setCheckInterval(interval || '1');
      setCheckUnit(unit || 'hours');
    } else {
      setCheckInterval('1');
      setCheckUnit('hours');
    }
  }, [post]);

  const handleSettingsSave = async () => {
    setIsSavingSettings(true);
    const frequency = `${checkInterval}_${checkUnit}`;
    const { error } = await supabase
        .from('seeding_posts')
        .update({ is_active: isActive, check_frequency: frequency })
        .eq('id', post.id);
    
    if (error) {
        showError("Lưu cài đặt thất bại: " + error.message);
    } else {
        showSuccess("Đã lưu cài đặt!");
        onPostUpdate();
    }
    setIsSavingSettings(false);
  };

  const handleRunCheck = async () => {
    if (!post.links) {
      showError("Bài viết này thiếu ID để có thể kiểm tra.");
      return;
    }
    setIsChecking(true);
    setCheckResult(null);
    setLogData(null);

    try {
      const { data: fbData, error: functionError } = await supabase.functions.invoke('get-fb-comments', {
        body: { postId: post.links }
      });

      if (functionError) throw functionError;
      if (fbData.error) throw new Error(fbData.error);
      
      setLogData(fbData.log);

      const actualComments: FbComment[] = fbData.data || [];
      
      const updates = [];
      let foundCount = 0;

      for (const expectedComment of comments) {
        const foundFbComment = actualComments.find(actual => actual.message && actual.message.trim() === expectedComment.content.trim());
        
        if (foundFbComment) {
          foundCount++;
          updates.push({
            id: expectedComment.id,
            status: 'visible' as const,
            account_name: foundFbComment.from?.name || 'Không rõ',
            comment_link: foundFbComment.permalink_url || null,
          });
        } else {
          if (expectedComment.status === 'visible') {
            updates.push({
              id: expectedComment.id,
              status: 'not_visible' as const,
              account_name: null,
              comment_link: null,
            });
          }
        }
      }

      if (updates.length > 0) {
        const { error: updateError } = await supabase.from('seeding_comments').upsert(updates);
        if (updateError) throw updateError;
      }

      const total = comments.length;
      setCheckResult({ found: foundCount, notFound: total - foundCount, total });
      showSuccess(`Kiểm tra hoàn tất! Tìm thấy ${foundCount}/${total} bình luận.`);
      
      const allVisible = foundCount === total && total > 0;
      if (allVisible) {
        await supabase.from('seeding_posts').update({ status: 'completed', is_active: false }).eq('id', post.id);
      }
      
      onPostUpdate();
      fetchComments();

    } catch (error: any) {
      const errorMessage = error.context?.json ? (await error.context.json()).error : error.message;
      showError(`Kiểm tra thất bại: ${errorMessage}`);
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
                      <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /><div><p className="font-bold">{checkResult.found}</p><p className="text-xs text-slate-500">Đã hiện</p></div></div>
                      <div className="flex items-center gap-2 text-amber-600"><XCircle className="h-5 w-5" /><div><p className="font-bold">{checkResult.notFound}</p><p className="text-xs text-slate-500">Chưa hiện</p></div></div>
                    </div>
                  )}
                  {logData && (<Button variant="outline" size="sm" onClick={() => setIsLogDialogOpen(true)}><FileText className="mr-2 h-4 w-4" />Xem Log</Button>)}
                  <Button onClick={handleRunCheck} disabled={isChecking} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                    {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {isChecking ? 'Đang chạy...' : 'Chạy Check'}
                  </Button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="check-interval" className="text-sm font-medium">Quét lại sau mỗi</Label>
                    <Input id="check-interval" type="number" value={checkInterval} onChange={(e) => setCheckInterval(e.target.value)} className="w-20 h-9" />
                    <Select value={checkUnit} onValueChange={(v) => setCheckUnit(v)}>
                      <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Phút</SelectItem>
                        <SelectItem value="hours">Giờ</SelectItem>
                        <SelectItem value="days">Ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleSettingsSave} disabled={isSavingSettings}>
                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="is-active" className="font-medium">{isActive ? 'Đang kích hoạt' : 'Đã tắt'}</Label>
                  <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm comment..." className="pl-9 rounded-lg bg-slate-100 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px] rounded-lg"><SelectValue placeholder="Lọc trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="visible">Đã hiện</SelectItem>
                  <SelectItem value="not_visible">Chưa hiện</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="rounded-lg"><Download className="mr-2 h-4 w-4" />Xuất Excel</Button>
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
                  [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
                ) : filteredComments.length > 0 ? (
                  filteredComments.map((comment, index) => (
                    <TableRow key={comment.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell className="max-w-xs break-words text-slate-700">{comment.content}</TableCell>
                      <TableCell><Badge className={cn('pointer-events-none', comment.status === 'visible' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200')}>{comment.status === 'visible' ? 'Đã hiện' : 'Chưa hiện'}</Badge></TableCell>
                      <TableCell><div className="text-xs text-slate-500"><p><strong>Account:</strong> {comment.account_name || 'N/A'}</p><div className="flex items-center gap-1.5"><strong>Link:</strong> {comment.comment_link ? (<a href={comment.comment_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700" title={comment.comment_link}><LinkIcon className="h-3.5 w-3.5" /></a>) : 'N/A'}</div></div></TableCell>
                      <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>Sửa</DropdownMenuItem><DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center h-48 text-slate-500"><div className="flex flex-col items-center gap-2"><MessageCircle className="h-10 w-10 text-slate-400" /><span className="font-medium">Không có comment nào</span><span className="text-xs">Hãy thử thêm comment mới hoặc thay đổi bộ lọc.</span></div></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Nhật ký kiểm tra</DialogTitle><DialogDescription>Chi tiết về yêu cầu đã gửi và phản hồi nhận được từ API.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div><h3 className="font-semibold mb-2">URL đã gửi đi:</h3><div className="p-3 bg-slate-100 rounded-md text-slate-900 font-mono text-xs break-all">{logData?.requestUrl}</div></div><div><h3 className="font-semibold mb-2">Kết quả thô trả về:</h3><ScrollArea className="h-64 w-full bg-slate-100 rounded-md border p-4"><pre className="text-xs whitespace-pre-wrap break-all"><code>{JSON.stringify(JSON.parse(logData?.rawResponse || '{}'), null, 2)}</code></pre></ScrollArea></div></div><DialogFooter><Button onClick={() => setIsLogDialogOpen(false)}>Đóng</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
};