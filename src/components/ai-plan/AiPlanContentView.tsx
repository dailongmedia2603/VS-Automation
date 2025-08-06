import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, Calendar, Package, Route, Megaphone, Bot, LayoutList, Newspaper, AlertTriangle, ClipboardList, MessageSquareText, PencilLine, Sparkles, Loader2, Settings, FileSearch } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/utils/toast";
import { InputConfigDialog } from "./InputConfigDialog";

// Type Definitions
type PlanData = { [key: string]: any };
type PlanStructureField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  display_type?: 'simple' | 'content_direction';
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
};

interface AiPlanContentViewProps {
  planData: PlanData;
  planStructure: PlanStructureField[];
  isEditable?: boolean;
  editingSectionId?: string | null;
  setEditingSectionId?: (id: string | null) => void;
  onUpdateSection?: (sectionId: string, newContent: any) => Promise<void>;
  onRegenerateSection?: (sectionId: string, sectionLabel: string) => void;
  onUpdateConfig?: (newConfig: any) => Promise<void>;
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

// Helper to normalize keys from AI response for flexible matching
const normalizeKeys = (obj: any) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    const normalizedKey = key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/đ/g, "d")
      .replace(/[\s_-]/g, ''); // remove spaces, underscores, hyphens
    newObj[normalizedKey] = obj[key];
  }
  return newObj;
};

// Helper function to check if the data should be rendered by the special component
const isContentDirectionData = (data: any): boolean => {
  return Array.isArray(data);
};

