import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, PlusCircle, Edit, Trash2, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ArticleGenerationDetail } from '@/components/content-ai/ArticleGenerationDetail';
import { CommentGenerationDetail } from '@/components/content-ai/CommentGenerationDetail';
import { ProjectDocumentsManager } from '@/components/content-ai/ProjectDocumentsManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface ProjectDetailContextType {
  project: Project | null;
  items: ProjectItem[];
  selectedView: 'documents' | ProjectItem | null;
  isLoading: boolean;
  promptLibraries: PromptLibrary[];
  newlyUpdatedItemIds: Set<number>;
  editingItemId: number | null;
  editingName: string;
  itemToDelete: ProjectItem | null;
  isDeleteDialogOpen: boolean;
  handleSelectView: (view: 'documents' | ProjectItem) => void;
  handleItemUpdate: (updatedItem: ProjectItem) => void;
  fetchProjectData: (isBackgroundRefresh?: boolean) => void;
  setEditingItemId: (id: number | null) => void;
  setEditingName: (name: string) => void;
  handleSaveName: () => void;
  handleDeleteItem: (item: ProjectItem) => void;
  handleConfirmDelete: () => void;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
}

const ProjectDetailContext = createContext<ProjectDetailContextType | undefined>(undefined);

export const ProjectDetailProvider = ({ projectId, children }: { projectId: string, children: ReactNode }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [selectedView, setSelectedView] = useState<'documents' | ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promptLibraries, setPromptLibraries] = useState<PromptLibrary[]>([]);
  const [newlyUpdatedItemIds] = useState<Set<number>>(new Set());
  
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ProjectItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchProjectData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsLoading(true);
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
      if (!isBackgroundRefresh) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleSelectView = (view: 'documents' | ProjectItem) => {
    setSelectedView(view);
  };

  const handleItemUpdate = (updatedItem: ProjectItem) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
    if (selectedView && typeof selectedView === 'object' && selectedView.id === updatedItem.id) {
      setSelectedView(updatedItem);
    }
  };

  const handleSaveName = async () => {
    if (!editingItemId || !editingName.trim()) {
        setEditingItemId(null);
        return;
    }
    const { error } = await supabase.from('content_ai_items').update({ name: editingName.trim() }).eq('id', editingItemId);
    if (error) {
        showError("Cập nhật tên thất bại: " + error.message);
    } else {
        showSuccess("Đã cập nhật tên!");
        fetchProjectData();
    }
    setEditingItemId(null);
  };

  const handleDeleteItem = (item: ProjectItem) => {
      setItemToDelete(item);
      setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
      if (!itemToDelete) return;
      const { error } = await supabase.from('content_ai_items').delete().eq('id', itemToDelete.id);
      if (error) {
          showError("Xóa thất bại: " + error.message);
      } else {
          showSuccess("Đã xóa mục thành công!");
          if (selectedView && typeof selectedView === 'object' && selectedView.id === itemToDelete.id) {
              setSelectedView(null);
          }
          fetchProjectData();
      }
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
  };

  const value = {
    project,
    items,
    selectedView,
    isLoading,
    promptLibraries,
    newlyUpdatedItemIds,
    editingItemId,
    editingName,
    itemToDelete,
    isDeleteDialogOpen,
    handleSelectView,
    handleItemUpdate,
    fetchProjectData,
    setEditingItemId,
    setEditingName,
    handleSaveName,
    handleDeleteItem,
    handleConfirmDelete,
    setIsDeleteDialogOpen,
  };

  return (
    <ProjectDetailContext.Provider value={value}>
      {children}
      {itemToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Hành động này sẽ xóa vĩnh viễn mục "{itemToDelete?.name}".
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ProjectDetailContext.Provider>
  );
};

export const useProjectDetail = () => {
  const context = useContext(ProjectDetailContext);
  if (context === undefined) {
    throw new Error('useProjectDetail must be used within a ProjectDetailProvider');
  }
  return context;
};

