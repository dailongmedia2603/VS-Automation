import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { useAuth } from '@/contexts/AuthContext';

type Library = { id: number; name: string; };
type Structure = {
  id: number;
  name: string;
  description: string | null;
  structure_content: string | null;
};

const ArticleStructureLibraryDetail = () => {
  const { libraryId } = useParams<{ libraryId: string }>();
  const { user } = useAuth();
  const [library, setLibrary] = useState<Library | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStructureName, setNewStructureName] = useState('');
  const [structureToDelete, setStructureToDelete] = useState<Structure | null>(null);

  useEffect(() => {
    const fetchLibraryData = async () => {
      if (!libraryId) return;
      setIsLoading(true);
      try {
        const libPromise = supabase.from('article_structure_libraries').select('id, name').eq('id', libraryId).single();
        const structuresPromise = supabase.from('article_structures').select('*').eq('library_id', libraryId).order('created_at', { ascending: true });
        const [{ data: libData, error: libError }, { data: structuresData, error: structuresError }] = await Promise.all([libPromise, structuresPromise]);
        if (libError) throw libError;
        if (structuresError) throw structuresError;
        setLibrary(libData);
        setStructures(structuresData || []);
      } catch (error: any) {
        showError("Không thể tải dữ liệu: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibraryData();
  }, [libraryId]);

  const handleCreateStructure = async () => {
    if (!newStructureName.trim() || !libraryId || !user) return;
    setIsSaving(true);
    const { data, error } = await supabase
      .from('article_structures')
      .insert({ name: newStructureName, library_id: libraryId, creator_id: user.id })
      .select()
      .single();
    if (error) {
      showError("Tạo cấu trúc thất bại: " + error.message);
    } else if (data) {
      setStructures(prev => [...prev, data]);
      showSuccess("Đã tạo cấu trúc mới!");
    }
    setIsSaving(false);
    setIsCreateDialogOpen(false);
    setNewStructureName('');
  };

  const handleUpdateStructure = async (structure: Structure) => {
    const { error } = await supabase
      .from('article_structures')
      .update({ description: structure.description, structure_content: structure.structure_content })
      .eq('id', structure.id);
    if (error) showError("Lưu thất bại: " + error.message);
    else showSuccess("Đã lưu thay đổi!");
  };

  const handleDeleteStructure = async () => {
    if (!structureToDelete) return;
    const { error } = await supabase.from('article_structures').delete().eq('id', structureToDelete.id);
    if (error) {
      showError("Xóa thất bại: " + error.message);
    } else {
      setStructures(prev => prev.filter(s => s.id !== structureToDelete.id));
      showSuccess("Đã xóa cấu trúc!");
    }
    setStructureToDelete(null);
  };

  const handleStructureFieldChange = (id: number, field: 'description' | 'structure_content', value: string) => {
    setStructures(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  if (isLoading) {
    return <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50"><Skeleton className="h-10 w-1/3 rounded-lg" /><Skeleton className="h-96 w-full rounded-2xl mt-8" /></main>;
  }

  if (!library) {
    return <main className="flex-1 p-6 sm:p-8 bg-slate-50"><h1 className="text-3xl font-bold">Không tìm thấy thư viện</h1></main>;
  }

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/training-chatbot"><Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">{library.name}</h1><p className="text-muted-foreground mt-1">Quản lý các cấu trúc bài viết cho thư viện này.</p></div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><PlusCircle className="mr-2 h-4 w-4" />Tạo cấu trúc</Button>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader><CardTitle>Danh sách cấu trúc</CardTitle><CardDescription>Mỗi cấu trúc là một dàn bài mẫu để AI tuân theo.</CardDescription></CardHeader>
        <CardContent>
          {structures.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {structures.map(structure => (
                <AccordionItem key={structure.id} value={`item-${structure.id}`} className="border rounded-xl bg-slate-50/50">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline rounded-t-xl">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3"><LayoutTemplate className="h-5 w-5 text-slate-600" /><span className="font-semibold text-slate-800">{structure.name}</span></div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStructureToDelete(structure)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 border-t bg-white rounded-b-xl">
                    <div className="space-y-4">
                      <div><Label>Mô tả</Label><Textarea value={structure.description || ''} onChange={e => handleStructureFieldChange(structure.id, 'description', e.target.value)} placeholder="Mô tả ngắn gọn về mục đích của cấu trúc này..." /></div>
                      <div><Label>Cấu trúc</Label><Textarea value={structure.structure_content || ''} onChange={e => handleStructureFieldChange(structure.id, 'structure_content', e.target.value)} placeholder="VD: Phần 1: Giới thiệu..." className="min-h-[150px]" /></div>
                      <div className="flex justify-end"><Button size="sm" onClick={() => handleUpdateStructure(structure)}><Save className="mr-2 h-4 w-4" />Lưu</Button></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><LayoutTemplate className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-semibold">Chưa có cấu trúc nào</h3><p className="mt-1 text-sm">Hãy bắt đầu bằng cách tạo một cấu trúc mới.</p></div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Tạo cấu trúc mới</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="structure-name">Tên cấu trúc</Label><Input id="structure-name" value={newStructureName} onChange={e => setNewStructureName(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Hủy</Button><Button onClick={handleCreateStructure} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={!!structureToDelete} onOpenChange={() => setStructureToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn cấu trúc "{structureToDelete?.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteStructure} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default ArticleStructureLibraryDetail;