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
  template_id: number | null;
};

type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
}[];

const PublicAiPlan = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planStructure, setPlanStructure] = useState<PlanStructure | null>(null);
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
          .select('id, name, plan_data, template_id')
          .eq('public_id', publicId)
          .eq('is_public', true)
          .single();
        
        if (error) throw error;
        if (!data) throw new Error("Không tìm thấy kế hoạch hoặc kế hoạch không được công khai.");
        
        setPlan(data);

        const templateId = data.template_id || 1;
        const { data: templateData, error: templateError } = await supabase
          .from('ai_plan_templates')
          .select('structure')
          .eq('id', templateId)
          .single();
        
        if (templateError) throw templateError;
        if (!templateData) throw new Error(`Template with ID ${templateId} not found.`);

        if (templateData.structure && typeof templateData.structure === 'object' && !Array.isArray(templateData.structure)) {
          const structure = templateData.structure as any;
          setPlanStructure(structure.output_fields || []);
        } else {
          setPlanStructure(templateData.structure as PlanStructure);
        }

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
        <div className="mb-8 text-center bg-blue-600 text-white p-8 rounded-2xl shadow-lg">
          <img src={hexaLogo} alt="DAILONG MEDIA Logo" className="w-48 h-auto mx-auto mb-4 filter brightness-0 invert" />
          <h1 className="text-4xl font-bold tracking-tight">{plan?.name}</h1>
          <p className="text-blue-200 mt-2">Một kế hoạch marketing được tạo bởi AI</p>
        </div>
        {plan && planStructure && <AiPlanContentView planData={plan.plan_data} planStructure={planStructure} />}
      </div>
    </main>
  );
};

export default PublicAiPlan;