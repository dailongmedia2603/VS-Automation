import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, Calendar, Package, Route, Megaphone, Bot, LayoutList, Newspaper, AlertTriangle, ClipboardList, MessageSquareText, PencilLine, Sparkles, Loader2, Compass } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { showError } from "@/utils/toast";

// --- TYPE DEFINITIONS ---
type PlanData = { [key: string]: any };
type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
};
type ContentItem = {
  loai_content: string;
  chu_de: string;
  van_de: string;
  content_demo: string;
  dinh_huong_comment: string;
};
type ContentItemWithGeneratedName = ContentItem & { bai_viet_name: string };

interface AiPlanContentViewProps {
  planData: PlanData;
  planStructure: PlanStructure[];
  isEditable?: boolean;
  editingSectionId?: string | null;
  setEditingSectionId?: (id: string | null) => void;
  onUpdateSection?: (sectionId: string, newContent: any) => Promise<void>;
  onRegenerateSection?: (sectionId: string, sectionLabel: string) => void;
}

const iconMapping: { [key: string]: React.ElementType } = { Target, Calendar, Package, Route, Megaphone, default: Target };
const iconColorMapping: { [key: string]: string } = {
  Target: 'bg-blue-100 text-blue-600',
  Calendar: 'bg-red-100 text-red-600',
  Package: 'bg-green-100 text-green-600',
  Route: 'bg-purple-100 text-purple-600',
  Megaphone: 'bg-yellow-100 text-yellow-600',
  default: 'bg-slate-100 text-slate-600',
};

// --- HELPER FUNCTIONS & COMPONENTS ---
const isContentDirectionData = (data: any): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false;
  const firstItem = data[0];
  if (typeof firstItem !== 'object' || firstItem === null) return false;
  const expectedKeys = ['loai_content', 'chu_de', 'van_de', 'content_demo'];
  return expectedKeys.every(key => key in firstItem);
};

