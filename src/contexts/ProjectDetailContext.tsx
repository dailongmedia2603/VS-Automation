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
  processingItemIds: Set<number>;
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
  refetchProcessingTasks: () => Promise<void>;
}

const ProjectDetailContext = createContext<ProjectDetailContextType | undefined>(undefined);

export const ProjectDetailProvider = ({ projectId, children }: { projectId: string, children: ReactNode }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [selectedView, setSelectedView] = useState<'documents' | ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promptLibraries, setPromptLibraries] = useState<PromptLibrary[]>([]);
  const [newlyUpdatedItemIds, setNewlyUpdatedItemIds] = useState<Set<number>>(new Set());
  const [processingItemIds, setProcessingItemIds] = useState<Set<number>>(new Set());
  
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ProjectItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const refetchProcessingTasks = useCallback(async () => {
    if (!projectId) return;
    const { data: itemsData, error: itemsError } = await supabase.from('content_ai_items').select('id').eq('project_id', projectId);
    if (itemsError) {
      console.error("Error fetching items for task check:", itemsError);
      return;
    }
    const itemIds = itemsData.map(i => i.id);
    if (itemIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('ai_generation_tasks')
        .select('item_id')
        .in('item_id', itemIds)
        .in('status', ['pending', 'running']);
      if (!tasksError) {
        setProcessingItemIds(new Set(tasksData.map(t => t.item_id)));
      } else {
        console.error("Error fetching processing tasks:", tasksError);
      }
    } else {
      setProcessingItemIds(new Set());
    }
  }, [projectId]);

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
      const currentItems = itemsData || [];
      setItems(currentItems);
      setPromptLibraries(librariesData || []);
      await refetchProcessingTasks();

    } catch (error: any) {
      showError("Không thể tải dữ liệu dự án: " + error.message);
    } finally {
      if (!isBackgroundRefresh) setIsLoading(false);
    }
  }, [projectId, refetchProcessingTasks]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    const channel = supabase
      .channel(`project-items-update-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'content_ai_items', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const updatedItem = payload.new as ProjectItem;
          showSuccess(`Đã tạo xong nội dung cho "${updatedItem.name}"!`);
          setNewlyUpdatedItemIds(prev => new Set(prev).add(updatedItem.id));
          fetchProjectData(true);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Realtime subscription lỗi, sẽ thử lại…', err);
        }
      });

    const taskChannel = supabase
      .channel(`project-tasks-update-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_generation_tasks' },
        () => {
          refetchProcessingTasks();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Realtime task channel subscription lỗi:', err);
        }
      });

    return () => {
      channel.unsubscribe();
      taskChannel.unsubscribe();
    };
  }, [projectId, fetchProjectData, refetchProcessingTasks]);

  const handleSelectView = (view: 'documents' | ProjectItem) => {
    if (typeof view === 'object' && view.id) {
      setNewlyUpdatedItemIds(prev => {
        if (prev.has(view.id)) {
          const newSet = new Set(prev);
          newSet.delete(view.id);
          return newSet;
        }
        return prev;
      });
    }
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
    processingItemIds,
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
    refetchProcessingTasks,
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