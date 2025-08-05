import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AiPlanContentView } from '@/components/ai-plan/AiPlanContentView';
import hexaLogo from "@/assets/images/dailongmedia.png";

type Plan = {
  id: number;
  name: string;
  plan_data: any;
};

const PublicAiPlan = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!publicId) {
        setError("Không tìm thấy ID kế hoạch.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_plans')
          .select('id, name, plan_data')
          .eq('public_id', publicId)
          .eq('is_public', true)
          .single();
        
        if (error) throw error;
        if (!data) throw new Error("Không tìm thấy kế hoạch hoặc kế hoạch không được công khai.");
        
        setPlan(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlan();
  }, [publicId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-bold text-red-600">Lỗi</h1>
        <p className="mt-2 text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <main className="p-6 sm:p-8 md:p-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <img src={hexaLogo} alt="DAILONG MEDIA Logo" className="w-48 h-auto mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{plan?.name}</h1>
          <p className="text-muted-foreground mt-2">Một kế hoạch marketing được tạo bởi AI</p>
        </div>
        {plan && <AiPlanContentView planData={plan.plan_data} />}
      </div>
    </main>
  );
};

export default PublicAiPlan;