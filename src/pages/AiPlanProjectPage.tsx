import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AiPlanInputForm } from '@/components/ai-plan/AiPlanInputForm';
import { InputFieldConfig } from '@/components/ai-plan/InputConfigModal';
import { AiPlanContentView } from '@/components/ai-plan/AiPlanContentView';
import { Loader2, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';

// Các trường mặc định nếu chưa có cấu hình trong CSDL
const DEFAULT_FIELDS: InputFieldConfig[] = [
  { id: 'product_info', title: 'Thông tin sản phẩm/dịch vụ', description: 'Mô tả sản phẩm, điểm nổi bật, giá cả...', fieldType: 'textarea' },
  { id: 'target_audience', title: 'Đối tượng khách hàng mục tiêu', description: 'Độ tuổi, giới tính, sở thích, vấn đề họ gặp phải...', fieldType: 'textarea' },
  { id: 'key_message', title: 'Thông điệp chính', description: 'Thông điệp cốt lõi bạn muốn truyền tải', fieldType: 'input' },
  { id: 'tone_style', title: 'Tông giọng & Phong cách', description: 'VD: Thân thiện, chuyên gia, hài hước...', fieldType: 'input' },
];

const AiPlanProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [plan, setPlan] = useState<any>(null);
  const [fieldsConfig, setFieldsConfig] = useState<InputFieldConfig[]>([]);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!projectId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_plans')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        showError('Không thể tải dữ liệu dự án.');
        console.error(error);
      } else if (data) {
        setPlan(data);
        // `config` lưu cấu trúc form, `plan_data` lưu dữ liệu form
        setFieldsConfig(data.config || DEFAULT_FIELDS);
        setFormData(data.plan_data || {});
      }
      setLoading(false);
    };

    fetchPlan();
  }, [projectId]);

  const handleSaveConfiguration = async (newFields: InputFieldConfig[]) => {
    if (!projectId) return;
    const { error } = await supabase
      .from('ai_plans')
      .update({ config: newFields, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) {
      showError('Lỗi khi lưu cấu hình.');
    } else {
      setFieldsConfig(newFields);
      showSuccess('Đã lưu cấu hình thành công!');
    }
  };

  const handleDataChange = async (newData: { [key: string]: string }) => {
    setFormData(newData);
    // TODO: Nên sử dụng debounce để tránh lưu quá nhiều lần
    if (!projectId) return;
    const { error } = await supabase
      .from('ai_plans')
      .update({ plan_data: newData, updated_at: new Date().toISOString() })
      .eq('id', projectId);
    
    if (error) {
        showError('Lỗi khi lưu dữ liệu.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }

  if (!plan) {
    return <div className="text-center p-8">Không tìm thấy dự án.</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button asChild variant="ghost" className="mb-4">
                    <Link to="/">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại danh sách
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold text-slate-800">Dự án: {plan.name || `ID ${projectId}`}</h1>
                <p className="text-slate-500 mt-1">Cung cấp thông tin để AI xây dựng kế hoạch marketing chi tiết.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="lg:col-span-1 space-y-8">
                    <AiPlanInputForm
                        fieldsConfig={fieldsConfig}
                        formData={formData}
                        onDataChange={handleDataChange}
                        onSaveConfiguration={handleSaveConfiguration}
                    />
                </div>
                
                <div className="lg:col-span-1 sticky top-8">
                    {/* Phần hiển thị kết quả sẽ được đặt ở đây */}
                    {/* <AiPlanContentView 
                        planData={plan.plan_output_data} 
                        planStructure={plan.plan_output_structure}
                    /> */}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AiPlanProjectPage;