import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiPlanService } from '@/api/tools';
import { Skeleton } from '@/components/ui/skeleton';
import { AiPlanContentView } from '@/components/ai-plan/AiPlanContentView';
import apiClient from '@/api/client';

type PublicSettings = {
  company_name: string;
  description: string;
  logo_url: string | null;
  logo_width: number | null;
  logo_height: number | null;
};

type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  display_type?: 'simple' | 'content_direction' | 'post_scan';
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
}[];

const PublicAiPlan = () => {
  const { planSlug } = useParams<{ planSlug: string }>();

  // React Query - data loads instantly from cache
  const { data: plan, isLoading: isLoadingPlan, error: planError } = useQuery({
    queryKey: ['public-ai-plan', planSlug],
    queryFn: () => aiPlanService.getPublic(planSlug!),
    enabled: !!planSlug,
  });

  const { data: publicSettings } = useQuery({
    queryKey: ['public-page-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/settings/public-page');
      return response.data.settings as PublicSettings;
    },
  });

  const { data: template } = useQuery({
    queryKey: ['ai-plan-template', plan?.template_id],
    queryFn: async () => {
      const templateId = plan?.template_id || 1;
      const response = await apiClient.get(`/ai-plan/templates/${templateId}`);
      return response.data.template;
    },
    enabled: !!plan,
  });

  const isLoading = isLoadingPlan;

  const planStructure = template?.structure?.output_fields || template?.structure || [];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-bold text-red-600">Lỗi</h1>
        <p className="mt-2 text-slate-600">Không tìm thấy kế hoạch hoặc kế hoạch không được công khai.</p>
      </div>
    );
  }

  const headerTitle = `KẾ HOẠCH SEEDING "${plan?.name}"`;
  const headerDescription = publicSettings?.description || 'Một kế hoạch marketing được tạo bởi AI';
  const logoUrl = publicSettings?.logo_url;
  const logoWidth = publicSettings?.logo_width;
  const logoHeight = publicSettings?.logo_height;

  const logoStyle: React.CSSProperties = {};
  if (logoWidth) logoStyle.width = `${logoWidth}px`;
  if (logoHeight) logoStyle.height = `${logoHeight}px`;
  if (!logoWidth && !logoHeight) {
    logoStyle.maxHeight = '96px';
    logoStyle.width = 'auto';
  }

  return (
    <main className="p-6 sm:p-8 md:p-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center bg-blue-600 text-white p-8 rounded-2xl shadow-lg">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="mx-auto mb-4"
              style={logoStyle}
            />
          )}
          <h1 className="text-4xl font-bold tracking-tight">{headerTitle}</h1>
          <p className="text-blue-200 mt-2">{headerDescription}</p>
        </div>
        {plan && planStructure && <AiPlanContentView planData={plan.plan_data} planStructure={planStructure} />}
      </div>
    </main>
  );
};

export default PublicAiPlan;