import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, FileText, PlusCircle, UploadCloud, ChevronRight, Loader2, BookOpen, Trash2, Edit, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ProjectDocumentsManager } from '@/components/content-ai/ProjectDocumentsManager';
import { CommentGenerationDetail } from '@/components/content-ai/CommentGenerationDetail';
import { ArticleGenerationDetail } from '@/components/content-ai/ArticleGenerationDetail';

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

type CommentRatio = {
  id: string;
  percentage: number;
  content: string;
};

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [selectedView, setSelectedView] = useState<'documents' | ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [promptLibraries, setPromptLibraries] = useState<PromptLibrary[]>([]);

  const [newItem, setNewItem] = useState({ name: '', type: 'article' as 'article' | 'comment' });
  const [newItemConfig, setNewItemConfig] = useState<any>({ quantity: 1 });
  const [commentRatios, setCommentRatios] = useState<CommentRatio[]>([{ id: crypto.randomUUID(), percentage: 100, content: '' }]);

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ProjectItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const totalPercentage = useMemo(() => {
    return commentRatios.reduce((sum, ratio) => sum + (Number(ratio.percentage) || 0), 0);
  }, [commentRatios]);

  const fetchProjectData = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Effect for real-time content updates
  useEffect(() => {
    if (!projectId) return;

    const itemsChannel = supabase
      .channel(`project-items-update-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'content_ai_items', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const updatedItem = payload.new as ProjectItem;
          
          setItems((currentItems) => 
            currentItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
          );

          setSelectedView(currentView => {
            if (currentView && typeof currentView === 'object' && currentView.id === updatedItem.id) {
              return updatedItem;
            }
            return currentView;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, [projectId]);

  const handleOpenAddDialog = () => {
    setNewItem({ name: '', type: 'article' });
    setNewItemConfig({ quantity: 1 });
    setCommentRatios([{ id: crypto.randomUUID(), percentage: 100, content: '' }]);
    setIsAddDialogOpen(true);
  };

  const handleTypeChange = (type: 'article' | 'comment') => {
    setNewItem((d: any) => ({ ...d, type }));
    if (type === 'article') {
      setNewItemConfig({ quantity: 1 });
    } else {
      setNewItemConfig({ quantity: 10 });
      setCommentRatios([{ id: crypto.randomUUID(), percentage: 100, content: '' }]);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    setNewItemConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !projectId) {
      showError("Tên bài viết không được để trống.");
      return;
    }
    setIsSaving(true);
    try {
      let finalConfig = { ...newItemConfig };
      if (newItem.type === 'comment') {
        finalConfig.ratios = commentRatios;
      }

      const { error } = await supabase.from('content_ai_items').insert({
        name: newItem.name.trim(),
        type: newItem.type,
        project_id: projectId,
        config: finalConfig
      });

      if (error) throw error;
      showSuccess("Đã thêm mục mới thành công!");
      setIsAddDialogOpen(false);
      fetchProjectData();
    } catch (error: any) {
      showError("Thêm thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRatio = () => {
    setCommentRatios([...commentRatios, { id: crypto.randomUUID(), percentage: 0, content: '' }]);
  };

  const handleRemoveRatio = (id: string) => {
    if (commentRatios.length > 1) {
      setCommentRatios(commentRatios.filter(r => r.id !== id));
    }
  };

  const handleRatioChange = (id: string, field: 'percentage' | 'content', value: string | number) => {
    setCommentRatios(commentRatios.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleItemUpdate = (updatedItem: ProjectItem) => {
    setItems(prevItems => 
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    if (selectedView && typeof selectedView === 'object' && selectedView.id === updatedItem.id) {
        setSelectedView(updatedItem);
    }
  };

  const handleSaveName = async () => {
    if (!editingItemId || !editingName.trim()) {
        setEditingItemId(null);
        return;
    }
    const { error } = await supabase
        .from('content_ai_items')
        .update({ name: editingName.trim() })
        .eq('id', editingItemId);
    
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
      const { error } = await supabase
          .from('content_ai_items')
          .delete()
          .eq('id', itemToDelete.id);
      
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

  const articles = items.filter(item => item.type === 'article');
  const comments = items.filter(item => item.type === 'comment');

  const ItemList = ({ items }: { items: ProjectItem[] }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingItemId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingItemId]);

    return (
        <div className="flex flex-col gap-1 pl-2">
            {items.map(item => (
                <div
                    key={item.id}
                    onClick={() => editingItemId !== item.id && setSelectedView(item)}
                    className={cn(
                        "group w-full text-left p-2 rounded-md text-sm flex items-center justify-between cursor-pointer",
                        selectedView && typeof selectedView === 'object' && selectedView.id === item.id && editingItemId !== item.id
                            ? "bg-blue-100 text-blue-700 font-semibold"
                            : "hover:bg-slate-100"
                    )}
                >
                    {editingItemId === item.id ? (
                        <div className="flex-1 flex items-center gap-1">
                            <Input
                                ref={inputRef}
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleSaveName}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                className="h-7 text-sm"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}>
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <span className="truncate">{item.name}</span>
                            <div className="flex items-center flex-shrink-0">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingItemId(item.id); setEditingName(item.name); }}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                <ChevronRight className={cn("h-4 w-4 text-slate-400", selectedView && typeof selectedView === 'object' && selectedView.id === item.id && "text-blue-700")} />
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
  };

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
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAddDialog}><PlusCircle className="mr-2 h-4 w-4" />Thêm Post</Button>
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
                  <AccordionContent><ItemList items={articles} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="comments">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline"><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-600" /><span>Viết comment ({comments.length})</span></div></AccordionTrigger>
                  <AccordionContent><ItemList items={comments} /></AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <div className="h-full p-6 overflow-y-auto">
              {selectedView === 'documents' && projectId && <ProjectDocumentsManager projectId={projectId} />}
              
              {selectedView && typeof selectedView === 'object' && selectedView.type === 'comment' && (
                <CommentGenerationDetail 
                  project={project} 
                  item={selectedView} 
                  promptLibraries={promptLibraries} 
                  onSave={handleItemUpdate}
                />
              )}

              {selectedView && typeof selectedView === 'object' && selectedView.type === 'article' && (
                <ArticleGenerationDetail
                  project={project}
                  item={selectedView}
                  promptLibraries={promptLibraries}
                  onSave={handleItemUpdate}
                />
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm mục mới</DialogTitle>
            <DialogDescription>Điền các thông tin cần thiết để AI tạo nội dung.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-name">Tên bài viết</Label>
              <Input id="post-name" value={newItem.name} onChange={(e) => setNewItem(d => ({...d, name: e.target.value}))} placeholder="VD: Bài viết về sản phẩm A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-type">Loại</Label>
              <Select value={newItem.type} onValueChange={(v) => handleTypeChange(v as any)}>
                <SelectTrigger id="post-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Viết bài viết</SelectItem>
                  <SelectItem value="comment">Viết comment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newItem.type === 'article' && (
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ngành</Label>
                    <Select onValueChange={v => handleConfigChange('libraryId', v)}>
                      <SelectTrigger><SelectValue placeholder="Chọn thư viện prompt" /></SelectTrigger>
                      <SelectContent>
                        {promptLibraries.map(lib => (
                          <SelectItem key={lib.id} value={String(lib.id)}>{lib.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dạng bài</Label>
                    <Select onValueChange={v => handleConfigChange('format', v)}>
                      <SelectTrigger><SelectValue placeholder="Chọn dạng bài" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">Đặt câu hỏi / thảo luận</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="sharing">Chia sẻ</SelectItem>
                        <SelectItem value="comparison">So sánh</SelectItem>
                        <SelectItem value="storytelling">Story telling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Định hướng nội dung</Label>
                  <Textarea placeholder="Nhập định hướng chi tiết cho AI..." className="min-h-[100px]" onChange={e => handleConfigChange('direction', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" value={newItemConfig.quantity} onChange={e => handleConfigChange('quantity', e.target.value)} />
                  <p className="text-xs text-muted-foreground">NÊN CHỌN 1 (Số lượng bài nhiều hơn 1 có thể ảnh hưởng đến chất lượng của bài viết)</p>
                </div>
              </div>
            )}

            {newItem.type === 'comment' && (
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div className="space-y-2">
                  <Label>Ngành</Label>
                  <Select onValueChange={v => handleConfigChange('libraryId', v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn thư viện prompt" /></SelectTrigger>
                    <SelectContent>
                      {promptLibraries.map(lib => (
                        <SelectItem key={lib.id} value={String(lib.id)}>{lib.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nội dung Post</Label>
                  <Textarea placeholder="Dán nội dung bài viết cần bình luận vào đây..." className="min-h-[100px]" onChange={e => handleConfigChange('postContent', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Định hướng comment</Label>
                  <Textarea placeholder="Nhập định hướng chi tiết cho các bình luận..." className="min-h-[80px]" onChange={e => handleConfigChange('commentDirection', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tỉ lệ comment</Label>
                  <div className="space-y-2">
                    {commentRatios.map((ratio) => (
                      <div key={ratio.id} className="flex items-center gap-2">
                        <div className="relative w-24">
                          <Input type="number" value={ratio.percentage} onChange={(e) => handleRatioChange(ratio.id, 'percentage', e.target.value)} className="pr-6" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                        <Input placeholder="Nội dung định hướng" value={ratio.content} onChange={(e) => handleRatioChange(ratio.id, 'content', e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRatio(ratio.id)} disabled={commentRatios.length <= 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Button variant="outline" size="sm" onClick={handleAddRatio}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Thêm tỉ lệ
                    </Button>
                    {totalPercentage > 100 && (
                      <p className="text-sm text-destructive font-medium">Tổng tỉ lệ vượt quá 100%!</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Số lượng comment</Label>
                  <Input type="number" value={newItemConfig.quantity} onChange={e => handleConfigChange('quantity', e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleAddItem} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default ProjectDetail;