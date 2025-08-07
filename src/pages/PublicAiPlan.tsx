import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AiPlanContentView } from '@/components/ai-plan/AiPlanContentView';

type Plan = {
  id: number;
  name: string;
  plan_data: any;
  template_id: number | null;
};

type PublicSettings = {
  company_name: string;
  description: string;
  logo_url: string | null;
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
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
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
        const planPromise = supabase
          .from('ai_plans')
          .select('id, name, plan_data, template_id')
          .eq('public_id', publicId)
          .eq('is_public', true)
          .single();
        
        const settingsPromise = supabase
          .from('public_page_settings')
          .select('company_name, description, logo_url')
          .eq('id', 1)
          .single();

        const [{ data: planData, error: planError }, { data: settingsData, error: settingsError }] = await Promise.all([planPromise, settingsPromise]);
        
        if (planError) throw planError;
        if (!planData) throw new Error("Không tìm thấy kế hoạch hoặc kế hoạch không được công khai.");
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        
        setPlan(planData);
        setPublicSettings(settingsData);

        const templateId = planData.template_id || 1;
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

  const headerTitle = publicSettings?.company_name || 'DAILONG MEDIA AGENCY';
  const headerDescription = publicSettings?.description || 'Một kế hoạch marketing được tạo bởi AI';
  const logoUrl = publicSettings?.logo_url;

  return (
    <main className="p-6 sm:p-8 md:p-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center bg-blue-600 text-white p-8 rounded-2xl shadow-lg">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="max-w-[24rem] h-auto mx-auto mb-4" />
          ) : (
            <h2 className="text-2xl font-bold tracking-tight mb-4">{headerTitle}</h2>
          )}
          <h1 className="text-4xl font-bold tracking-tight">{plan?.name}</h1>
          <p className="text-blue-200 mt-2">{headerDescription}</p>
        </div>
        {plan && planStructure && <AiPlanContentView planData={plan.plan_data} planStructure={planStructure} />}
      </div>
    </main>
  );
};

export default PublicAiPlan;