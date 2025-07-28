import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bell, MessageSquare, FileCheck2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

type CompletedPost = {
  id: number;
  name: string;
  type: 'comment_check' | 'post_approval';
  project_id: number;
  last_checked_at: string;
  seeding_projects: { name: string } | null;
  is_notification_seen: boolean;
};

const NotificationItem = ({ post, onMarkAsSeen }: { post: CompletedPost, onMarkAsSeen: (postId: number) => void }) => {
  const isCommentCheck = post.type === 'comment_check';
  const Icon = isCommentCheck ? MessageSquare : FileCheck2;

  return (
    <Link 
      to={`/check-seeding/${post.project_id}`} 
      state={{ selectedPostId: post.id }} 
      className="block relative"
      onClick={() => onMarkAsSeen(post.id)}
    >
      <Card className={cn(
        "transition-colors",
        !post.is_notification_seen ? "bg-yellow-50 hover:bg-yellow-100" : "hover:bg-slate-50"
      )}>
        <CardContent className="p-4 flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isCommentCheck ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">{post.name}</p>
              <p className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(post.last_checked_at), { addSuffix: true, locale: vi })}
              </p>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Thuộc dự án: <span className="font-medium">{post.seeding_projects?.name || 'Không rõ'}</span>
            </p>
            <Badge variant="outline" className="mt-2">
              {isCommentCheck ? 'Check Comment' : 'Check Duyệt Post'}
            </Badge>
          </div>
        </CardContent>
      </Card>
      {!post.is_notification_seen && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </Link>
  );
};

const CompletionNotification = () => {
  const [notifications, setNotifications] = useState<CompletedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

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

  useEffect(() => {
    const channel = supabase
      .channel('completed-posts-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seeding_posts',
          filter: 'status=eq.completed',
        },
        async (payload) => {
          if (payload.old.status !== 'completed' && payload.new.status === 'completed') {
            const { data: projectData, error } = await supabase
              .from('seeding_projects')
              .select('name')
              .eq('id', payload.new.project_id)
              .single();
            
            if (!error && projectData) {
              const newNotification = {
                ...payload.new,
                seeding_projects: { name: projectData.name }
              } as CompletedPost;
              
              setNotifications(prev => [newNotification, ...prev]);
              audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsSeen = async (postId: number) => {
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
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(post => <NotificationItem key={post.id} post={post} onMarkAsSeen={handleMarkAsSeen} />)}
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
    </main>
  );
};

export default CompletionNotification;