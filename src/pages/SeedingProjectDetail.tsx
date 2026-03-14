import { useState, useRef, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useSeedingProject, useSeedingPosts } from '@/hooks/useSeedingProjects';
import { seedingService, SeedingPostExtended } from '@/api/seeding';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MessageSquare, FileCheck2, ChevronRight, ArrowLeft, Edit, Trash2, Loader2, Check, CheckCircle, UploadCloud, PlayCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { CommentCheckDetail } from '@/components/seeding/CommentCheckDetail';
import { PostApprovalDetail } from '@/components/seeding/PostApprovalDetail';
import { ImportPostsDialog } from '@/components/seeding/ImportPostsDialog';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryCache';

type Post = SeedingPostExtended;

const initialNewPostState = {
  name: '',
  type: 'comment_check' as 'comment_check' | 'post_approval',
  links: '',
  comments: '',
  content: '',
};

const SeedingProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();

  // React Query - data loads instantly from cache
  const { data: project, isLoading: isLoadingProject } = useSeedingProject(Number(projectId));
  const { data: postsData = [], isLoading: isLoadingPosts, refetch: refetchPosts } = useSeedingPosts(Number(projectId));

  const isLoading = isLoadingProject || isLoadingPosts;

  // Transform posts data
  const posts: Post[] = useMemo(() => {
    return postsData.map((p: any) => ({
      id: p.id,
      name: p.name || p.post_content?.substring(0, 50) || `Post #${p.id}`,
      links: p.links || p.fb_post_url,
      content: p.content || p.post_content,
      status: p.status || 'checking',
      type: p.type || 'comment_check',
      visible_count: p.visible_count || p.current_comments || 0,
      total_count: p.total_count || p.target_comments || 0,
      schedule: p.schedule,
    }));
  }, [postsData]);

  const commentCheckPosts = useMemo(() => posts.filter(p => p.type === 'comment_check'), [posts]);
  const postApprovalPosts = useMemo(() => posts.filter(p => p.type === 'post_approval'), [posts]);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPostData, setNewPostData] = useState(initialNewPostState);
  const [isSaving, setIsSaving] = useState(false);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Handle location state for selected post
  useState(() => {
    const selectedPostId = location.state?.selectedPostId;
    if (selectedPostId && posts.length > 0) {
      const postToSelect = posts.find(p => p.id === selectedPostId);
      if (postToSelect) {
        setSelectedPost(postToSelect);
        window.history.replaceState({}, document.title);
      }
    }
  });

  const handleSaveName = async () => {
    if (!editingPostId) return;
    const originalPost = posts.find(p => p.id === editingPostId);
    if (!originalPost || originalPost.name === editingName.trim()) {
      setEditingPostId(null);
      return;
    }

    try {
      await seedingService.updatePostName(editingPostId, editingName.trim());
      showSuccess("Đã cập nhật tên post!");
      refetchPosts();
    } catch (error: any) {
      showError("Cập nhật tên thất bại: " + error.message);
    }
    setEditingPostId(null);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      await seedingService.deletePost(postToDelete.id);
      showSuccess("Đã xóa post thành công!");
      if (selectedPost?.id === postToDelete.id) setSelectedPost(null);
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: [queryKeys.seedingProjects] });
    } catch (error: any) {
      showError("Xóa post thất bại: " + error.message);
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
      await seedingService.createPostExtended(Number(projectId), {
        name: newPostData.name,
        type: newPostData.type,
        links: newPostData.links || undefined,
        content: newPostData.content || undefined,
      });

      dismissToast(toastId);
      showSuccess("Đã thêm post thành công!");

      setIsAddDialogOpen(false);
      setNewPostData(initialNewPostState);
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: [queryKeys.seedingProjects] });

    } catch (error: any) {
      dismissToast(toastId);
      showError("Thêm post thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckAll = async () => {
    if (!projectId) return;
    const toastId = showLoading("Đang tạo tác vụ quét...");
    try {
      await seedingService.checkAllPosts();
      dismissToast(toastId);
      showSuccess("Đã bắt đầu quét tất cả posts!");
      refetchPosts();
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Không thể bắt đầu: ${error.message}`);
    }
  };

  const handleRecheckPost = async (postId: number) => {
    try {
      await seedingService.updatePostStatus(postId, 'checking');
      showSuccess("Đã đưa bài viết vào hàng đợi để check lại.");
      refetchPosts();
    } catch (error: any) {
      showError("Không thể đưa vào hàng đợi: " + error.message);
    }
  };

  const PostList = ({ posts, onSelectPost }: { posts: Post[], onSelectPost: (post: Post) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="flex flex-col gap-1 pl-2">
        {posts.map((post) => (
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
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
              </div>
            ) : (
              <>
                <span className="flex items-center gap-2 truncate flex-1">
                  {post.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                  <span className="truncate">{post.name}</span>
                </span>
                <div className="flex items-center flex-shrink-0">
                  {post.total_count > 0 && (
                    <Badge variant="outline" className="mr-2 font-mono text-xs">
                      {post.visible_count}/{post.total_count}
                    </Badge>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    {post.status === 'completed' && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Check lại" onClick={(e) => { e.stopPropagation(); handleRecheckPost(post.id); }}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
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
        ))}
      </div>
    );
  };

  if (isLoading) return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><Skeleton className="h-full w-full" /></main>;
  if (!project) return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><h1>Không tìm thấy dự án</h1></main>;

  return (
    <main className="flex-1 flex flex-col p-6 sm:p-8 bg-slate-50 min-h-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/check-seeding"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCheckAll}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Check tất cả
          </Button>
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
                <AccordionTrigger className="text-base font-semibold hover:no-underline"><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-600" />Check Comment ({commentCheckPosts.length})</div></AccordionTrigger>
                <AccordionContent><PostList posts={commentCheckPosts} onSelectPost={setSelectedPost} /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="approve-post">
                <AccordionTrigger className="text-base font-semibold hover:no-underline"><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-green-600" />Check duyệt post ({postApprovalPosts.length})</div></AccordionTrigger>
                <AccordionContent><PostList posts={postApprovalPosts} onSelectPost={setSelectedPost} /></AccordionContent>
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
                    onCheckComplete={() => refetchPosts()}
                  />
                ) : selectedPost.type === 'post_approval' ? (
                  <PostApprovalDetail
                    project={project}
                    post={selectedPost}
                    onCheckComplete={() => refetchPosts()}
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
        onSuccess={() => {
          setIsImportDialogOpen(false);
          refetchPosts();
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
              <Input id="post-name" value={newPostData.name} onChange={(e) => setNewPostData(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-type">Loại</Label>
              <Select value={newPostData.type} onValueChange={(v) => setNewPostData(d => ({ ...d, type: v as any }))}>
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
                  <Input id="post-link" value={newPostData.links} onChange={(e) => setNewPostData(d => ({ ...d, links: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-comments">Danh sách comment</Label>
                  <Textarea id="post-comments" value={newPostData.comments} onChange={(e) => setNewPostData(d => ({ ...d, comments: e.target.value }))} className="min-h-[120px]" placeholder="Comment 1..." />
                </div>
              </div>
            )}

            {newPostData.type === 'post_approval' && (
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="group-links">ID Group (mỗi ID một dòng)</Label>
                  <Textarea id="group-links" placeholder="12345..." value={newPostData.links} onChange={(e) => setNewPostData(d => ({ ...d, links: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">Nội dung bài viết</Label>
                  <Textarea id="post-content" value={newPostData.content} onChange={(e) => setNewPostData(d => ({ ...d, content: e.target.value }))} className="min-h-[120px]" />
                </div>
              </div>
            )}
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