import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, Save, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

type Condition = {
  id: string;
  content: string;
};

type Library = {
  id: number;
  name: string;
  conditions: Condition[];
};

const ConditionLibraryDetail = () => {
  const { libraryId } = useParams<{ libraryId: string }>();
  const [library, setLibrary] = useState<Library | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!libraryId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('condition_libraries')
          .select('id, name, conditions')
          .eq('id', libraryId)
          .single();

        if (error) throw error;
        
        setLibrary(data);
        // Ensure conditions have unique IDs if they don't already
        const conditionsWithIds = (data.conditions || []).map((cond: any) => 
          typeof cond === 'string' ? { id: crypto.randomUUID(), content: cond } : { ...cond, id: cond.id || crypto.randomUUID() }
        );
        setConditions(conditionsWithIds);

      } catch (error: any) {
        showError("Không thể tải thư viện: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibrary();
  }, [libraryId]);

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
    setIsSaving(true);
    const conditionsToSave = conditions.filter(c => c.content.trim() !== '');
    const { error } = await supabase
      .from('condition_libraries')
      .update({ conditions: conditionsToSave, updated_at: new Date().toISOString() })
      .eq('id', libraryId);

    if (error) {
      showError("Lưu thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu các điều kiện thành công!");
    }
    setIsSaving(false);
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
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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