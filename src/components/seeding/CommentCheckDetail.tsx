import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
};

interface CommentCheckDetailProps {
  post: Post;
}

export const CommentCheckDetail = ({ post }: CommentCheckDetailProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'not_visible'>('all');

  useEffect(() => {
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

    fetchComments();
  }, [post.id]);

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      if (statusFilter !== 'all' && comment.status !== statusFilter) {
        return false;
      }
      if (searchTerm && !comment.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [comments, searchTerm, statusFilter]);

  return (
    <Card className="w-full h-full shadow-none border-none flex flex-col">
      <CardHeader>
        <CardTitle className="text-2xl">{post.name}</CardTitle>
        {post.links && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
            <LinkIcon className="h-4 w-4" />
            <a href={post.links} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
              {post.links}
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm comment..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="visible">Đã hiện</SelectItem>
                <SelectItem value="not_visible">Chưa hiện</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>
        <div className="border rounded-lg overflow-auto flex-1">
          <Table>
            <TableHeader>
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
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredComments.length > 0 ? (
                filteredComments.map((comment, index) => (
                  <TableRow key={comment.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-xs break-words">{comment.content}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        comment.status === 'visible' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      )}>
                        {comment.status === 'visible' ? 'Đã hiện' : 'Chưa hiện'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p><strong>Account:</strong> {comment.account_name || 'N/A'}</p>
                        <p className="flex items-center gap-1">
                          <strong>Link:</strong> 
                          {comment.comment_link ? (
                            <a href={comment.comment_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              <LinkIcon className="h-3 w-3" />
                            </a>
                          ) : 'N/A'}
                        </p>
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
                <TableRow><TableCell colSpan={5} className="text-center h-24">Không có comment nào.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};