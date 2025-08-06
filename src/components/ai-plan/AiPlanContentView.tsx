import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, Calendar, Package, Route, Megaphone, Bot, PencilLine, Sparkles, Save, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { showError } from "@/utils/toast";

type PlanData = { [key: string]: any };
type PlanStructure = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
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

const iconMapping: { [key: string]: React.ElementType } = {
  Target,
  Calendar,
  Package,
  Route,
  Megaphone,
  default: Target,
};

const iconColorMapping: { [key: string]: string } = {
  Target: 'bg-blue-100 text-blue-600',
  Calendar: 'bg-red-100 text-red-600',
  Package: 'bg-green-100 text-green-600',
  Route: 'bg-purple-100 text-purple-600',
  Megaphone: 'bg-yellow-100 text-yellow-600',
  default: 'bg-slate-100 text-slate-600',
};

const SectionCard = ({ 
  section, 
  sectionData,
  isEditable,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRegenerate
}: { 
  section: PlanStructure, 
  sectionData: any,
  isEditable: boolean,
  isEditing: boolean,
  onStartEdit: () => void,
  onCancelEdit: () => void,
  onSaveEdit: (newContent: any) => Promise<void>,
  onRegenerate: () => void
}) => {
  const Icon = iconMapping[section.icon] || iconMapping.default;
  const colorClasses = iconColorMapping[section.icon] || iconColorMapping.default;
  const [iconBg, iconText] = colorClasses.split(' ');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      if (typeof sectionData === 'object' && sectionData !== null) {
        setEditedContent(JSON.stringify(sectionData, null, 2));
      } else {
        setEditedContent(String(sectionData || ''));
      }
    }
  }, [isEditing, sectionData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (typeof sectionData === 'object' && sectionData !== null) {
        await onSaveEdit(JSON.parse(editedContent));
      } else {
        await onSaveEdit(editedContent);
      }
    } catch (e) {
      showError("Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="space-y-2 pt-4">
          <Textarea 
            value={editedContent} 
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[200px] font-mono text-xs bg-slate-50"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>Hủy</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </div>
        </div>
      );
    }

    if (section.type === 'dynamic_group' && Array.isArray(sectionData) && sectionData.length > 0) {
      const headers = section.sub_fields?.map(f => f.label) || [];
      const keys = section.sub_fields?.map(f => f.id) || [];
      return (
        <div className="overflow-x-auto -mx-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {headers.map(h => <TableHead key={h} className="font-semibold text-slate-600">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionData.map((item, index) => (
                <TableRow key={index} className="border-b last:border-b-0">
                  {keys.map(key => (
                    <TableCell key={key} className="prose prose-sm max-w-none prose-slate align-top py-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(item[key] || '')}</ReactMarkdown>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none prose-slate text-slate-600 leading-relaxed pt-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(sectionData)}</ReactMarkdown>
      </div>
    );
  };

  return (
    <Card className="group shadow-md rounded-xl bg-white h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-slate-200/60 relative">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("h-6 w-6", iconText)} />
          </div>
          <CardTitle className="text-xl font-bold text-slate-800">{section.label}</CardTitle>
        </div>
        {isEditable && !isEditing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="outline" className="bg-white" onClick={onStartEdit}><PencilLine className="h-4 w-4 mr-2" />Sửa</Button>
            <Button size="sm" variant="outline" className="bg-white" onClick={onRegenerate}><Sparkles className="h-4 w-4 mr-2" />Tạo lại</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className={cn(section.type === 'dynamic_group' && !isEditing && "p-0")}>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export const AiPlanContentView = ({ 
  planData, 
  planStructure, 
  isEditable = false,
  editingSectionId, 
  setEditingSectionId, 
  onUpdateSection, 
  onRegenerateSection 
}: AiPlanContentViewProps) => {
  if (!planData || !planStructure) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
        <Bot className="h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700">Kế hoạch của bạn đang chờ AI</h3>
        <p className="mt-2 text-sm max-w-sm">
          Cung cấp đầy đủ thông tin ở cột bên trái và nhấn "Tạo kế hoạch" để AI bắt đầu làm việc.
        </p>
      </div>
    );
  }

  const groupedSections = useMemo(() => {
    const sectionsWithData = planStructure.map(section => ({
      ...section,
      sectionData: planData[section.id],
    })).filter(s => s.sectionData);

    return sectionsWithData.reduce((acc, section) => {
      const isShort = typeof section.sectionData === 'string' && section.sectionData.length < 200 && !section.sectionData.includes('\n');
      const lastGroup = acc[acc.length - 1];

      if (isShort && lastGroup && lastGroup.length === 1 && lastGroup[0].isShort) {
        lastGroup.push({ ...section, isShort });
      } else {
        acc.push([{ ...section, isShort }]);
      }
      return acc;
    }, [] as Array<Array<PlanStructure & { isShort: boolean }>>);
  }, [planData, planStructure]);

  return (
    <div className="space-y-6">
      {groupedSections.map((group, groupIndex) => (
        <div key={groupIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {group.map(section => (
            <div key={section.id} className={cn(group.length === 1 && "md:col-span-2")}>
              <SectionCard 
                section={section} 
                sectionData={planData[section.id]}
                isEditable={isEditable}
                isEditing={isEditable && editingSectionId === section.id}
                onStartEdit={() => setEditingSectionId?.(section.id)}
                onCancelEdit={() => setEditingSectionId?.(null)}
                onSaveEdit={(newContent) => onUpdateSection!(section.id, newContent)}
                onRegenerate={() => onRegenerateSection!(section.id, section.label)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};