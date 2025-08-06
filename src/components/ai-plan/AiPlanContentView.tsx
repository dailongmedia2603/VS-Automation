import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, Calendar, Package, Route, Megaphone, Bot, LayoutList, Newspaper, AlertTriangle, ClipboardList, MessageSquareText, PencilLine, Sparkles, Loader2, Settings2, Trash2, PlusCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { showError } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
type InputField = {
  id: string;
  title: string;
  description: string;
  type: 'input' | 'textarea';
};

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

const isContentDirectionData = (data: any): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false;
  const firstItem = data[0];
  if (typeof firstItem !== 'object' || firstItem === null) return false;
  const expectedKeys = ['loai_content', 'chu_de', 'van_de', 'content_demo'];
  return expectedKeys.every(key => key in firstItem);
};

// --- CONFIGURABLE INPUT PANEL (LEFT SIDE) ---

const defaultInputFields: InputField[] = [
  { id: 'muc_tieu_seeding', title: 'Mục tiêu Seeding', description: 'Yêu cầu dựa vào mục tiêu seeding để xây dựng kế hoạch seeding bám theo mục tiêu', type: 'input' },
  { id: 'thoi_gian_trien_khai', title: 'Thời gian triển khai', description: 'Dựa vào thời gian triển khai để xây dựng kế hoạch cho phù hợp', type: 'input' },
  { id: 'san_pham', title: 'Sản phẩm', description: 'Mục tiêu là seeding cho các sản phẩm dưới đây. Nhưng không phải là PR trực tiếp mà thông qua hoạt động seeding (đóng vai là người dùng thật) để PR khéo léo về sản phẩm', type: 'textarea' },
];

