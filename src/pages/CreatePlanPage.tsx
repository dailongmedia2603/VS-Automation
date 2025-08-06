import { useState } from "react";
import { AiPlanContentView } from "@/components/ai-plan/AiPlanContentView";
import { DynamicInputForm } from "@/components/ai-plan/DynamicInputForm";
import { InputConfigurationDialog } from "@/components/ai-plan/InputConfigurationDialog";
import { FormFieldConfig, PlanData, PlanStructure } from "@/types/ai-plan";
import { Bot, Sparkles } from "lucide-react";

const initialFormFields: FormFieldConfig[] = [
  {
    id: 'muc_tieu_seeding',
    title: 'Mục tiêu Seeding',
    type: 'textarea',
    placeholder: 'Yêu cầu dựa vào mục tiêu seeding để xây dựng kế hoạch seeding bám theo mục tiêu'
  },
  {
    id: 'thoi_gian_trien_khai',
    title: 'Thời gian triển khai',
    type: 'input',
    placeholder: 'Dựa vào thời gian triển khai để xây dựng kế hoạch cho phù hợp'
  },
  {
    id: 'san_pham',
    title: 'Sản phẩm',
    type: 'textarea',
    placeholder: 'Mục tiêu là seeding cho các sản phẩm dưới đây. Nhưng không phải là PR trực tiếp mà thông qua hoạt động seeding (đóng vai là người dùng thật) để PR khéo léo về sản phẩm'
  }
];

const initialPlanStructure: PlanStructure[] = [
    { id: 'muc_tieu_tong_the', label: 'Mục tiêu tổng thể', type: 'textarea', icon: 'Target' },
    { id: 'thoi_gian_va_ngan_sach', label: 'Thời gian & Ngân sách', type: 'textarea', icon: 'Calendar' },
    { id: 'san_pham_dich_vu', label: 'Sản phẩm/Dịch vụ', type: 'textarea', icon: 'Package' },
    { id: 'kenh_trien_khai', label: 'Kênh triển khai', type: 'textarea', icon: 'Route' },
    { id: 'thong_diep_truyen_thong', label: 'Thông điệp truyền thông', type: 'textarea', icon: 'Megaphone' },
];

const CreatePlanPage = () => {
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(initialFormFields);
  const [formData, setFormData] = useState<{ [key: string]: string }>({
    'muc_tieu_seeding': 'Tăng nhận diện thương hiệu sữa Maeil 1, 2, 3',
    'thoi_gian_trien_khai': '1 tháng',
    'san_pham': 'Sữa Maeil số 1, 2, 3'
  });
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [planStructure, setPlanStructure] = useState<PlanStructure[]>(initialPlanStructure);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFormDataChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveConfig = (newFields: FormFieldConfig[]) => {
    setFormFields(newFields);
    const newFormData = { ...formData };
    const newFieldIds = new Set(newFields.map(f => f.id));
    Object.keys(newFormData).forEach(key => {
      if (!newFieldIds.has(key)) {
        delete newFormData[key];
      }
    });
    setFormData(newFormData);
  };

  const handleSubmit = () => {
    setIsGenerating(true);
    console.log("Generating plan with data:", formData);
    setTimeout(() => {
      const mockPlanData: PlanData = {
        muc_tieu_tong_the: "Tăng 30% nhận diện thương hiệu sữa Maeil trong vòng 1 tháng trên các nền tảng mạng xã hội mục tiêu.",
        thoi_gian_va_ngan_sach: "Thời gian: 1 tháng. Ngân sách dự kiến: 50,000,000 VND.",
        san_pham_dich_vu: "Tập trung vào dòng sản phẩm sữa Maeil số 1, 2, và 3.",
        kenh_trien_khai: "Facebook (các group mẹ và bé), TikTok (KOLs review), Instagram (influencers).",
        thong_diep_truyen_thong: "'Sữa Maeil - Dinh dưỡng chuẩn Hàn cho bé yêu phát triển toàn diện'.",
        dinh_huong_content: [
            { loai_content: "Review sản phẩm", chu_de: "Review sữa Maeil số 1 cho bé 0-6 tháng", van_de: "Mẹ bỉm sữa lo lắng tìm sữa mát, không gây táo bón cho con.", content_demo: "Hôm trước em vừa đổi sữa cho bé nhà em sang dòng Maeil này các mom ạ. Trộm vía con hợp tác, output đều đặn, không bị táo nữa. Sữa vị nhạt thanh dễ uống lắm...", dinh_huong_comment: "Hỏi về chỗ mua, giá cả, bé dùng có tăng cân tốt không." },
            { loai_content: "Chia sẻ kinh nghiệm", chu_de: "Bí quyết chọn sữa cho con của mẹ thông thái", van_de: "Nhiều loại sữa trên thị trường, không biết chọn loại nào.", content_demo: "Mình có 3 tiêu chí chọn sữa cho con: 1. Thương hiệu uy tín, 2. Thành phần dinh dưỡng, 3. Con hợp tác. Và Maeil là chân ái đáp ứng đủ cả 3...", dinh_huong_comment: "Thảo luận về các tiêu chí chọn sữa, chia sẻ kinh nghiệm dùng các loại sữa khác." }
        ]
      };
      const mockPlanStructure: PlanStructure[] = [
        ...initialPlanStructure,
        { id: 'dinh_huong_content', label: 'Định hướng Content', type: 'dynamic_group', icon: 'Newspaper' }
      ];
      setPlanData(mockPlanData);
      setPlanStructure(mockPlanStructure);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="lg:col-span-1">
          <DynamicInputForm
            fields={formFields}
            formData={formData}
            onFormDataChange={handleFormDataChange}
            onConfigure={() => setIsConfigDialogOpen(true)}
            onSubmit={handleSubmit}
            isGenerating={isGenerating}
          />
        </div>

        <div className="lg:col-span-1">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 rounded-lg bg-slate-50 min-h-[600px]">
              <Sparkles className="h-16 w-16 text-blue-500 mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-slate-700">AI đang tạo kế hoạch...</h3>
              <p className="mt-2 text-sm max-w-sm">Quá trình này có thể mất một vài phút. Vui lòng không rời khỏi trang.</p>
            </div>
          ) : planData ? (
            <AiPlanContentView planData={planData} planStructure={planStructure} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 rounded-lg bg-slate-50 min-h-[600px]">
              <Bot className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700">Kế hoạch của bạn sẽ xuất hiện ở đây</h3>
              <p className="mt-2 text-sm max-w-sm">Điền thông tin đầu vào và nhấn "Tạo kế hoạch AI" để bắt đầu.</p>
            </div>
          )}
        </div>
      </div>

      <InputConfigurationDialog
        isOpen={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        initialFields={formFields}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default CreatePlanPage;