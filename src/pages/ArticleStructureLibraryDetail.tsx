import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStructureLibrary, useStructures, useCreateStructure, useUpdateStructure, useDeleteStructure } from '@/hooks/useLibraries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, Save, Loader2, Edit, LayoutTemplate } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';

type Structure = {
  id: number;
  name: string;
  description: string | null;
  structure_content: string | null;
};

const ArticleStructureLibraryDetail = () => {
  const { libraryId } = useParams<{ libraryId: string }>();
  const libraryIdNum = Number(libraryId);

  // React Query - data loads instantly from cache
  const { data: library, isLoading: isLoadingLibrary } = useStructureLibrary(libraryIdNum);
  const { data: structuresData = [], isLoading: isLoadingStructures, refetch: refetchStructures } = useStructures(libraryIdNum);

  const createStructure = useCreateStructure(libraryIdNum);
  const updateStructure = useUpdateStructure();
  const deleteStructureMutation = useDeleteStructure(libraryIdNum);

  const isLoading = isLoadingLibrary || isLoadingStructures;

  // Local state for structures to handle inline editing
  const [structures, setStructures] = useState<Structure[]>(structuresData);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStructureName, setNewStructureName] = useState('');
  const [structureToDelete, setStructureToDelete] = useState<Structure | null>(null);
  const [editingStructureId, setEditingStructureId] = useState<number | null>(null);
  const [editingStructureName, setEditingStructureName] = useState('');

  // Sync structures from query
  if (structuresData.length > 0 && structures.length === 0) {
    setStructures(structuresData as Structure[]);
  }

  const handleCreateStructure = async () => {
    if (!newStructureName.trim()) return;
    try {
      await createStructure.mutateAsync({ name: newStructureName });
      refetchStructures();
      setIsCreateDialogOpen(false);
      setNewStructureName('');
    } catch {
      // Error handled by hook
    }
  };

  const handleUpdateStructure = async (structure: Structure) => {
    try {
      await updateStructure.mutateAsync({
        id: structure.id,
        data: {
          description: structure.description,
          structure_content: structure.structure_content
        }
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleSaveName = async () => {
    if (!editingStructureId || !editingStructureName.trim()) {
      setEditingStructureId(null);
      return;
    }
    try {
      await updateStructure.mutateAsync({
        id: editingStructureId,
        data: { name: editingStructureName.trim() }
      });
      setStructures(prev => prev.map(s =>
        s.id === editingStructureId ? { ...s, name: editingStructureName.trim() } : s
      ));
    } catch {
      // Error handled by hook
    }
    setEditingStructureId(null);
  };

  const handleDeleteStructure = async () => {
    if (!structureToDelete) return;
    try {
      await deleteStructureMutation.mutateAsync(structureToDelete.id);
      setStructures(prev => prev.filter(s => s.id !== structureToDelete.id));
    } catch {
      // Error handled by hook
    }
    setStructureToDelete(null);
  };

  const handleStructureFieldChange = (id: number, field: 'description' | 'structure_content', value: string) => {
    setStructures(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  if (isLoading) {
    return (
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-2xl mt-8" />
      </main>
    );
  }

  if (!library) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <h1 className="text-3xl font-bold">Không tìm thấy thư viện</h1>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/training-chatbot">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{library.name}</h1>
            <p className="text-muted-foreground mt-1">Quản lý các cấu trúc bài viết cho thư viện này.</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          <PlusCircle className="mr-2 h-4 w-4" />Tạo cấu trúc
        </Button>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Danh sách cấu trúc</CardTitle>
          <CardDescription>Mỗi cấu trúc là một dàn bài mẫu để AI tuân theo.</CardDescription>
        </CardHeader>
        <CardContent>
          {structures.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {structures.map(structure => (
                <AccordionItem key={structure.id} value={`item-${structure.id}`} className="border rounded-xl bg-slate-50/50">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline rounded-t-xl">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <LayoutTemplate className="h-5 w-5 text-slate-600" />
                        {editingStructureId === structure.id ? (
                          <Input
                            value={editingStructureName}
                            onChange={(e) => setEditingStructureName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            onClick={(e) => e.stopPropagation()}
                            className="h-8"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{structure.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStructureId(structure.id); setEditingStructureName(structure.name); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStructureToDelete(structure)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 border-t bg-white rounded-b-xl">
                    <div className="space-y-4">
                      <div>
                        <Label>Mô tả</Label>
                        <Textarea
                          value={structure.description || ''}
                          onChange={e => handleStructureFieldChange(structure.id, 'description', e.target.value)}
                          placeholder="Mô tả ngắn gọn về mục đích của cấu trúc này..."
                        />
                      </div>
                      <div>
                        <Label>Cấu trúc</Label>
                        <Textarea
                          value={structure.structure_content || ''}
                          onChange={e => handleStructureFieldChange(structure.id, 'structure_content', e.target.value)}
                          placeholder="VD: Phần 1: Giới thiệu..."
                          className="min-h-[150px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => handleUpdateStructure(structure)} disabled={updateStructure.isPending}>
                          {updateStructure.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Save className="mr-2 h-4 w-4" />Lưu
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutTemplate className="mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">Chưa có cấu trúc nào</h3>
              <p className="mt-1 text-sm">Hãy bắt đầu bằng cách tạo một cấu trúc mới.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo cấu trúc mới</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="structure-name">Tên cấu trúc</Label>
            <Input id="structure-name" value={newStructureName} onChange={e => setNewStructureName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateStructure} disabled={createStructure.isPending}>
              {createStructure.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!structureToDelete} onOpenChange={() => setStructureToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn cấu trúc "{structureToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStructure} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default ArticleStructureLibraryDetail;