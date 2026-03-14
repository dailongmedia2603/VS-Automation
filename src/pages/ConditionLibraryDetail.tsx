import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConditionLibrary, useUpdateConditionLibrary } from '@/hooks/useLibraries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, Save, Loader2 } from 'lucide-react';

type Condition = {
  id: string;
  content: string;
};

const ConditionLibraryDetail = () => {
  const { libraryId } = useParams<{ libraryId: string }>();

  // React Query - data loads instantly from cache
  const { data: library, isLoading } = useConditionLibrary(Number(libraryId));
  const updateLibrary = useUpdateConditionLibrary();

  // Initialize conditions from library data
  const initialConditions = useMemo(() => {
    if (!library) return [];
    const rawData = library as any;
    const rawConditions = rawData.conditions || rawData.config?.conditions || [];
    return rawConditions.map((cond: any) =>
      typeof cond === 'string'
        ? { id: crypto.randomUUID(), content: cond }
        : { ...cond, id: cond.id || crypto.randomUUID() }
    );
  }, [library]);

  const [conditions, setConditions] = useState<Condition[]>(initialConditions);

  // Update conditions when library loads
  useMemo(() => {
    if (library) {
      const rawData = library as any;
      const rawConditions = rawData.conditions || rawData.config?.conditions || [];
      const conditionsWithIds = rawConditions.map((cond: any) =>
        typeof cond === 'string'
          ? { id: crypto.randomUUID(), content: cond }
          : { ...cond, id: cond.id || crypto.randomUUID() }
      );
      setConditions(conditionsWithIds);
    }
  }, [library]);

  const handleConditionChange = (id: string, content: string) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  };

  const handleAddCondition = () => {
    setConditions(prev => [...prev, { id: crypto.randomUUID(), content: '' }]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!libraryId) return;
    const conditionsToSave = conditions.filter(c => c.content.trim() !== '');
    const currentConfig = (library as any)?.config || {};

    await updateLibrary.mutateAsync({
      id: Number(libraryId),
      data: { config: { ...currentConfig, conditions: conditionsToSave } }
    });
  };

  if (isLoading) {
    return (
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-2xl" />
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
            <p className="text-muted-foreground mt-1">
              Quản lý các điều kiện bắt buộc cho thư viện này.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateLibrary.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          {updateLibrary.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </div>

      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle>Danh sách điều kiện</CardTitle>
          <CardDescription>Mỗi điều kiện là một quy tắc mà AI phải tuân thủ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={condition.id} className="flex items-center gap-3">
              <span className="font-semibold text-slate-500">{index + 1}.</span>
              <Input
                value={condition.content}
                onChange={(e) => handleConditionChange(condition.id, e.target.value)}
                placeholder="VD: Không được nhắc đến giá sản phẩm"
                className="bg-slate-50"
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveCondition(condition.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleAddCondition} className="border-dashed">
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm điều kiện
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default ConditionLibraryDetail;