// --- LEFT PANEL: INPUT FORM ---
const AiPlanInputPanel = () => {
    const [inputData, setInputData] = useState<{ [key: string]: string }>({});

    const handleDataChange = (id: string, value: string) => setInputData(prev => ({ ...prev, [id]: value }));

    return (
        <Card className="h-full shadow-lg">
            <CardHeader className="border-b">
                <CardTitle>Thông tin đầu vào</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">Nhập thông tin chi tiết về chiến dịch của bạn.</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="san_pham_dich_vu" className="font-semibold">Thông tin sản phẩm/dịch vụ</Label>
                    <Textarea 
                        id="san_pham_dich_vu" 
                        placeholder="Mô tả sản phẩm, điểm nổi bật, giá cả..." 
                        value={inputData['san_pham_dich_vu'] || ''} 
                        onChange={(e) => handleDataChange('san_pham_dich_vu', e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="doi_tuong_khach_hang" className="font-semibold">Đối tượng khách hàng mục tiêu</Label>
                    <Textarea 
                        id="doi_tuong_khach_hang" 
                        placeholder="Độ tuổi, giới tính, sở thích, vấn đề họ gặp phải..." 
                        value={inputData['doi_tuong_khach_hang'] || ''} 
                        onChange={(e) => handleDataChange('doi_tuong_khach_hang', e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="thong_diep_chinh" className="font-semibold">Thông điệp chính</Label>
                    <Input 
                        id="thong_diep_chinh" 
                        placeholder="Thông điệp cốt lõi bạn muốn truyền tải" 
                        value={inputData['thong_diep_chinh'] || ''} 
                        onChange={(e) => handleDataChange('thong_diep_chinh', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tong_giong_phong_cach" className="font-semibold">Tổng giọng & Phong cách</Label>
                    <Input 
                        id="tong_giong_phong_cach" 
                        placeholder="VD: Thân thiện, chuyên gia, hài hước..." 
                        value={inputData['tong_giong_phong_cach'] || ''} 
                        onChange={(e) => handleDataChange('tong_giong_phong_cach', e.target.value)}
                    />
                </div>

                <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <Compass className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Định hướng</h4>
                            <p className="text-sm text-muted-foreground">Cung cấp chỉ dẫn chi tiết và ví dụ cho AI.</p>
                        </div>
                    </div>
                    <div className="space-y-4 pl-[3.25rem]">
                        <div className="space-y-2">
                            <Label htmlFor="dinh_huong_noi_dung" className="text-sm font-medium">Định hướng nội dung</Label>
                            <Textarea 
                                id="dinh_huong_noi_dung" 
                                placeholder="Ví dụ: Tập trung vào lợi ích cho mẹ và bé..." 
                                value={inputData['dinh_huong_noi_dung'] || ''} 
                                onChange={(e) => handleDataChange('dinh_huong_noi_dung', e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vi_du_tham_khao" className="text-sm font-medium">Ví dụ tham khảo</Label>
                            <Textarea 
                                id="vi_du_tham_khao" 
                                placeholder="Ví dụ: https://community.theasianparent.com/..." 
                                value={inputData['vi_du_tham_khao'] || ''} 
                                onChange={(e) => handleDataChange('vi_du_tham_khao', e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


// --- RIGHT PANEL: OUTPUT VIEW ---
const AiPlanOutputPanel = (props: AiPlanContentViewProps) => {
  const { planData, planStructure, isEditable = false, editingSectionId, setEditingSectionId, onUpdateSection, onRegenerateSection } = props;
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sectionsWithData = useMemo(() => {
    if (!planStructure) return [];
    return planStructure.map(section => ({ ...section, sectionData: planData[section.id] })).filter(s => s.sectionData);
  }, [planData, planStructure]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => entry.isIntersecting && setActiveSection(entry.target.id)),
      { rootMargin: "-30% 0px -70% 0px", threshold: 0 }
    );
    const sections = mainContentRef.current?.querySelectorAll('section[id]');
    if (sections) sections.forEach((section) => observer.observe(section));
    if (!activeSection && sectionsWithData.length > 0) setActiveSection(sectionsWithData[0].id);
    return () => sections?.forEach((section) => observer.unobserve(section));
  }, [sectionsWithData, activeSection]);

  const handleNavClick = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sectionId);
  };

  if (!planData || !planStructure) {
    return <Card><CardContent className="p-8 text-center text-slate-500">Chưa có nội dung kế hoạch.</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
      <aside className="sticky top-24">
        <h3 className="font-semibold text-slate-900 mb-4 px-4">Nội dung kế hoạch</h3>
        <nav>
          <ul className="space-y-2">
            {sectionsWithData.map(section => {
              const Icon = iconMapping[section.icon] || iconMapping.default;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <Button variant="ghost" className={cn("w-full h-auto justify-start items-center p-3 rounded-lg", isActive ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100")} onClick={() => handleNavClick(section.id)}>
                    <div className={cn("w-9 h-9 rounded-md flex items-center justify-center mr-4", isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}><Icon className="h-5 w-5" /></div>
                    <span className={cn("font-medium text-sm", isActive && "font-semibold")}>{section.label}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main ref={mainContentRef} className="space-y-12">
        {sectionsWithData.map(section => {
          const Icon = iconMapping[section.icon] || iconMapping.default;
          const [iconBg, iconText] = (iconColorMapping[section.icon] || iconColorMapping.default).split(' ');
          const isEditing = isEditable && editingSectionId === section.id;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24 group">
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-6 bg-slate-50/50 border-b">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconBg)}><Icon className={cn("h-6 w-6", iconText)} /></div>
                    <h2 className="text-2xl font-bold text-slate-800">{section.label}</h2>
                  </div>
                  {isEditable && !isEditing && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="outline" className="bg-white" onClick={() => setEditingSectionId?.(section.id)}><PencilLine className="h-4 w-4 mr-2" />Sửa</Button>
                      <Button size="sm" variant="outline" className="bg-white" onClick={() => onRegenerateSection?.(section.id, section.label)}><Sparkles className="h-4 w-4 mr-2" />Tạo lại</Button>
                    </div>
                  )}
                </CardHeader>
                {isEditing ? (
                  <EditView sectionData={section.sectionData} onSave={(newContent) => onUpdateSection!(section.id, newContent)} onCancel={() => setEditingSectionId?.(null)} />
                ) : (
                  isContentDirectionData(section.sectionData) ? (
                    <div className="p-4"><ContentDirectionViewIntegrated data={section.sectionData} /></div>
                  ) : (
                    <CardContent className="p-6 prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{String(section.sectionData)}</ReactMarkdown></CardContent>
                  )
                )}
              </Card>
            </section>
          );
        })}
      </main>
    </div>
  );
};

// --- HELPER COMPONENTS FOR OUTPUT PANEL ---
const ContentDirectionViewIntegrated = ({ data }: { data: ContentItem[] }) => {
  const [selectedItem, setSelectedItem] = useState<ContentItemWithGeneratedName | null>(null);
  const groupedData = useMemo(() => {
    const groups = data.reduce((acc, item) => {
      const key = item.loai_content || 'Chưa phân loại';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);
    return Object.entries(groups).map(([type, items]) => ({
      type,
      items: items.map((item, index) => ({ ...item, bai_viet_name: `Bài viết ${index + 1}` }))
    }));
  }, [data]);

  useEffect(() => {
    if (groupedData.length > 0 && groupedData[0].items.length > 0) setSelectedItem(groupedData[0].items[0]);
  }, [groupedData]);

  return (
    <div className="border rounded-lg overflow-hidden h-[700px] flex flex-col bg-white">
      <div className="grid md:grid-cols-[320px_1fr] flex-grow min-h-0">
        <ScrollArea className="h-full border-r bg-slate-50/70 p-2">
          {groupedData.map(({ type, items }) => (
            <div key={type} className="mb-2">
              <h3 className="px-3 py-2 text-sm font-semibold text-slate-500 flex items-center gap-2"><Newspaper className="h-4 w-4" />{type}</h3>
              {items.map((item, index) => (
                <Button key={index} variant="ghost" onClick={() => setSelectedItem(item)} className={cn("w-full justify-start h-auto py-2 px-3 text-left", selectedItem === item && "bg-blue-100 text-blue-700")}>
                  <span className="truncate">{item.bai_viet_name}: {item.chu_de}</span>
                </Button>
              ))}
            </div>
          ))}
        </ScrollArea>
        <ScrollArea className="h-full p-6">
          {selectedItem ? (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold">{selectedItem.chu_de}</h2>
              <DetailSection title="Vấn đề / Tình trạng" content={selectedItem.van_de} icon={AlertTriangle} iconBg="bg-red-100" iconText="text-red-600" />
              <DetailSection title="Content Demo" content={selectedItem.content_demo} icon={ClipboardList} iconBg="bg-green-100" iconText="text-green-600" />
              <DetailSection title="Định hướng comment" content={selectedItem.dinh_huong_comment} icon={MessageSquareText} iconBg="bg-purple-100" iconText="text-purple-600" />
            </div>
          ) : <div className="text-center p-8">Chọn bài viết để xem.</div>}
        </ScrollArea>
      </div>
    </div>
  );
};

const DetailSection = ({ title, content, icon: Icon, iconBg, iconText }: { title: string, content: string, icon: React.ElementType, iconBg: string, iconText: string }) => (
  <div>
    <div className="flex items-center gap-3 mb-2">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}><Icon className={cn("h-5 w-5", iconText)} /></div>
      <h4 className="font-semibold">{title}</h4>
    </div>
    <div className="prose prose-sm max-w-none pl-[52px]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content || 'N/A'}</ReactMarkdown></div>
  </div>
);

const EditView = ({ sectionData, onSave, onCancel }: { sectionData: any, onSave: (d: any) => Promise<void>, onCancel: () => void }) => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => setContent(typeof sectionData === 'object' ? JSON.stringify(sectionData, null, 2) : String(sectionData || '')), [sectionData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(typeof sectionData === 'object' ? JSON.parse(content) : content);
      onCancel();
    } catch (e) { showError("Nội dung JSON không hợp lệ."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="p-6">
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[250px] font-mono text-sm" />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onCancel}>Hủy</Button>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT COMPONENT ---
export const AiPlanContentView = (props: AiPlanContentViewProps) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
      <div className="lg:sticky top-6 self-start">
        <AiPlanInputPanel />
      </div>
      <div className="w-full">
        <AiPlanOutputPanel {...props} />
      </div>
    </div>
  );
};