const ConfigModal = ({ fields, onSave }: { fields: InputField[], onSave: (fields: InputField[]) => void }) => {
  const [localFields, setLocalFields] = useState<InputField[]>([]);

  useEffect(() => {
    setLocalFields(JSON.parse(JSON.stringify(fields)));
  }, [fields]);

  const handleFieldChange = (index: number, key: keyof InputField, value: string) => {
    const newFields = [...localFields];
    newFields[index] = { ...newFields[index], [key]: value };
    setLocalFields(newFields);
  };

  const addField = () => {
    setLocalFields([...localFields, { id: `field_${Date.now()}`, title: '', description: '', type: 'input' }]);
  };

  const removeField = (index: number) => {
    const newFields = localFields.filter((_, i) => i !== index);
    setLocalFields(newFields);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cấu hình đầu vào</DialogTitle>
        <DialogDescription>Tùy chỉnh các trường thông tin đầu vào cho kế hoạch AI.</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh] -mx-6">
        <div className="space-y-4 px-6 py-2">
          {localFields.map((field, index) => (
            <Card key={field.id} className="p-4 bg-slate-50 border relative">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => removeField(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`title-${field.id}`} className="font-semibold">Tiêu đề</Label>
                  <Input id={`title-${field.id}`} value={field.title} onChange={(e) => handleFieldChange(index, 'title', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor={`type-${field.id}`} className="font-semibold">Loại ô</Label>
                  <Select value={field.type} onValueChange={(value) => handleFieldChange(index, 'type', value)}>
                    <SelectTrigger id={`type-${field.id}`} className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">Ô nhỏ (Input)</SelectItem>
                      <SelectItem value="textarea">Ô lớn (Textarea)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor={`desc-${field.id}`} className="font-semibold">Mô tả (Placeholder)</Label>
                <Textarea id={`desc-${field.id}`} value={field.description} onChange={(e) => handleFieldChange(index, 'description', e.target.value)} className="mt-1 min-h-[60px]" />
              </div>
            </Card>
          ))}
          <Button variant="outline" className="w-full" onClick={addField}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm trường
          </Button>
        </div>
      </ScrollArea>
      <DialogFooter className="pt-4">
        <DialogClose asChild>
          <Button variant="ghost">Hủy</Button>
        </DialogClose>
        <Button onClick={() => onSave(localFields)}>Áp dụng</Button>
      </DialogFooter>
    </>
  );
};

const AiPlanInputPanel = () => {
  const [inputFields, setInputFields] = useState<InputField[]>(defaultInputFields);
  const [inputData, setInputData] = useState<{ [key: string]: string }>({});
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleSaveConfig = (newFields: InputField[]) => {
    setInputFields(newFields);
    setIsConfigOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Thông tin đầu vào</h2>
          <p className="text-sm text-slate-500 mt-1">Nhập thông tin chi tiết về chiến dịch của bạn.</p>
        </div>
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              Cấu hình đầu vào
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <ConfigModal fields={inputFields} onSave={handleSaveConfig} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {inputFields.map(field => (
          <Card key={field.id} className="bg-slate-50/70 border-slate-200/80 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <PencilLine className="h-5 w-5 text-slate-500 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <Label htmlFor={field.id} className="text-base font-semibold text-slate-800">{field.title}</Label>
                  <p className="text-sm text-slate-500 mt-1 mb-3">{field.description}</p>
                  {field.type === 'input' ? (
                    <Input
                      id={field.id}
                      value={inputData[field.id] || ''}
                      onChange={e => setInputData({...inputData, [field.id]: e.target.value})}
                    />
                  ) : (
                    <Textarea
                      id={field.id}
                      value={inputData[field.id] || ''}
                      onChange={e => setInputData({...inputData, [field.id]: e.target.value})}
                      className="min-h-[80px]"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- PLAN OUTPUT PANEL (RIGHT SIDE) ---
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

  if (!planData || !planStructure) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 border rounded-lg bg-white">
        <Bot className="h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700">Kế hoạch của bạn đang chờ AI</h3>
        <p className="mt-2 text-sm max-w-sm">Cung cấp đầy đủ thông tin và tạo kế hoạch để AI bắt đầu làm việc.</p>
      </div>
    );
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
                        {isContentDirectionData(section.sectionData) ? (
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
    </div>
  );
};

const ContentDirectionViewIntegrated = ({ data }: { data: ContentItem[] }) => {
  const [selectedItem, setSelectedItem] = useState<ContentItemWithGeneratedName | null>(null);

  const groupedData = useMemo(() => {
    if (!data) return {};
    const groups = data.reduce((acc, item) => {
      const key = item.loai_content || 'Chưa phân loại';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);
    for (const key in groups) {
      groups[key] = groups[key].map((item, index) => ({ ...item, bai_viet_name: `Bài viết ${index + 1}` }));
    }
    return groups as Record<string, ContentItemWithGeneratedName[]>;
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
    <div className="border rounded-lg overflow-hidden h-[700px] flex flex-col bg-white">
      <div className="grid md:grid-cols-[320px_1fr] flex-grow min-h-0">
        <div className="h-full border-r bg-slate-50/70">
          <ScrollArea className="h-full p-2">
            {Object.entries(groupedData).map(([type, items]) => (
              <div key={type} className="mb-2">
                <h3 className="px-3 py-2 text-sm font-semibold text-slate-500 flex items-center gap-2"><Newspaper className="h-4 w-4" /> {type}</h3>
                <div className="flex flex-col gap-1">
                  {items.map((item, index) => (
                    <Button key={`${item.bai_viet_name}-${index}`} variant="ghost" onClick={() => setSelectedItem(item)} className={cn("w-full justify-start h-auto py-2 px-3 text-left", selectedItem === item ? "bg-blue-100 text-blue-700 font-semibold" : "")}>
                      <span className="truncate">{item.bai_viet_name}: {item.chu_de}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
        <div className="h-full">
          <ScrollArea className="h-full p-6">
            {selectedItem ? (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-900">{selectedItem.chu_de}</h2>
                <DetailSection title="Vấn đề / Tình trạng" content={selectedItem.van_de} icon={AlertTriangle} iconBg="bg-red-100" iconText="text-red-600" />
                <DetailSection title="Content Demo" content={selectedItem.content_demo} icon={ClipboardList} iconBg="bg-green-100" iconText="text-green-600" />
                <DetailSection title="Định hướng comment" content={selectedItem.dinh_huong_comment} icon={MessageSquareText} iconBg="bg-purple-100" iconText="text-purple-600" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500"><LayoutList className="h-16 w-16 text-slate-300 mb-4" /><h3 className="text-xl font-semibold text-slate-700">Chọn một bài viết để xem chi tiết</h3></div>
            )}
          </ScrollArea>
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

// --- MAIN LAYOUT COMPONENT ---
export const AiPlanContentView = (props: AiPlanContentViewProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.5fr)] gap-8 items-start">
      <div className="lg:sticky top-6 self-start">
        <AiPlanInputPanel />
      </div>
      <div className="w-full">
        <AiPlanOutputPanel {...props} />
      </div>
    </div>
  );
};