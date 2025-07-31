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

type Library = {
  id: number;
  name: string;
  updated_at: string;
  color: string;
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

const PromptLibrary = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [libraryName, setLibraryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [libraryToDelete, setLibraryToDelete] = useState<Library | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchLibraries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_libraries')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLibraries(data || []);
    } catch (error: any) {
      showError("Không thể tải thư viện: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  const handleOpenDialog = (library: Library | null = null) => {
    setEditingLibrary(library);
    setLibraryName(library ? library.name : '');
    setIsDialogOpen(true);
  };

  const handleSaveLibrary = async () => {
    if (!libraryName.trim() || !user) {
      showError("Tên thư viện không được để trống.");
      return;
    }
    setIsSaving(true);

    try {
      if (editingLibrary) {
        const { error } = await supabase
          .from('prompt_libraries')
          .update({ name: libraryName.trim(), updated_at: new Date().toISOString() })
          .eq('id', editingLibrary.id);
        if (error) throw error;
        showSuccess("Đã cập nhật thư viện thành công!");
      } else {
        const randomColor = getRandomColor();
        const { data: newLibrary, error } = await supabase
          .from('prompt_libraries')
          .insert({ name: libraryName.trim(), creator_id: user.id, color: randomColor })
          .select().single();
        if (error) throw error;
        showSuccess("Đã tạo thư viện thành công!");
        if (newLibrary) navigate(`/training-chatbot/${newLibrary.id}`);
      }
      
      setIsDialogOpen(false);
      fetchLibraries();
    } catch (error: any) {
      showError(`Lưu thất bại: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteDialog = (library: Library) => {
    setLibraryToDelete(library);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteLibrary = async () => {
    if (!libraryToDelete) return;
    const { error } = await supabase.from('prompt_libraries').delete().eq('id', libraryToDelete.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa thư viện!");
      fetchLibraries();
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

    if (libraries.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground col-span-full">
                <Folder className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Chưa có thư viện nào</h3>
                <p className="mt-1 text-sm">Hãy bắt đầu bằng cách tạo một thư viện prompt mới.</p>
            </div>
        )
    }

    const libraryActions = (library: Library) => ({
      onEdit: () => handleOpenDialog(library),
      onShare: () => {},
      onDelete: () => handleOpenDeleteDialog(library),
    });

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {libraries.map(lib => (
            <ProjectFolder 
              key={lib.id} 
              id={lib.id}
              name={lib.name}
              files={0}
              color={lib.color}
              basePath="/training-chatbot"
              modified={formatDistanceToNow(new Date(lib.updated_at), { addSuffix: true, locale: vi })}
              {...libraryActions(lib)}
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
              <TableHead>Tên thư viện</TableHead>
              <TableHead>Sửa đổi lần cuối</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {libraries.map(lib => (
              <ProjectListItem 
                key={lib.id} 
                id={lib.id}
                name={lib.name}
                files={0}
                color={lib.color}
                basePath="/training-chatbot"
                modified={formatDistanceToNow(new Date(lib.updated_at), { addSuffix: true, locale: vi })}
                {...libraryActions(lib)}
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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Thư viện Prompt</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Quản lý các bộ prompt để huấn luyện AI cho các mục đích khác nhau.
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tạo thư viện mới
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatWidget title="Tổng số thư viện" value={String(libraries.length)} icon={Folder} color="bg-blue-500" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm thư viện..." className="pl-9 bg-white rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white rounded-lg">Sắp xếp theo <ChevronDown className="ml-2 h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Tên</DropdownMenuItem>
                <DropdownMenuItem>Ngày sửa đổi</DropdownMenuItem>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingLibrary ? 'Sửa thư viện' : 'Tạo thư viện mới'}</DialogTitle>
            <DialogDescription>
              {editingLibrary ? 'Thay đổi tên cho thư viện của bạn.' : 'Nhập tên cho thư viện prompt mới.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="library-name">Tên thư viện</Label>
            <Input
              id="library-name"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              placeholder="VD: Prompt cho ngành F&B"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLibrary()}
              className="h-11 bg-slate-100/70 border-slate-200"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button>
            <Button onClick={handleSaveLibrary} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
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
              Hành động này không thể hoàn tác. Thư viện "{libraryToDelete?.name}" sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLibrary} className="bg-red-600 hover:bg-red-700 rounded-lg">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PromptLibrary;