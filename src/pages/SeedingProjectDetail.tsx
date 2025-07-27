import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MessageSquare, FileCheck2, ChevronRight, ArrowLeft, Edit, Trash2, Loader2, Check, CheckCircle, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CommentCheckDetail } from '@/components/seeding/CommentCheckDetail';
import { ImportPostsDialog } from '@/components/seeding/ImportPostsDialog';

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
  const [project, setProject] = useState<Project | null>(null);
  const [commentCheckPosts, setCommentCheckPosts] = useState<Post[]>([]);
  const [postApprovalPosts, setPostApprovalPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      fetchProjectData(); // Refresh data
    }
  };

  const fetchProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('seeding_projects').select('id, name').eq('id', projectId).single();
      if (projectError) throw projectError;
      setProject(projectData);

      const { data: postsData, error: postsError } = await supabase
        .from('seeding_posts').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
      if (postsError) throw postsError;
      
      const allPosts = postsData || [];
      setCommentCheckPosts(allPosts.filter(p => p.type === 'comment_check'));
      setPostApprovalPosts(allPosts.filter(p => p.type === 'post_approval'));

      // Update selected post with new data if it exists
      if (selectedPost) {
        const updatedSelectedPost = allPosts.find(p => p.id === selectedPost.id);
        if (updatedSelectedPost) {
          setSelectedPost(updatedSelectedPost);
        }
      }

    } catch (error: any) {
      showError("Không thể tải chi tiết dự án: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleSaveName = async () => {
    if (!editingPostId) return;
    const originalPost = [...commentCheckPosts, ...postApprovalPosts].find(p => p.id === editingPostId);
    if (!originalPost || originalPost.name === editingName.trim()) {
      setEditingPostId(null);
      return;
    }

    const { error } = await supabase.from('seeding_posts').update({ name: editingName.trim() }).eq('id', editingPostId);
    if (error) {
      showError("Cập nhật tên thất bại: " + error.message);
    } else {
      showSuccess("Đã cập nhật tên post!");
      fetchProjectData();
    }
    setEditingPostId(null);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const { error } = await supabase.from('seeding_posts').delete().eq('id', postToDelete.id);
    if (error) {
      showError("Xóa post thất bại: " + error.message);
    } else {
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
        content: newPostData.type === 'post_approval' ? newPostData.content : null,
        check_frequency: `${newPostData.check_frequency.split('_')[0]}_${newPostData.check_frequency.split('_')[1] || 'hour'}`,
      };

      const { data: newPost, error: postError } = await supabase
        .from('seeding_posts')
        .insert(postToInsert)
        .select()
        .single();

      if (postError) throw postError;

      if (newPostData.type === 'comment_check' && newPostData.comments.trim()) {
        const commentsToInsert = newPostData.comments
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(content => ({
            post_id: newPost.id,
            content: content.trim(),
          }));
        
        if (commentsToInsert.length > 0) {
          const { error: commentsError } = await supabase
            .from('seeding_comments')
            .insert(commentsToInsert);
          if (commentsError) throw commentsError;
        }
      }
      
      dismissToast(toastId);
      showSuccess("Đã thêm post thành công!");
      setIsAddDialogOpen(false);
      setNewPostData(initialNewPostState);
      fetchProjectData();
    } catch (error: any) {
      dismissToast(toastId);
      showError("Thêm post thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const commentCount = newPostData.comments.split('\n').filter(line => line.trim() !== '').length;

  const PostList = ({ posts, onSelectPost }: { posts: Post[], onSelectPost: (post: Post) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (editingPostId && inputRef.current) {
        inputRef.current.focus();
      }
    }, [editingPostId]);

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
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
              </div>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  {post.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {post.name}
                </span>
                <div className="flex items-center">
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
        ))}
      </div>
    );
  };

  if (isLoading) return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><Skeleton className="h-full w-full" /></main>;
  if (!project) return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><h1>Không tìm thấy dự án</h1></main>;

  return (
    <main className="flex-1 flex flex-col p-6 sm:p-8 bg-slate-50 h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/check-seeding"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
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
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="flex flex-col h-full p-4">
            <Accordion type="multiple" defaultValue={['check-comment', 'approve-post']} className="w-full">
              <AccordionItem value="check-comment">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-600" />Check Comment ({commentCheckPosts.length})</div>
                </AccordionTrigger>
                <AccordionContent><PostList posts={commentCheckPosts} onSelectPost={setSelectedPost} /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="approve-post">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-green-600" />Check duyệt post ({postApprovalPosts.length})</div>
                </AccordionTrigger>
                <AccordionContent><PostList posts={postApprovalPosts} onSelectPost={setSelectedPost} /></AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
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
                    onCheckComplete={fetchProjectData}
                  />
                ) : (
                  <div className="flex-1">Chức năng Check duyệt post đang được phát triển.</div>
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
        projectId={projectId}
        onSuccess={() => {
          setIsImportDialogOpen(false);
          fetchProjectData();
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
                  <Textarea id="post-comments" value={newPostData.comments} onChange={(e) => setNewPostData(d => ({...d, comments: e.target.value}))} className="min-h-[120px]" />
                </div>
              </div>
            )}

            {newPostData.type === 'post_approval' && (
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="group-links">ID Group</Label>
                  <Textarea id="group-links" placeholder="Mỗi ID một hàng" value={newPostData.links} onChange={(e) => setNewPostData(d => ({...d, links: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">Nội dung bài viết</Label>
                  <Textarea id="post-content" value={newPostData.content} onChange={(e) => setNewPostData(d => ({...d, content: e.target.value}))} className="min-h-[120px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check-frequency">Tần suất check</Label>
                  <Select value={newPostData.check_frequency} onValueChange={(v) => setNewPostData(d => ({...d, check_frequency: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_hour">1 giờ / lần</SelectItem>
                      <SelectItem value="2_hour">2 giờ / lần</SelectItem>
                      <SelectItem value="1_day">1 ngày / lần</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="is-active" className="font-medium">Kích hoạt</Label>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Post "{postToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setPostToDelete(null)}>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default SeedingProjectDetail;