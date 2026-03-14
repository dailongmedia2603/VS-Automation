import { useState, useMemo } from 'react';
import { useKeywordCheckProjects, useCreateKeywordCheckProject, useUpdateKeywordCheckProject, useDeleteKeywordCheckProject } from '@/hooks/useTools';
import { KeywordCheckProject } from '@/api/tools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Trash2, MoreHorizontal, Edit, Loader2 } from 'lucide-react';
import { showError, showLoading, dismissToast, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';

const CheckKeywordComment = () => {
  // React Query - data loads instantly from cache
  const { data: projects = [], isLoading } = useKeywordCheckProjects();
  const createProject = useCreateKeywordCheckProject();
  const updateProject = useUpdateKeywordCheckProject();
  const deleteProject = useDeleteKeywordCheckProject();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<KeywordCheckProject | null>(null);
  const [projectName, setProjectName] = useState('');

  const [projectToDelete, setProjectToDelete] = useState<KeywordCheckProject | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((p: KeywordCheckProject) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredProjects.map((p: KeywordCheckProject) => p.id) : []);
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleBulkDelete = async () => {
    const toastId = showLoading('Đang xóa...');
    for (const id of selectedIds) {
      await deleteProject.mutateAsync(id);
    }
    dismissToast(toastId);
    showSuccess('Đã xóa thành công!');
    setSelectedIds([]);
  };

  const handleOpenAddDialog = () => {
    setEditingProject(null);
    setProjectName('');
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (project: KeywordCheckProject) => {
    setEditingProject(project);
    setProjectName(project.name);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      showError("Tên dự án không được để trống.");
      return;
    }

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, data: { name: projectName } });
      } else {
        await createProject.mutateAsync({ name: projectName });
      }
      setIsAddEditDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteProject = (project: KeywordCheckProject) => {
    setProjectToDelete(project);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject.mutateAsync(projectToDelete.id);
    setIsDeleteAlertOpen(false);
    setProjectToDelete(null);
  };

  const isSaving = createProject.isPending || updateProject.isPending;

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Check Key Word Comment</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Quản lý các dự án quét và lọc bình luận chứa từ khóa trên các bài đăng Facebook.
        </p>
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
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa ({selectedIds.length})
                </Button>
              )}
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
                  <TableHead className="w-12"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === filteredProjects.length && filteredProjects.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                  <TableHead>Dự án</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Người tạo</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((project: KeywordCheckProject) => (
                    <TableRow key={project.id}>
                      <TableCell><Checkbox checked={selectedIds.includes(project.id)} onCheckedChange={(checked) => handleSelectRow(project.id, !!checked)} /></TableCell>
                      <TableCell className="font-medium">
                        <Link to={`/tools/check-keyword-comment/${project.id}`} className="hover:underline text-slate-800">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(project.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{project.creator?.name || 'Không rõ'}</TableCell>
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
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Không có dự án nào.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingProject ? 'Sửa dự án' : 'Thêm dự án mới'}</DialogTitle>
            <DialogDescription>{editingProject ? 'Chỉnh sửa tên cho dự án của bạn.' : 'Nhập tên cho dự án mới.'}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="project-name" className="sr-only">Tên dự án</Label>
            <Input id="project-name" placeholder="VD: Dự án kiểm tra từ khóa ABC" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-11 bg-slate-100/70 border-slate-200" />
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

export default CheckKeywordComment;