export const ProjectDetailContent = () => {
  const {
    project,
    items,
    selectedView,
    isLoading,
    promptLibraries,
    editingItemId,
    editingName,
    handleSelectView,
    handleItemUpdate,
    fetchProjectData,
    setEditingItemId,
    setEditingName,
    handleSaveName,
    handleDeleteItem,
  } = useProjectDetail();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'article' | 'comment'>('article');
  const [isSavingNewItem, setIsSavingNewItem] = useState(false);

  const handleCreateItem = async () => {
    if (!newItemName.trim() || !project) return;
    setIsSavingNewItem(true);
    const { data, error } = await supabase
      .from('content_ai_items')
      .insert({
        name: newItemName,
        type: newItemType,
        project_id: project.id,
      })
      .select()
      .single();
    
    if (error) {
      showError("Tạo mục thất bại: " + error.message);
    } else {
      showSuccess("Đã tạo mục mới!");
      setIsAddDialogOpen(false);
      setNewItemName('');
      fetchProjectData();
      if (data) {
        handleSelectView(data as ProjectItem);
      }
    }
    setIsSavingNewItem(false);
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-12rem)]">
          <ResizablePanel defaultSize={25}><Skeleton className="h-full w-full rounded-2xl" /></ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}><Skeleton className="h-full w-full rounded-2xl" /></ResizablePanel>
        </ResizablePanelGroup>
      </main>
    );
  }

  if (!project) {
    return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><h1>Không tìm thấy dự án</h1></main>;
  }

  return (
    <>
      <main className="flex-1 flex flex-col p-6 sm:p-8 bg-slate-50 min-h-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/content-ai"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700"><PlusCircle className="mr-2 h-4 w-4" />Thêm mục</Button>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="flex flex-col h-full p-4 overflow-y-auto">
              <Button
                variant="ghost"
                onClick={() => handleSelectView('documents')}
                className={cn(
                  "w-full justify-start p-2 text-left font-semibold",
                  selectedView === 'documents' && 'bg-slate-100'
                )}
              >
                <FileText className="mr-2 h-4 w-4" />
                Tài liệu
              </Button>
              <div className="mt-4">
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase">Nội dung</h3>
                <div className="mt-2 space-y-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "group w-full text-left p-2 rounded-md text-sm flex items-center justify-between",
                        editingItemId !== item.id && "cursor-pointer",
                        (selectedView as ProjectItem)?.id === item.id && editingItemId !== item.id ? "bg-blue-100 text-blue-700 font-semibold hover:bg-blue-100" : "hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1" onClick={() => editingItemId !== item.id && handleSelectView(item)}>
                        {item.type === 'article' ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                        {editingItemId === item.id ? (
                          <div className="flex-1 flex items-center gap-1">
                            <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={handleSaveName} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} className="h-7 text-sm" />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <span className="truncate">{item.name}</span>
                        )}
                      </div>
                      {editingItemId !== item.id && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingItemId(item.id); setEditingName(item.name); }}><Edit className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <div className="h-full p-6 overflow-y-auto bg-slate-50">
              {selectedView === 'documents' && <ProjectDocumentsManager projectId={project.id.toString()} />}
              {typeof selectedView === 'object' && selectedView?.type === 'article' && <ArticleGenerationDetail project={project} item={selectedView} promptLibraries={promptLibraries} onSave={handleItemUpdate} />}
              {typeof selectedView === 'object' && selectedView?.type === 'comment' && <CommentGenerationDetail project={project} item={selectedView} promptLibraries={promptLibraries} onSave={handleItemUpdate} />}
              {!selectedView && <div className="text-center text-slate-500"><p className="font-semibold text-lg">Chọn một mục để xem chi tiết</p></div>}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm mục mới</DialogTitle>
            <DialogDescription>Chọn loại và đặt tên cho mục mới của bạn.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Tên mục</Label>
              <Input id="item-name" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-type">Loại mục</Label>
              <Select value={newItemType} onValueChange={(v: 'article' | 'comment') => setNewItemType(v)}>
                <SelectTrigger id="item-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Bài viết</SelectItem>
                  <SelectItem value="comment">Bình luận</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateItem} disabled={isSavingNewItem}>
              {isSavingNewItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};