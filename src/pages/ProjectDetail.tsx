import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, FileText, PlusCircle, UploadCloud, ChevronRight, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { ProjectDocumentsManager } from '@/components/content-ai/ProjectDocumentsManager';
import { CommentGenerationDetail } from '@/components/content-ai/CommentGenerationDetail';

type Project = {
  id: number;
  name: string;
};

type ProjectItem = {
  id: number;
  name: string;
  type: 'article' | 'comment';
  content: string | null;
  config: any;
};

type PromptLibrary = {
  id: number;
  name: string;
};

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [selectedView, setSelectedView] = useState<'documents' | ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', type: 'article' as 'article' | 'comment' });
  const [isSaving, setIsSaving] = useState(false);
  const [promptLibraries, setPromptLibraries] = useState<PromptLibrary[]>([]);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const projectPromise = supabase.from('content_ai_ds_du_an').select('id, name').eq('id', projectId).single();
      const itemsPromise = supabase.from('content_ai_items').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      const librariesPromise = supabase.from('prompt_libraries').select('id, name');
      
      const [
        { data: projectData, error: projectError }, 
        { data: itemsData, error: itemsError },
        { data: librariesData, error: librariesError }
      ] = await Promise.all([projectPromise, itemsPromise, librariesPromise]);

      if (projectError) throw projectError;
      if (itemsError) throw itemsError;
      if (librariesError) throw librariesError;

      setProject(projectData);
      setItems(itemsData || []);
      setPromptLibraries(librariesData || []);
    } catch (error: any) {
      showError("Không thể tải dữ liệu dự án: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !projectId) {
      showError("Tên không được để trống.");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('content_ai_items').insert({ ...newItem, project_id: projectId });
      if (error) throw error;
      showSuccess("Đã thêm mục mới thành công!");
      setIsAddDialogOpen(false);
      setNewItem({ name: '', type: 'article' });
      fetchProjectData();
    } catch (error: any) {
      showError("Thêm thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const articles = items.filter(item => item.type === 'article');
  const comments = items.filter(item => item.type === 'comment');

  if (isLoading) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <h1 className="text-3xl font-bold">Không tìm thấy dự án</h1>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col h-[calc(100vh-4rem)] p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/content-ai">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white"><UploadCloud className="mr-2 h-4 w-4" />Import</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Thêm Post</Button>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="flex flex-col h-full p-4">
              <div className="p-2">
                <button
                  onClick={() => setSelectedView('documents')}
                  className={cn(
                    "w-full text-left p-3 rounded-lg text-base font-semibold flex items-center gap-3 transition-colors",
                    selectedView === 'documents'
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <BookOpen className="h-5 w-5" />
                  Tài liệu
                </button>
              </div>
              <Accordion type="multiple" defaultValue={['articles', 'comments']} className="w-full">
                <AccordionItem value="articles">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /><span>Viết bài viết ({articles.length})</span></div></AccordionTrigger>
                  <AccordionContent><div className="flex flex-col gap-1 pl-2">{articles.map(item => (<button key={item.id} onClick={() => setSelectedView(item)} className={cn("w-full text-left p-2 rounded-md text-sm flex items-center justify-between hover:bg-slate-100", selectedView && typeof selectedView === 'object' && selectedView.id === item.id && "bg-blue-100 text-blue-700 font-semibold")}><span>{item.name}</span><ChevronRight className="h-4 w-4 text-slate-400" /></button>))}</div></AccordionContent>
                </AccordionItem>
                <AccordionItem value="comments">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline"><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-600" /><span>Viết comment ({comments.length})</span></div></AccordionTrigger>
                  <AccordionContent><div className="flex flex-col gap-1 pl-2">{comments.map(item => (<button key={item.id} onClick={() => setSelectedView(item)} className={cn("w-full text-left p-2 rounded-md text-sm flex items-center justify-between hover:bg-slate-100", selectedView && typeof selectedView === 'object' && selectedView.id === item.id && "bg-blue-100 text-blue-700 font-semibold")}><span>{item.name}</span><ChevronRight className="h-4 w-4 text-slate-400" /></button>))}</div></AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <div className="h-full p-6 overflow-y-auto">
              {selectedView === 'documents' && projectId && <ProjectDocumentsManager projectId={projectId} />}
              
              {selectedView && typeof selectedView === 'object' && selectedView.type === 'comment' && (
                <CommentGenerationDetail project={project} item={selectedView} promptLibraries={promptLibraries} onSave={fetchProjectData} />
              )}

              {selectedView && typeof selectedView === 'object' && selectedView.type === 'article' && (
                <div>
                  <h2 className="text-xl font-bold">{selectedView.name}</h2>
                  <p className="mt-4 text-slate-600 whitespace-pre-wrap">{selectedView.content || "Chưa có nội dung."}</p>
                </div>
              )}

              {!selectedView && (
                <div className="h-full flex items-center justify-center text-center text-slate-500">
                  <div>
                    <h3 className="text-lg font-semibold">Chọn một mục để xem chi tiết</h3>
                    <p className="mt-1 text-sm">Nội dung chi tiết sẽ được hiển thị ở đây.</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm mục mới</DialogTitle><DialogDescription>Chọn loại và đặt tên cho mục mới của bạn.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2"><Label>Loại</Label><Select value={newItem.type} onValueChange={(v) => setNewItem(d => ({...d, type: v as any}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="article">Viết bài viết</SelectItem><SelectItem value="comment">Viết comment</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Tên</Label><Input value={newItem.name} onChange={(e) => setNewItem(d => ({...d, name: e.target.value}))} placeholder="VD: Bài viết về sản phẩm A" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button><Button onClick={handleAddItem} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectDetail;