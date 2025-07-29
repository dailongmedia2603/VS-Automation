import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, PlusCircle, Search, List, LayoutGrid, ChevronDown, Loader2 } from 'lucide-react';
import { StatWidget } from '@/components/content-ai/StatWidget';
import { ProjectFolder } from '@/components/ProjectFolder';
import { ProjectListItem } from '@/components/ProjectListItem';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

type Project = {
  id: number;
  name: string;
  created_at: string;
  creator_id: string;
  creator_name: string | null;
  creator_email: string | null;
  results_count: number;
};

type DisplayProject = {
  id: number;
  name: string;
  files: number;
  modified: string;
  color: string;
};

const CheckPostScan = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_post_scan_projects_with_creator');
      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      showError("Không thể tải dự án: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const displayProjects: DisplayProject[] = useMemo(() => {
    return filteredProjects.map(p => ({
      id: p.id,
      name: p.name,
      files: p.results_count,
      modified: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: vi }),
      color: 'bg-green-100 text-green-600',
    }));
  }, [filteredProjects]);

  const stats = useMemo(() => {
    return [
      { title: 'Tổng số dự án', value: String(projects.length), icon: Folder, color: 'bg-blue-500' },
    ];
  }, [projects]);

  const handleOpenDialog = (project: Project | null = null) => {
    setEditingProject(project);
    setProjectName(project ? project.name : '');
    setIsProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectName.trim() || !user) {
      showError("Tên dự án không được để trống.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingProject) {
        const { error } = await supabase
          .from('post_scan_projects')
          .update({ name: projectName.trim() })
          .eq('id', editingProject.id);
        if (error) throw error;
        showSuccess("Đã cập nhật dự án thành công!");
      } else {
        const { error } = await supabase
          .from('post_scan_projects')
          .insert({ name: projectName.trim(), creator_id: user.id });
        if (error) throw error;
        showSuccess("Đã tạo dự án thành công!");
      }
      setIsProjectDialogOpen(false);
      fetchProjects();
    } catch (error: any) {
      showError(`Lưu dự án thất bại: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('post_scan_projects').delete().eq('id', projectToDelete.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa dự án!");
      fetchProjects();
    }
    setIsDeleteDialogOpen(false);
  };

  const renderProjectView = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      );
    }

    if (displayProjects.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground col-span-full">
                <Folder className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Chưa có dự án nào</h3>
                <p className="mt-1 text-sm">Hãy bắt đầu bằng cách tạo dự án mới.</p>
            </div>
        )
    }

    const projectActions = (project: Project) => ({
      onEdit: () => handleOpenDialog(project),
      onShare: () => { /* Not implemented for this tool */ },
      onDelete: () => handleOpenDeleteDialog(project),
    });

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProjects.map((project, index) => (
            <ProjectFolder 
              key={project.id} 
              {...project}
              basePath="/tools/check-post-scan"
              {...projectActions(filteredProjects[index])}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="border rounded-2xl bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên dự án</TableHead>
              <TableHead>Số bài viết</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayProjects.map((project, index) => (
              <ProjectListItem 
                key={project.id} 
                {...project}
                basePath="/tools/check-post-scan"
                {...projectActions(filteredProjects[index])}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <>
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Check Post Scan</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Quản lý các dự án quét bài viết mới trên group hàng ngày.
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tạo dự án mới
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map(stat => (
            <StatWidget key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm dự án..." className="pl-9 bg-white rounded-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white rounded-lg">Sắp xếp theo <ChevronDown className="ml-2 h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Tên</DropdownMenuItem>
                <DropdownMenuItem>Ngày tạo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
              <Button size="icon" variant={viewMode === 'grid' ? 'default' : 'ghost'} onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-600'}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button size="icon" variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-600'}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {renderProjectView()}
      </main>

      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Sửa dự án' : 'Tạo dự án mới'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Thay đổi tên cho dự án của bạn.' : 'Nhập tên cho dự án mới của bạn.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="project-name">Tên dự án</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="VD: Dự án quét group ABC"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveProject} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Dự án "{projectToDelete?.name}" sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CheckPostScan;