// --- Sub-component for Content Direction (Master-Detail View) ---
const ContentDirectionViewIntegrated = ({ data }: { data: any[] }) => {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const groupedData = useMemo(() => {
    if (!Array.isArray(data)) return {};
    
    const groups = data.reduce((acc, item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const normalizedItem = normalizeKeys(item);
        const key = normalizedItem.loaicontent || normalizedItem.posttype || 'Chưa phân loại';
        if (!acc[key]) acc[key] = [];
        acc[key].push(normalizedItem);
      }
      return acc;
    }, {} as Record<string, any[]>);

    for (const key in groups) {
      groups[key] = groups[key].map((item, index) => ({ ...item, bai_viet_name: `Bài viết ${index + 1}` }));
    }
    return groups;
  }, [data]);

  useEffect(() => {
    const firstGroupKey = Object.keys(groupedData)[0];
    if (firstGroupKey && groupedData[firstGroupKey].length > 0) {
      setSelectedItem(groupedData[firstGroupKey][0]);
    } else {
      setSelectedItem(null);
    }
  }, [groupedData]);

  const DetailSection = ({ title, content, icon: Icon, iconBg, iconText }: { title: string, content: string, icon: React.ElementType, iconBg: string, iconText: string }) => (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}><Icon className={cn("h-5 w-5", iconText)} /></div>
        <h4 className="text-md font-semibold text-slate-800">{title}</h4>
      </div>
      <div className="prose prose-sm max-w-none prose-slate pl-[52px] text-slate-600"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '(Chưa có nội dung)'}</ReactMarkdown></div>
    </div>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="grid md:grid-cols-[320px_1fr]">
        <div className="border-r bg-slate-50/70">
          <ScrollArea className="h-[700px] p-2">
            {Object.entries(groupedData).map(([type, items]) => (
              <div key={type} className="mb-2">
                <h3 className="px-3 py-2 text-sm font-bold text-slate-800 bg-slate-100 rounded-md flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-slate-500" /> {type}
                </h3>
                <div className="flex flex-col gap-1 mt-1">
                  {(items as any[]).map((item, index) => (
                    <Button key={`${item.bai_viet_name}-${index}`} variant="ghost" onClick={() => setSelectedItem(item)} className={cn("w-full justify-start h-auto py-2 px-3 text-left", selectedItem === item ? "bg-blue-100 text-blue-700 font-semibold" : "")}>
                      <span className="whitespace-normal">{item.bai_viet_name}: {item.chude || item.topic || item.chudecantim}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
        <div className="p-6">
          {selectedItem ? (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-slate-900">{selectedItem.chude || selectedItem.topic || selectedItem.chudecantim}</h2>
              <DetailSection title="Chủ đề cần tìm" content={selectedItem.chudecantim} icon={FileSearch} iconBg="bg-blue-100" iconText="text-blue-600" />
              <DetailSection title="Content comment demo" content={selectedItem.contentcommentdemo} icon={ClipboardList} iconBg="bg-green-100" iconText="text-green-600" />
              <DetailSection title="Định hướng comment" content={selectedItem.dinhhuongcomment} icon={MessageSquareText} iconBg="bg-purple-100" iconText="text-purple-600" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500"><LayoutList className="h-16 w-16 text-slate-300 mb-4" /><h3 className="text-xl font-semibold text-slate-700">Chọn một bài viết để xem chi tiết</h3></div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditView = ({ sectionData, onSave, onCancel }: { sectionData: any, onSave: (newContent: any) => Promise<void>, onCancel: () => void }) => {
    const [editedContent, setEditedContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (typeof sectionData === 'object' && sectionData !== null) {
            setEditedContent(JSON.stringify(sectionData, null, 2));
        } else {
            setEditedContent(String(sectionData || ''));
        }
    }, [sectionData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let contentToSave: any = editedContent;
            if (typeof sectionData === 'object' && sectionData !== null) {
                contentToSave = JSON.parse(editedContent);
            }
            await onSave(contentToSave);
            onCancel();
        } catch (e) {
            showError("Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6">
            <Textarea 
                value={editedContent} 
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[250px] font-mono text-sm bg-slate-50"
            />
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={onCancel}>Hủy</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Lưu thay đổi
                </Button>
            </div>
        </div>
    );
};

// --- Main Component ---
export const AiPlanContentView = (props: AiPlanContentViewProps) => {
  const { planData, planStructure, isEditable = false, editingSectionId, setEditingSectionId, onUpdateSection, onRegenerateSection, onUpdateConfig } = props;
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  if (!planData || typeof planData !== 'object' || !planStructure || !Array.isArray(planStructure)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
        <Bot className="h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700">Dữ liệu kế hoạch không hợp lệ</h3>
        <p className="mt-2 text-sm max-w-sm">Không thể hiển thị kế hoạch. Vui lòng kiểm tra lại dữ liệu hoặc thử tạo lại kế hoạch từ đầu.</p>
      </div>
    );
  }

  const sectionsWithData = useMemo(() => {
    return planStructure.map(section => ({ ...section, sectionData: planData[section.id] })).filter(s => s.sectionData);
  }, [planData, planStructure]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break; 
          }
        }
      },
      { rootMargin: "-30% 0px -70% 0px", threshold: 0 }
    );

    const sections = mainContentRef.current?.querySelectorAll('section[id]');
    if (sections) sections.forEach((section) => observer.observe(section));
    if (!activeSection && sectionsWithData.length > 0) setActiveSection(sectionsWithData[0].id);

    return () => {
      if (sections) sections.forEach((section) => observer.unobserve(section));
    };
  }, [sectionsWithData, activeSection]);

  const handleNavClick = (sectionId: string) => {
    const sectionElement = document.getElementById(sectionId);
    sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sectionId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
      {/* Left Navigation */}
      <aside className="sticky top-24">
        <h3 className="font-semibold text-slate-900 mb-4 px-4">Nội dung kế hoạch</h3>
        <nav>
          <ul className="space-y-2">
            {sectionsWithData.map(section => {
              const Icon = iconMapping[section.icon] || iconMapping.default;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <Button
                    variant="ghost"
                    className={cn("w-full h-auto justify-start items-center p-3 rounded-lg transition-all duration-200", isActive ? "bg-blue-100 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
                    onClick={() => handleNavClick(section.id)}
                  >
                    <div className={cn("w-9 h-9 rounded-md flex items-center justify-center mr-4 flex-shrink-0 transition-colors duration-200", isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn("font-medium text-sm", isActive && "font-semibold")}>{section.label}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Right Content */}
      <main ref={mainContentRef} className="space-y-12">
        {sectionsWithData.map(section => {
          const Icon = iconMapping[section.icon] || iconMapping.default;
          const colorClasses = iconColorMapping[section.icon] || iconColorMapping.default;
          const [iconBg, iconText] = colorClasses.split(' ');
          const isEditing = isEditable && editingSectionId === section.id;

          return (
            <section key={section.id} id={section.id} className="scroll-mt-24 group">
              <Card className="bg-white shadow-md rounded-xl overflow-hidden border border-slate-200/60">
                <CardHeader className="flex flex-row items-center justify-between p-6 bg-slate-50/50 border-b">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
                            <Icon className={cn("h-6 w-6", iconText)} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">{section.label}</h2>
                    </div>
                    {isEditable && !isEditing && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {section.label === 'Thông tin đầu vào' && onUpdateConfig && (
                                <Button size="sm" variant="outline" className="bg-white" onClick={() => setIsConfigDialogOpen(true)}>
                                    <Settings className="h-4 w-4 mr-2" />Cấu hình
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="bg-white" onClick={() => setEditingSectionId?.(section.id)}>
                                <PencilLine className="h-4 w-4 mr-2" />Sửa
                            </Button>
                            <Button size="sm" variant="outline" className="bg-white" onClick={() => onRegenerateSection?.(section.id, section.label)}>
                                <Sparkles className="h-4 w-4 mr-2" />Tạo lại
                            </Button>
                        </div>
                    )}
                </CardHeader>
                
                {isEditing ? (
                    <EditView 
                        sectionData={section.sectionData}
                        onSave={async (newContent) => {
                            await onUpdateSection?.(section.id, newContent);
                        }}
                        onCancel={() => setEditingSectionId?.(null)}
                    />
                ) : (
                    <>
                        {section.display_type === 'content_direction' && isContentDirectionData(section.sectionData) ? (
                            <div className="p-4">
                                <ContentDirectionViewIntegrated data={section.sectionData} />
                            </div>
                        ) : (
                            <CardContent className="p-6 prose prose-sm max-w-none prose-slate text-slate-600 leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(section.sectionData)}</ReactMarkdown>
                            </CardContent>
                        )}
                    </>
                )}
              </Card>
            </section>
          );
        })}
      </main>
      {onUpdateConfig && (
        <InputConfigDialog
            planConfig={planData.config}
            onSave={onUpdateConfig}
            open={isConfigDialogOpen}
            onOpenChange={setIsConfigDialogOpen}
        />
      )}
    </div>
  );
};