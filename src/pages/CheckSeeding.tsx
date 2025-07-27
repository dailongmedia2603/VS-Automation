import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Archive, Trash2, FolderClock, CheckCircle, ListTodo, ChevronDown, Loader2, ArchiveRestore, MoreHorizontal, Edit } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { format } from 'date-fns';
import { SeedingStatCard } from '@/components/SeedingStatCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

type ProjectStatus = 'checking' | 'completed' | 'archived';
type Project = {
  id: number;
  name: string;
  created_at: string;
  status: ProjectStatus;
  total_posts: number;
  checking_posts: number;
  completed_posts: number;
  comment_check_count: number;
  post_approval_count: number;
};

const CheckSeeding = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc('get_seeding_projects_with_stats');
    if (error) {
      showError("Không thể tải dự án: " + error.message);
      setProjects([]);
    } else {
      setProjects(data as Project[] || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const isArchivedView = statusFilter === 'archived';
      if (isArchivedView) {
        if (p.status !== 'archived') return false;
      } else {
        if (p.status === 'archived') return false;
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      }
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, searchTerm]);

  const paginatedProjects = useMemo(() => {
    if (pagination.pageSize === 0) return filteredProjects;
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredProjects.slice(start, end);
  }, [filteredProjects, pagination]);

  const pageCount = pagination.pageSize > 0 ? Math.ceil(filteredProjects.length / pagination.pageSize) : 1;

  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'archived');
    return {
      total: activeProjects.length,
      completed: activeProjects.filter(p => p.status === 'completed').length,
      checking: activeProjects.filter(p => p.status === 'checking').length,
    };
  }, [projects]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? paginatedProjects.map(p => p.id) : []);
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleBulkAction = async (action: 'archive' | 'delete' | 'restore') => {
    let toastMessage = '';
    let query;
    let successMessage = '';

    switch (action) {
      case 'archive':
        toastMessage = 'Đang lưu trữ...';
        successMessage = 'Đã lưu trữ thành công!';
        query = supabase.from('seeding_projects').update({ status: 'archived' }).in('id', selectedIds);
        break;
      case 'restore':
        toastMessage = 'Đang khôi phục...';
        successMessage = 'Đã khôi phục thành công!';
        query = supabase.from('seeding_projects').update({ status: 'checking' }).in('id', selectedIds);
        break;
      case 'delete':
        toastMessage = 'Đang xóa vĩnh viễn...';
        successMessage = 'Đã xóa thành công!';
        query = supabase.from('seeding_projects').delete().in('id', selectedIds);
        break;
      default: return;
    }

    const toastId = showLoading(toastMessage);
    const { error } = await query;
    dismissToast(toastId);

    if (error) showError(`Thao tác thất bại: ${error.message}`);
    else showSuccess(successMessage);
    
    setSelectedIds([]);
    fetchProjects();
  };

  const handleOpenAddDialog = () => {
    setEditingProject(null);
    setProjectName('');
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      showError("Tên dự án không được để trống.");
      return;
    }
    setIsSaving(true);
    let error;
    if (editingProject) {
      ({ error } = await supabase.from('seeding_projects').update({ name: projectName, status: editingProject.status }).eq('id', editingProject.id));
    } else {
      ({ error } = await supabase.from('seeding_projects').insert({ name: projectName }));
    }

    if (error) {
      showError("Lưu dự án thất bại: " + error.message);
    } else {
      showSuccess(`Đã ${editingProject ? 'cập nhật' : 'thêm'} dự án thành công!`);
      setIsAddEditDialogOpen(false);
      fetchProjects();
    }
    setIsSaving(false);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    const toastId = showLoading("Đang xóa...");
    const { error } = await supabase.from('seeding_projects').delete().eq('id', projectToDelete.id);
    dismissToast(toastId);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa dự án thành công!");
      fetchProjects();
    }
    setIsDeleteAlertOpen(false);
    setProjectToDelete(null);
  };

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Check Seeding</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Quản lý và theo dõi tiến độ các dự án seeding của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SeedingStatCard title="Tổng dự án" value={stats.total} icon={ListTodo} color="bg-blue-500" />
        <SeedingStatCard title="Hoàn thành" value={stats.completed} icon={CheckCircle} color="bg-green-500" />
        <SeedingStatCard title="Đang Check" value={stats.checking} icon={FolderClock} color="bg-amber-500" />
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-grow max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm dự án..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Thao tác <ChevronDown className="ml-2 h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {statusFilter === 'archived' ? (
                      <DropdownMenuItem onClick={() => handleBulkAction('restore')}><ArchiveRestore className="mr-2 h-4 w-4" />Khôi phục</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleBulkAction('archive')}><Archive className="mr-2 h-4 w-4" />Lưu trữ</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa vĩnh viễn</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <TabsList className="p-1 h-auto bg-slate-100 rounded-lg">
                  <TabsTrigger value="all" className="px-3 py-1.5 text-sm data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 rounded-md">Tất cả</TabsTrigger>
                  <TabsTrigger value="completed" className="px-3 py-1.5 text-sm data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 rounded-md">Hoàn thành</TabsTrigger>
                  <TabsTrigger value="checking" className="px-3 py-1.5 text-sm data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 rounded-md">Đang check</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" onClick={() => setStatusFilter('archived')} className={cn(statusFilter === 'archived' && 'bg-blue-100 text-blue-700')}>
                <Archive className="mr-2 h-4 w-4" />Lưu trữ
              </Button>
              <Button onClick={handleOpenAddDialog} className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="mr-2 h-4 w-4" />Thêm dự án
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === paginatedProjects.length && paginatedProjects.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                  <TableHead>Dự án</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-center">Tổng Post</TableHead>
                  <TableHead className="text-center">Check Comment</TableHead>
                  <TableHead className="text-center">Check Post</TableHead>
                  <TableHead className="text-center">Đang check</TableHead>
                  <TableHead className="text-center">Hoàn thành</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedProjects.length > 0 ? (
                  paginatedProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell><Checkbox checked={selectedIds.includes(project.id)} onCheckedChange={(checked) => handleSelectRow(project.id, !!checked)} /></TableCell>
                      <TableCell className="font-medium">
                        <Link to={`/check-seeding/${project.id}`} className="hover:underline text-slate-800">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(project.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-center">{project.total_posts}</TableCell>
                      <TableCell className="text-center">{project.comment_check_count}</TableCell>
                      <TableCell className="text-center">{project.post_approval_count}</TableCell>
                      <TableCell className="text-center">{project.checking_posts}</TableCell>
                      <TableCell className="text-center">{project.completed_posts}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'pointer-events-none',
                          project.status === 'completed' && 'bg-green-100 text-green-800 border-green-200',
                          project.status === 'checking' && 'bg-amber-100 text-amber-800 border-amber-200',
                          project.status === 'archived' && 'bg-slate-100 text-slate-800 border-slate-200'
                        )}>
                          {project.status === 'completed' ? 'Hoàn thành' : project.status === 'checking' ? 'Đang check' : 'Lưu trữ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(project)}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteProject(project)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={10} className="text-center h-24">Không có dự án nào.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Đã chọn {selectedIds.length} trên {filteredProjects.length} dự án.</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Hiển thị</p>
              <Select value={String(pagination.pageSize)} onValueChange={value => setPagination({ pageIndex: 0, pageSize: Number(value) })}>
                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="0">Tất cả</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))} /></PaginationItem>
                <PaginationItem><PaginationLink>{pagination.pageIndex + 1}</PaginationLink></PaginationItem>
                <PaginationItem><PaginationNext href="#" onClick={() => setPagination(p => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }))} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingProject ? 'Sửa dự án' : 'Thêm dự án mới'}</DialogTitle>
            <DialogDescription>{editingProject ? 'Chỉnh sửa tên cho dự án của bạn.' : 'Nhập tên cho dự án seeding của bạn.'}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="project-name" className="sr-only">Tên dự án</Label>
            <Input id="project-name" placeholder="VD: Chiến dịch seeding tháng 9" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-11 bg-slate-100/70 border-slate-200" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditDialogOpen(false)} className="rounded-lg">Hủy</Button>
            <Button onClick={handleSaveProject} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác. Dự án "{projectToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default CheckSeeding;