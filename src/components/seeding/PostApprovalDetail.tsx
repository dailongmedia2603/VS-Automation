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
import { Search, Download, MoreHorizontal, Link as LinkIcon, Code, PlayCircle, CheckCircle2, XCircle, Loader2, FileText, Settings, PlusCircle, Edit, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import * as XLSX from 'xlsx';

type Project = {
  id: number;
  name: string;
};

type Post = {
  id: number;
  name: string;
  content: string | null;
  type: 'comment_check' | 'post_approval';
};

type Group = {
  id: number;
  group_id: string;
  status: 'approved' | 'not_found';
  approved_post_link: string | null;
};

interface CheckResult {
  approved: number;
  pending: number;
  total: number;
}

interface PostApprovalDetailProps {
  project: Project;
  post: Post;
  autoCheckActive: boolean;
  onAutoCheckChange: (checked: boolean) => void;
  frequencyValue: string;
  onFrequencyValueChange: (value: string) => void;
  frequencyUnit: string;
  onFrequencyUnitChange: (unit: string) => void;
  onSaveSettings: () => void;
  onCheckComplete: () => void;
}

export const PostApprovalDetail = ({ 
  project,
  post,
  autoCheckActive,
  onAutoCheckChange,
  frequencyValue,
  onFrequencyValueChange,
  frequencyUnit,
  onFrequencyUnitChange,
  onSaveSettings,
  onCheckComplete
}: PostApprovalDetailProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'not_found'>('all');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  
  const fetchGroups = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('seeding_groups')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) {
      showError("Không thể tải danh sách group: " + error.message);
    } else {
      setGroups(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGroups();
    setCheckResult(null);
  }, [post.id]);

  const handleRunCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);
    const toastId = showLoading("Đang quét các group...");

    try {
      const { data, error } = await supabase.functions.invoke('check-post-approval', {
        body: { postId: post.id }
      });

      if (error || data.error) {
        throw new Error(error?.message || data?.error);
      }

      dismissToast(toastId);
      setCheckResult(data);
      showSuccess(`Kiểm tra hoàn tất! Duyệt thành công ${data.approved}/${data.total} group.`);
      onCheckComplete();
      fetchGroups();

    } catch (err: any) {
      dismissToast(toastId);
      showError(`Kiểm tra thất bại: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      if (statusFilter !== 'all' && group.status !== statusFilter) return false;
      if (searchTerm && !group.group_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [groups, searchTerm, statusFilter]);

  return (
    <>
      <Card className="w-full h-full shadow-none border-none flex flex-col">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-800">{post.name}</h2>
          <div className="mt-2">
            <Label className="text-sm font-medium text-slate-600">Nội dung bài viết</Label>
            <Textarea
              readOnly
              value={post.content || 'Không có nội dung'}
              className="mt-1 bg-slate-50 font-mono text-xs min-h-[100px]"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Card className="mb-4 bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Kiểm tra duyệt bài tự động</h3>
                  <p className="text-sm text-slate-500">Quét các group để kiểm tra bài viết đã được duyệt hay chưa.</p>
                </div>
                <div className="flex items-center gap-4">
                  {checkResult && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                          <p className="font-bold">{checkResult.approved}</p>
                          <p className="text-xs text-slate-500">Đã duyệt</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <XCircle className="h-5 w-5" />
                        <div>
                          <p className="font-bold">{checkResult.pending}</p>
                          <p className="text-xs text-slate-500">Chưa duyệt</p>
                        </div>
                      </div>
                    </div>
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
                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-2 space-y-2">
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
                    <div className="flex justify-end">
                      <Button onClick={onSaveSettings} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Lưu cài đặt</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm group ID..." className="pl-9 rounded-lg bg-slate-100 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px] rounded-lg">
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="not_found">Chưa duyệt</SelectItem>
                </SelectContent>
              </Select>
              {/* Add Export and Add Group buttons later if needed */}
            </div>
          </div>
          <div className="border rounded-lg overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>Group ID</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Link bài viết</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredGroups.length > 0 ? (
                  filteredGroups.map((group, index) => (
                    <TableRow key={group.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-mono text-slate-700">{group.group_id}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'pointer-events-none',
                          group.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        )}>
                          {group.status === 'approved' ? 'Đã duyệt' : 'Chưa duyệt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {group.approved_post_link ? (
                          <a href={group.approved_post_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            <LinkIcon className="h-3.5 w-3.5" />
                            Xem bài viết
                          </a>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Actions like delete can be added here */}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-48 text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-slate-400" />
                        <span className="font-medium">Không có group nào</span>
                        <span className="text-xs">Thêm group khi tạo post để bắt đầu.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};