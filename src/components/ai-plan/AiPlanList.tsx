import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, PlusCircle, Search, List, LayoutGrid, ChevronDown, Loader2, Briefcase } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Project = {
  id: number;
  name: string;
  updated_at: string;
  color: string;
  items_count: number;
};

type Template = {
  id: number;
  name: string;
};

const folderColors = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-yellow-100 text-yellow-600',
  'bg-purple-100 text-purple-600',
  'bg-red-100 text-red-600',
  'bg-indigo-100 text-indigo-600',
  'bg-pink-100 text-pink-600',
  'bg-teal-100 text-teal-600',
];

const getRandomColor = () => folderColors[Math.floor(Math.random() * folderColors.length)];

export const AiPlanList = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchProjectsAndTemplates = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, templatesRes] = await Promise.all([
        supabase.rpc('get_ai_plans_with_creator'),
        supabase.from('ai_plan_templates').select('id, name')
      ]);
      
      if (projectsRes.error) throw projectsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setProjects(projectsRes.data || []);
      setTemplates(templatesRes.data || []);
      if (templatesRes.data && templatesRes.data.length > 0) {
        setSelectedTemplateId(String(templatesRes.data[0].id));
      }
    } catch (error: any) {
      showError("Không thể tải dữ liệu: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndTemplates();
  }, []);

  const stats = useMemo(() => {
    return [
      { title: 'Tổng số kế hoạch', value: String(projects.length), icon: Briefcase, color: 'bg-purple-500' },
    ];
  }, [projects]);

  const handleOpenDialog = (project: Project | null = null) => {
    setEditingProject(project);
    setProjectName(project ? project.name : '');
    setIsProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectName.trim() || !user) {
      showError("Tên kế hoạch không được để trống.");
      return;
    }
    if (!editingProject && !selectedTemplateId) {
      showError("Vui lòng chọn một mẫu kế hoạch.");
      return;
    }
    setIsSaving(true);

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('ai_plans')
          .update({ name: projectName.trim(), updated_at: new Date().toISOString() })
          .eq('id', editingProject.id);
        if (error) throw error;
        showSuccess("Đã cập nhật kế hoạch thành công!");
      } else {
        const randomColor = getRandomColor();
        const { data: newProject, error } = await supabase
          .from('ai_plans')
          .insert({ name: projectName.trim(), creator_id: user.id, color: randomColor, template_id: Number(selectedTemplateId) })
          .select().single();
        if (error) throw error;
        showSuccess("Đã tạo kế hoạch thành công!");
        if (newProject) navigate(`/ai-plan/${newProject.id}`);
      }
      
      setIsProjectDialogOpen(false);
      fetchProjectsAndTemplates();
    } catch (error: any) {
      showError(`Lưu kế hoạch thất bại: ${error.message}`);
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
    const { error } = await supabase.from('ai_plans').delete().eq('id', projectToDelete.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa kế hoạch!");
      fetchProjectsAndTemplates();
    }
    setIsDeleteDialogOpen(false);
  };

  const renderProjectView = () => {
    if (isLoading) {
      return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>;
    }
    if (projects.length === 0) {
      return <div className="text-center py-16 text-muted-foreground col-span-full"><Folder className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-semibold">Chưa có kế hoạch nào</h3><p className="mt-1 text-sm">Hãy bắt đầu bằng cách tạo một kế hoạch mới.</p></div>;
    }
    const projectActions = (project: Project) => ({ onEdit: () => handleOpenDialog(project), onShare: () => {}, onDelete: () => handleOpenDeleteDialog(project) });
    const displayProjects = projects.map(p => ({
      ...p,
      files: p.items_count,
      modified: formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: vi })
    }));

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProjects.map(project => (
            <ProjectFolder 
              key={project.id} 
              {...project}
              basePath="/ai-plan"
              {...projectActions(project)}
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
              <TableHead>Tên kế hoạch</TableHead>
              <TableHead>Số mục</TableHead>
              <TableHead>Sửa đổi lần cuối</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayProjects.map(project => (
              <ProjectListItem 
                key={project.id} 
                {...project}
                basePath="/ai-plan"
                {...projectActions(project)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map(stat => (
            <StatWidget key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm kế hoạch..." className="pl-9 bg-white rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="bg-white rounded-lg">Sắp xếp theo <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Tên</DropdownMenuItem><DropdownMenuItem>Ngày sửa đổi</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
              <Button size="icon" variant={viewMode === 'grid' ? 'default' : 'ghost'} onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-600'}><LayoutGrid className="h-4 w-4" /></Button>
              <Button size="icon" variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-600'}><List className="h-4 w-4" /></Button>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tạo kế hoạch mới
            </Button>
          </div>
        </div>

        {renderProjectView()}
      </div>
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle className="text-xl font-bold">{editingProject ? 'Sửa kế hoạch' : 'Tạo kế hoạch mới'}</DialogTitle><DialogDescription>{editingProject ? 'Thay đổi tên cho kế hoạch của bạn.' : 'Nhập tên và chọn mẫu cho kế hoạch mới.'}</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="project-name">Tên kế hoạch</Label><Input id="project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="VD: Kế hoạch ra mắt sản phẩm X" onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()} className="h-11 bg-slate-100/70 border-slate-200" /></div>{!editingProject && (<div className="space-y-2"><Label htmlFor="template-select">Chọn mẫu kế hoạch</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}><SelectTrigger id="template-select"><SelectValue placeholder="Chọn một mẫu" /></SelectTrigger><SelectContent>{templates.map(template => (<SelectItem key={template.id} value={String(template.id)}>{template.name}</SelectItem>))}</SelectContent></Select></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setIsProjectDialogOpen(false)} className="rounded-lg">Hủy</Button><Button onClick={handleSaveProject} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Kế hoạch "{projectToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-lg">Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700 rounded-lg">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};