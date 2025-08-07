import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Bell, MessageSquare, FileCheck2, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useNotification } from '@/contexts/NotificationContext';

type CompletedPost = {
  id: number;
  name: string;
  type: 'comment_check' | 'post_approval';
  project_id: number;
  last_checked_at: string | null;
  seeding_projects: { name: string } | null;
  is_notification_seen: boolean;
};

const NotificationItem = ({ post, onMarkAsSeen, isSelected, onSelect }: { post: CompletedPost, onMarkAsSeen: (postId: number) => void, isSelected: boolean, onSelect: (postId: number) => void }) => {
  const isCommentCheck = post.type === 'comment_check';
  const Icon = isCommentCheck ? MessageSquare : FileCheck2;

  return (
    <div className="relative">
      <Card className={cn(
        "transition-colors",
        !post.is_notification_seen ? "bg-yellow-50 hover:bg-yellow-100" : "hover:bg-slate-50",
        isSelected && "ring-2 ring-blue-500 bg-blue-50"
      )}>
        <CardContent className="p-4 flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(post.id)}
            className="mt-1"
          />
          <Link 
            to={`/check-seeding/${post.project_id}`} 
            state={{ selectedPostId: post.id }} 
            className="flex-1 flex items-start gap-4"
            onClick={() => onMarkAsSeen(post.id)}
          >
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isCommentCheck ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{post.name}</p>
                <p className="text-xs text-slate-500">
                  {post.last_checked_at ? formatDistanceToNow(new Date(post.last_checked_at), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                </p>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Thuộc dự án: <span className="font-medium">{post.seeding_projects?.name || 'Không rõ'}</span>
              </p>
              <Badge variant="outline" className="mt-2">
                {isCommentCheck ? 'Check Comment' : 'Check Duyệt Post'}
              </Badge>
            </div>
          </Link>
        </CardContent>
      </Card>
      {!post.is_notification_seen && !isSelected && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </div>
  );
};

const CompletionNotification = () => {
  const [notifications, setNotifications] = useState<CompletedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingAsSeen, setIsMarkingAsSeen] = useState(false);
  const { decrementUnreadCount } = useNotification();

  const fetchCompletedPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('seeding_posts')
      .select(`
        id, name, type, project_id, last_checked_at, is_notification_seen,
        seeding_projects ( name )
      `)
      .eq('status', 'completed')
      .order('last_checked_at', { ascending: false });

    if (error) {
      showError("Không thể tải thông báo: " + error.message);
    } else {
      const formattedData = data?.map(p => ({
        ...p,
        seeding_projects: Array.isArray(p.seeding_projects) ? p.seeding_projects[0] || null : p.seeding_projects,
      })) || [];
      setNotifications(formattedData as CompletedPost[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCompletedPosts();
  }, []);

  const handleMarkAsSeen = async (postId: number) => {
    const notification = notifications.find(n => n.id === postId);
    if (notification && !notification.is_notification_seen) {
      decrementUnreadCount();
    }

    setNotifications(prev => 
      prev.map(n => n.id === postId ? { ...n, is_notification_seen: true } : n)
    );

    const { error } = await supabase
      .from('seeding_posts')
      .update({ is_notification_seen: true })
      .eq('id', postId);
    
    if (error) {
      showError("Không thể đánh dấu đã xem: " + error.message);
      setNotifications(prev => 
        prev.map(n => n.id === postId ? { ...n, is_notification_seen: false } : n)
      );
    }
  };

  const handleSelect = (postId: number) => {
    setSelectedIds(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleMarkSelectedAsSeen = async () => {
    if (selectedIds.length === 0) return;

    setIsMarkingAsSeen(true);
    const toastId = showLoading(`Đang đánh dấu ${selectedIds.length} thông báo...`);

    const unreadSelectedCount = notifications.filter(n => selectedIds.includes(n.id) && !n.is_notification_seen).length;

    try {
        const { error } = await supabase
            .from('seeding_posts')
            .update({ is_notification_seen: true })
            .in('id', selectedIds);

        if (error) throw error;

        setNotifications(prev => 
            prev.map(n => selectedIds.includes(n.id) ? { ...n, is_notification_seen: true } : n)
        );
        
        for (let i = 0; i < unreadSelectedCount; i++) {
            decrementUnreadCount();
        }

        setSelectedIds([]);
        
        dismissToast(toastId);
        showSuccess("Đã đánh dấu đã xem thành công!");
    } catch (error: any) {
        dismissToast(toastId);
        showError("Đánh dấu đã xem thất bại: " + error.message);
    } finally {
        setIsMarkingAsSeen(false);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    const toastId = showLoading(`Đang xóa ${selectedIds.length} thông báo...`);
    const { error } = await supabase
      .from('seeding_posts')
      .delete()
      .in('id', selectedIds);
    
    dismissToast(toastId);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa thành công!");
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
    }
    setIsDeleteAlertOpen(false);
    setIsDeleting(false);
  };

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/check-seeding">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Thông báo hoàn thành</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Danh sách các bài viết seeding đã hoàn thành, cập nhật theo thời gian thực.
          </p>
        </div>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="select-all"
                checked={selectedIds.length > 0 && selectedIds.length === notifications.length && notifications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                {selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : 'Chọn tất cả'}
              </label>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleMarkSelectedAsSeen} disabled={isMarkingAsSeen}>
                  {isMarkingAsSeen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Đánh dấu đã xem
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(post => (
                <NotificationItem 
                  key={post.id} 
                  post={post} 
                  onMarkAsSeen={handleMarkAsSeen}
                  isSelected={selectedIds.includes(post.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
              <Bell className="h-12 w-12 mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold">Chưa có thông báo nào</h3>
              <p className="text-sm mt-1">Các bài viết hoàn thành sẽ xuất hiện ở đây.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn {selectedIds.length} thông báo đã chọn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default CompletionNotification;