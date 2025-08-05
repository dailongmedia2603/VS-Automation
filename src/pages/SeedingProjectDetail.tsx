import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MessageSquare, FileCheck2, ChevronRight, ArrowLeft, Edit, Trash2, Loader2, Check, CheckCircle, UploadCloud, PlayCircle, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CommentCheckDetail } from '@/components/seeding/CommentCheckDetail';
import { PostApprovalDetail } from '@/components/seeding/PostApprovalDetail';
import { ImportPostsDialog } from '@/components/seeding/ImportPostsDialog';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type Project = {
  id: number;
  name: string;
};

type Post = {
  id: number;
  name: string;
  links: string | null;
  content: string | null;
  status: 'checking' | 'completed';
  type: 'comment_check' | 'post_approval';
  is_active: boolean;
  check_frequency: string | null;
  last_checked_at: string | null;
  visible_count: number;
  total_count: number;
};

type SeedingTask = {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_current: number;
  progress_total: number;
  current_post_id: number | null;
  error_message: string | null;
};

const initialNewPostState = {
  name: '',
  type: 'comment_check' as 'comment_check' | 'post_approval',
  links: '',
  comments: '',
  content: '',
  check_frequency: '1_hour',
  is_active: true,
};

const SeedingProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [commentCheckPosts, setCommentCheckPosts] = useState<Post[]>([]);
  const [postApprovalPosts, setPostApprovalPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<SeedingTask | null>(null);

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPostData, setNewPostData] = useState(initialNewPostState);
  const [isSaving, setIsSaving] = useState(false);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // State for auto-check settings
  const [autoCheckActive, setAutoCheckActive] = useState(false);
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('hour');

  const allPosts = useMemo(() => [...commentCheckPosts, ...postApprovalPosts], [commentCheckPosts, postApprovalPosts]);
  const currentPostName = useMemo(() => {
    if (activeTask?.current_post_id) {
      const post = allPosts.find(p => p.id === activeTask.current_post_id);
      return post?.name;
    }
    return null;
  }, [activeTask?.current_post_id, allPosts]);

  const runInitialCheck = async (post: Post) => {
    if (!post.is_active) return;

    const toastId = showLoading(`Bắt đầu quét tự động lần đầu cho "${post.name}"...`);

    try {
        if (post.type === 'comment_check') {
            if (!post.links) throw new Error("Bài viết thiếu ID để kiểm tra.");
            
            const { data: fetchData, error: fetchError } = await supabase.functions.invoke('get-fb-comments', { body: { fbPostId: post.links } });
            if (fetchError || (fetchData && fetchData.error)) throw new Error(fetchError?.message || fetchData?.error);

            const { data: processData, error: processError } = await supabase.functions.invoke('process-and-store-comments', { body: { rawResponse: fetchData.rawResponse, internalPostId: post.id } });
            if (processError || (processData && processData.error)) throw new Error(processError?.message || processData?.error);

            const { data: compareResult, error: compareError } = await supabase.functions.invoke('compare-and-update-comments', { body: { postId: post.id } });
            if (compareError || (compareResult && compareResult.error)) throw new Error(compareError?.message || compareResult?.error);
            
            dismissToast(toastId);
            showSuccess(`Quét lần đầu hoàn tất! Tìm thấy ${compareResult.found}/${compareResult.total} bình luận.`);

        } else if (post.type === 'post_approval') {
            const timeCheckString = `&since=${subDays(new Date(), 5).toISOString()}&until=${new Date().toISOString()}`;
            
            const { data: fetchData, error: fetchError } = await supabase.functions.invoke('get-fb-duyetpost', { body: { postId: post.id, timeCheckString } });
            if (fetchError || (fetchData && fetchData.error)) throw new Error(fetchError?.message || fetchData?.error);

            const { data: processData, error: processError } = await supabase.functions.invoke('process-and-store-duyetpost', { body: { allPosts: fetchData.allPosts, internalPostId: post.id } });
            if (processError || (processData && processData.error)) throw new Error(processError?.message || processData?.error);

            const { data: compareResult, error: compareError } = await supabase.functions.invoke('compare-and-update-duyetpost', { body: { postId: post.id } });
            if (compareError || (compareResult && compareResult.error)) throw new Error(compareError?.message || compareResult?.error);

            dismissToast(toastId);
            showSuccess(`Quét lần đầu hoàn tất! Duyệt thành công ${compareResult.approved}/${compareResult.total} group.`);
        }
    } catch (err: any) {
        if (toastId) dismissToast(toastId);
        showError(`Quét tự động lần đầu thất bại: ${err.message}`);
    }
  };

  useEffect(() => {
    if (selectedPost) {
      setAutoCheckActive(selectedPost.is_active);
      const [value, unit] = selectedPost.check_frequency?.split('_') || ['1', 'hour'];
      setFrequencyValue(value);
      setFrequencyUnit(unit);
    }
  }, [selectedPost]);

  const handleSaveAutoCheckSettings = async () => {
    if (!selectedPost) return;
    const check_frequency = `${frequencyValue}_${frequencyUnit}`;
    const toastId = showLoading("Đang lưu cài đặt...");
    const { error } = await supabase
      .from('seeding_posts')
      .update({ is_active: autoCheckActive, check_frequency })
      .eq('id', selectedPost.id);
    
    dismissToast(toastId);
    if (error) {
      showError("Lưu cài đặt thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu cài đặt tự động!");
      fetchProjectData();
    }
  };

  const fetchProjectData = async (isInitialLoad = false) => {
    if (!projectId) return;
    if (isInitialLoad) setIsLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('seeding_projects').select('id, name').eq('id', projectId).single();
      if (projectError) throw projectError;
      setProject(projectData);

      const { data: postsData, error: postsError } = await supabase
        .rpc('get_posts_with_stats_by_project', { p_project_id: projectId });
      if (postsError) throw postsError;
      
      const allPosts = (postsData as Post[]) || [];
      setCommentCheckPosts(allPosts.filter(p => p.type === 'comment_check'));
      setPostApprovalPosts(allPosts.filter(p => p.type === 'post_approval'));

      if (selectedPost) {
        const updatedSelectedPost = allPosts.find(p => p.id === selectedPost.id);
        if (updatedSelectedPost) setSelectedPost(updatedSelectedPost);
      }

    } catch (error: any) {
      showError("Không thể tải chi tiết dự án: " + error.message);
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData(true);
  }, [projectId]);

  useEffect(() => {
    const selectedPostId = location.state?.selectedPostId;
    if (selectedPostId && (commentCheckPosts.length > 0 || postApprovalPosts.length > 0)) {
      const allPosts = [...commentCheckPosts, ...postApprovalPosts];
      const postToSelect = allPosts.find(p => p.id === selectedPostId);
      if (postToSelect) {
        setSelectedPost(postToSelect);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, commentCheckPosts, postApprovalPosts]);

  useEffect(() => {
    if (!projectId) return;

    const fetchActiveTask = async () => {
      const { data, error } = await supabase
        .from('seeding_tasks')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['pending', 'running', 'failed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching active task:", error);
      }
      
      if (data) {
        setActiveTask(data);
        if (data.status === 'completed' || data.status === 'cancelled') {
          setActiveTask(null);
        }
      } else {
        setActiveTask(null);
      }
    };

    fetchActiveTask();

    const interval = setInterval(() => {
      if (activeTask && (activeTask.status === 'pending' || activeTask.status === 'running')) {
        fetchActiveTask();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, activeTask]);

  useEffect(() => {
    if (activeTask && (activeTask.status === 'completed' || activeTask.status === 'cancelled')) {
      showSuccess("Tác vụ đã hoàn tất!");
      fetchProjectData();
      setActiveTask(null);
    }
  }, [activeTask]);

  const handleSaveName = async () => {
    if (!editingPostId) return;
    const originalPost = [...commentCheckPosts, ...postApprovalPosts].find(p => p.id === editingPostId);
    if (!originalPost || originalPost.name === editingName.trim()) {
      setEditingPostId(null);
      return;
    }

    const { error } = await supabase.from('seeding_posts').update({ name: editingName.trim() }).eq('id', editingPostId);
    if (error) showError("Cập nhật tên thất bại: " + error.message);
    else {
      showSuccess("Đã cập nhật tên post!");
      fetchProjectData();
    }
    setEditingPostId(null);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const { error } = await supabase.from('seeding_posts').delete().eq('id', postToDelete.id);
    if (error) showError("Xóa post thất bại: " + error.message);
    else {
      showSuccess("Đã xóa post thành công!");
      if (selectedPost?.id === postToDelete.id) setSelectedPost(null);
      fetchProjectData();
    }
    setIsDeleteDialogOpen(false);
  };

  const handleAddPost = async () => {
    if (!newPostData.name.trim() || !projectId) {
      showError("Tên post không được để trống.");
      return;
    }
    setIsSaving(true);
    const toastId = showLoading("Đang tạo post...");

    try {
      const postToInsert = {
        project_id: projectId,
        name: newPostData.name,
        type: newPostData.type,
        is_active: newPostData.is_active,
        links: newPostData.links,
        content: newPostData.content,
        check_frequency: `${newPostData.check_frequency.split('_')[0]}_${newPostData.check_frequency.split('_')[1] || 'hour'}`,
      };

      const { data: newPost, error: postError } = await supabase
        .from('seeding_posts')
        .insert(postToInsert)
        .select()
        .single();

      if (postError) throw postError;

      if (newPostData.type === 'comment_check' && newPostData.comments.trim()) {
        const commentsToInsert = newPostData.comments.split('\n').filter(line => line.trim() !== '').map(content => ({ post_id: newPost.id, content: content.trim() }));
        if (commentsToInsert.length > 0) {
          const { error: commentsError } = await supabase.from('seeding_comments').insert(commentsToInsert);
          if (commentsError) throw commentsError;
        }
      }

      if (newPostData.type === 'post_approval' && newPostData.links.trim()) {
        const groupsToInsert = newPostData.links.split('\n').map(line => line.trim()).filter(line => line !== '').map(groupId => ({ post_id: newPost.id, group_id: groupId }));
        if (groupsToInsert.length > 0) {
          const { error: groupsError } = await supabase.from('seeding_groups').insert(groupsToInsert);
          if (groupsError) throw groupsError;
        }
      }
      
      dismissToast(toastId);
      showSuccess("Đã thêm post thành công!");

      if (newPostData.is_active && newPost) {
        await runInitialCheck(newPost as Post);
      }
      
      setIsAddDialogOpen(false);
      setNewPostData(initialNewPostState);
      await fetchProjectData();

    } catch (error: any) {
      if (toastId) dismissToast(toastId);
      showError("Thêm post thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckAll = async () => {
    if (!projectId) return;
    const toastId = showLoading("Đang tạo tác vụ quét...");
    try {
      // Step 1: Create the seeding task
      const { data: taskData, error: createTaskError } = await supabase.functions.invoke('create-seeding-task', {
        body: { projectId }
      });

      if (createTaskError) {
        let errorMessage = createTaskError.message;
        try {
            // Supabase Edge Functions often nest the real error message
            const contextError = await createTaskError.context.json();
            if (contextError.error) errorMessage = contextError.error;
        } catch (e) { /* ignore parsing error */ }
        throw new Error(errorMessage);
      }
      
      // Case where the function returns a message (e.g., no posts to check)
      if (taskData.message) {
        dismissToast(toastId);
        showSuccess(taskData.message);
        return;
      }

      // A task was successfully created
      setActiveTask(taskData);
      dismissToast(toastId);
      showSuccess("Đã tạo tác vụ! Bắt đầu xử lý bài viết đầu tiên...");

      // Step 2: Immediately trigger the first run of the processor function.
      // This is a "fire and forget" call to kickstart the process instantly.
      // The cron job will handle subsequent runs.
      supabase.functions.invoke('process-seeding-tasks').then(({ error: processError }) => {
        if (processError) {
          // This is not a critical failure for the user, as the cron job will pick it up.
          // We can just log it for debugging purposes.
          console.warn("Initial task processing trigger failed, but the cron job will take over.", processError);
        }
      });

    } catch (error: any) {
      if (toastId) dismissToast(toastId);
      showError(`Không thể bắt đầu: ${error.message}`);
    }
  };

  const handleCancelTask = async () => {
    if (!activeTask) return;
    const { error: cancelError } = await supabase.functions.invoke('cancel-seeding-task', {
      body: { taskId: activeTask.id }
    });
    if (cancelError) {
      showError(`Không thể dừng: ${cancelError.message}`);
    } else {
      showSuccess("Đã gửi yêu cầu dừng tác vụ.");
      setActiveTask(prev => prev ? { ...prev, status: 'cancelled' } : null);
    }
  };

  const commentCount = newPostData.comments.split('\n').filter(line => line.trim() !== '').length;

  const PostList = ({ posts, onSelectPost, activeTask }: { posts: Post[], onSelectPost: (post: Post) => void, activeTask: SeedingTask | null }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (editingPostId && inputRef.current) {
        inputRef.current.focus();
      }
    }, [editingPostId]);

    return (
      <div className="flex flex-col gap-1 pl-2">
        {posts.map((post) => {
          const isRunningInTask = activeTask && (activeTask.status === 'running' || activeTask.status === 'pending') && post.status === 'checking';
          const isCurrentlyProcessing = isRunningInTask && activeTask.current_post_id === post.id;

          return (
            <div
              key={post.id}
              onClick={() => editingPostId !== post.id && onSelectPost(post)}
              className={cn(
                "group w-full text-left p-2 rounded-md text-sm flex items-center justify-between cursor-pointer",
                post.status === 'completed' 
                  ? "bg-green-50 text-green-800 hover:bg-green-100" 
                  : selectedPost?.id === post.id && editingPostId !== post.id 
                    ? "bg-blue-100 text-blue-700 font-semibold hover:bg-blue-100" 
                    : "hover:bg-slate-100"
              )}
            >
              {editingPostId === post.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    ref={inputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="h-7 text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2 truncate flex-1">
                    {isCurrentlyProcessing ? (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                    ) : post.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : isRunningInTask ? (
                      <div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"></div>
                      </div>
                    ) : null}
                    <span className="truncate">{post.name}</span>
                  </span>
                  <div className="flex items-center flex-shrink-0">
                    {post.total_count > 0 && (
                      <Badge variant="outline" className="mr-2 font-mono text-xs">
                        {post.visible_count}/{post.total_count}
                      </Badge>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingPostId(post.id); setEditingName(post.name); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setPostToDelete(post); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-slate-400", selectedPost?.id === post.id && "text-blue-700")} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><Skeleton className="h-full w-full" /></main>;
  if (!project) return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><h1>Không tìm thấy dự án</h1></main>;

  return (
    <main className="flex-1 flex flex-col p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/check-seeding"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTask && activeTask.status === 'failed' ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Quét thất bại - Xem lỗi
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Chi tiết lỗi</AlertDialogTitle>
                  <AlertDialogDescription className="font-mono bg-slate-100 p-4 rounded-md text-slate-800 break-all">
                    {activeTask.error_message || "Đã xảy ra lỗi không xác định."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setActiveTask(null)}>Đã hiểu</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : activeTask && (activeTask.status === 'running' || activeTask.status === 'pending') ? (
            <div className="flex items-center gap-2 w-64">
              <div className="flex-1">
                <Progress value={(activeTask.progress_current / activeTask.progress_total) * 100} className="h-2" />
                <p className="text-xs text-center mt-1 text-slate-500 truncate" title={currentPostName ? `Đang check: ${currentPostName}` : `Đang quét...`}>
                  {currentPostName 
                    ? `Đang check: ${currentPostName}` 
                    : `Đang quét...`} ({activeTask.progress_current}/{activeTask.progress_total})
                </p>
              </div>
              <Button variant="destructive" size="icon" onClick={handleCancelTask}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleCheckAll}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Check tất cả
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => { setNewPostData(initialNewPostState); setIsAddDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" />Thêm Post
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden">
        <ResizablePanel defaultSize={20} minSize={20} maxSize={40}>
          <div className="flex flex-col h-full p-4 overflow-y-auto">
            <Accordion type="multiple" defaultValue={['check-comment', 'approve-post']} className="w-full">
              <AccordionItem value="check-comment">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-600" />Check Comment ({commentCheckPosts.length})</div>
                </AccordionTrigger>
                <AccordionContent><PostList posts={commentCheckPosts} onSelectPost={setSelectedPost} activeTask={activeTask} /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="approve-post">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-green-600" />Check duyệt post ({postApprovalPosts.length})</div>
                </AccordionTrigger>
                <AccordionContent><PostList posts={postApprovalPosts} onSelectPost={setSelectedPost} activeTask={activeTask} /></AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          <div className={cn(
            "h-full p-6",
            selectedPost ? "overflow-y-auto" : "flex items-center justify-center"
          )}>
            {selectedPost && project ? (
              <div className="w-full flex flex-col gap-6">
                {selectedPost.type === 'comment_check' ? (
                  <CommentCheckDetail
                    project={project}
                    post={selectedPost}
                    autoCheckActive={autoCheckActive}
                    onAutoCheckChange={setAutoCheckActive}
                    frequencyValue={frequencyValue}
                    onFrequencyValueChange={setFrequencyValue}
                    frequencyUnit={frequencyUnit}
                    onFrequencyUnitChange={setFrequencyUnit}
                    onSaveSettings={handleSaveAutoCheckSettings}
                    onCheckComplete={() => fetchProjectData()}
                  />
                ) : selectedPost.type === 'post_approval' ? (
                  <PostApprovalDetail
                    project={project}
                    post={selectedPost}
                    autoCheckActive={autoCheckActive}
                    onAutoCheckChange={setAutoCheckActive}
                    frequencyValue={frequencyValue}
                    onFrequencyValueChange={setFrequencyValue}
                    frequencyUnit={frequencyUnit}
                    onFrequencyUnitChange={setFrequencyUnit}
                    onSaveSettings={handleSaveAutoCheckSettings}
                    onCheckComplete={() => fetchProjectData()}
                  />
                ) : (
                  <div className="flex-1">Loại post không được hỗ trợ.</div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <p className="font-semibold text-lg">Chọn một mục để xem chi tiết</p>
                <p className="text-sm mt-1">Nội dung chi tiết sẽ được hiển thị ở đây.</p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ImportPostsDialog 
        isOpen={isImportDialogOpen} 
        onOpenChange={setIsImportDialogOpen}
        projectId={projectId!}
        onSuccess={(importedPosts) => {
          setIsImportDialogOpen(false);
          (async () => {
            for (const post of importedPosts) {
              await runInitialCheck(post);
            }
            await fetchProjectData();
          })();
        }}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Thêm Post Mới</DialogTitle>
            <DialogDescription>Điền thông tin chi tiết cho bài đăng mới của bạn.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="post-name">Tên Post</Label>
              <Input id="post-name" value={newPostData.name} onChange={(e) => setNewPostData(d => ({...d, name: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-type">Loại</Label>
              <Select value={newPostData.type} onValueChange={(v) => setNewPostData(d => ({...d, type: v as any}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment_check">Check Comment</SelectItem>
                  <SelectItem value="post_approval">Check duyệt post</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newPostData.type === 'comment_check' && (
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="post-link">ID bài viết</Label>
                  <Input id="post-link" value={newPostData.links} onChange={(e) => setNewPostData(d => ({...d, links: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="post-comments">Danh sách comment</Label>
                    <span className="text-xs font-medium text-slate-500">Số lượng: {commentCount}</span>
                  </div>
                  <Textarea id="post-comments" value={newPostData.comments} onChange={(e) => setNewPostData(d => ({...d, comments: e.target.value}))} className="min-h-[120px]" placeholder="Comment 1..." />
                </div>
              </div>
            )}

            {newPostData.type === 'post_approval' && (
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="group-links">ID Group (mỗi ID một dòng)</Label>
                  <Textarea id="group-links" placeholder="12345..." value={newPostData.links} onChange={(e) => setNewPostData(d => ({...d, links: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">Nội dung bài viết</Label>
                  <Textarea id="post-content" value={newPostData.content} onChange={(e) => setNewPostData(d => ({...d, content: e.target.value}))} className="min-h-[120px]" />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="is-active" className="font-medium">Kích hoạt tự động check</Label>
              <Switch id="is-active" checked={newPostData.is_active} onCheckedChange={(c) => setNewPostData(d => ({...d, is_active: c}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-lg">Hủy</Button>
            <Button onClick={handleAddPost} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Post "{postToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setPostToDelete(null)}>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
};

export default SeedingProjectDetail;