import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '../ui/textarea';

type Template = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  structure: any;
};

type OutputField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dynamic_group';
  icon: string;
  display_type: 'simple' | 'content_direction';
  sub_fields?: { id: string; label: string; type: 'text' | 'textarea' }[];
};

type InputField = {
  id: string;
  label: string;
  type: 'input' | 'textarea';
  description: string;
};

const iconOptions = ['Target', 'Calendar', 'Package', 'Route', 'Megaphone'];

export const AiPlanTemplateManager = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [outputFields, setOutputFields] = useState<OutputField[]>([]);
  const [inputFields, setInputFields] = useState<InputField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('ai_plan_templates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      showError("Không thể tải mẫu: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenDialog = (template: Template | null = null) => {
    if (template) {
      setEditingTemplate(template);
      const structure = template.structure || {};
      const loadedOutputFields = structure.output_fields || [];
      const fieldsWithDefaults = loadedOutputFields.map((f: any) => ({ ...f, display_type: f.display_type || 'simple' }));
      setOutputFields(fieldsWithDefaults);
      setInputFields(structure.input_fields || []);
    } else {
      setEditingTemplate({ name: '' });
      setOutputFields([]);
      setInputFields([]);
    }
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name?.trim()) {
      showError("Tên mẫu không được để trống.");
      return;
    }
    setIsSaving(true);
    try {
      const structureToSave = {
        output_fields: outputFields,
        input_fields: inputFields,
      };

      if (editingTemplate.id) {
        const { error } = await supabase.from('ai_plan_templates').update({ name: editingTemplate.name, structure: structureToSave, updated_at: new Date().toISOString() }).eq('id', editingTemplate.id);
        if (error) throw error;
        showSuccess("Đã cập nhật mẫu thành công!");
      } else {
        const { error } = await supabase.from('ai_plan_templates').insert({ name: editingTemplate.name, structure: structureToSave, creator_id: user?.id });
        if (error) throw error;
        showSuccess("Đã tạo mẫu thành công!");
      }
      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      showError("Lưu mẫu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const { error } = await supabase.from('ai_plan_templates').delete().eq('id', templateToDelete.id);
    if (error) showError("Xóa thất bại: " + error.message);
    else {
      showSuccess("Đã xóa mẫu!");
      fetchTemplates();
    }
    setTemplateToDelete(null);
  };

  const handleOutputFieldChange = (id: string, key: keyof OutputField, value: string) => {
    setOutputFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };
  const addOutputField = () => {
    const newId = `section_${Date.now()}`;
    setOutputFields(prev => [...prev, { id: newId, label: 'Mục mới', type: 'textarea', icon: 'Target', display_type: 'simple' }]);
  };
  const removeOutputField = (id: string) => {
    setOutputFields(prev => prev.filter(f => f.id !== id));
  };
  const moveOutputField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === outputFields.length - 1)) return;
    const newFields = [...outputFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setOutputFields(newFields);
  };

  const handleInputFieldChange = (id: string, key: keyof InputField, value: string) => {
    setInputFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };
  const addInputField = () => {
    const newId = `field_${Date.now()}`;
    setInputFields(prev => [...prev, { id: newId, label: 'Tiêu đề mới', type: 'input', description: '' }]);
  };
  const removeInputField = (id: string) => {
    setInputFields(prev => prev.filter(f => f.id !== id));
  };

  return (
    <>
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">Quản lý Mẫu kế hoạch</CardTitle>
              <CardDescription>Tạo và tùy chỉnh cấu trúc cho các kế hoạch AI của bạn.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm mẫu mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Tên mẫu</TableHead><TableHead>Ngày tạo</TableHead><TableHead>Cập nhật lần cuối</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? ([...Array(3)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-5 w-32" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell></TableRow>))) : 
                templates.length > 0 ? (templates.map((template) => (<TableRow key={template.id}><TableCell className="font-medium">{template.name}</TableCell><TableCell>{format(new Date(template.created_at), 'dd/MM/yyyy', { locale: vi })}</TableCell><TableCell>{format(new Date(template.updated_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(template)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setTemplateToDelete(template)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))) : 
                (<TableRow><TableCell colSpan={4} className="text-center h-24">Chưa có mẫu nào.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.id ? 'Sửa mẫu kế hoạch' : 'Tạo mẫu kế hoạch mới'}</DialogTitle>
            <DialogDescription>Tùy chỉnh tên và các mục sẽ có trong kế hoạch AI.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Tên mẫu</Label>
              <Input id="template-name" value={editingTemplate?.name || ''} onChange={(e) => setEditingTemplate(t => ({...t, name: e.target.value}))} />
            </div>
            <Tabs defaultValue="output">
              <TabsList>
                <TabsTrigger value="output">Cấu trúc Đầu ra</TabsTrigger>
                <TabsTrigger value="input">Cấu hình Đầu vào</TabsTrigger>
              </TabsList>
              <TabsContent value="output" className="pt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                  {outputFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md bg-slate-50 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="ID (vd: san_pham)" value={field.id} onChange={e => handleOutputFieldChange(field.id, 'id', e.target.value)} className="font-mono text-xs" />
                        <Input placeholder="Tiêu đề mục" value={field.label} onChange={e => handleOutputFieldChange(field.id, 'label', e.target.value)} />
                        <Select value={field.icon} onValueChange={(value) => handleOutputFieldChange(field.id, 'icon', value)}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>{iconOptions.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={field.display_type || 'simple'} onValueChange={(value: 'simple' | 'content_direction') => handleOutputFieldChange(field.id, 'display_type', value)}>
                          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Hiển thị đơn giản (văn bản)</SelectItem>
                            <SelectItem value="content_direction">Hiển thị Định hướng Content</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" onClick={() => moveOutputField(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => moveOutputField(index, 'down')} disabled={index === outputFields.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => removeOutputField(field.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed" onClick={addOutputField}><PlusCircle className="mr-2 h-4 w-4" />Thêm mục</Button>
                </div>
              </TabsContent>
              <TabsContent value="input" className="pt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                  {inputFields.map(field => (
                    <div key={field.id} className="p-3 border rounded-md bg-slate-50 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeInputField(field.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ID</Label>
                          <Input value={field.id} onChange={e => handleInputFieldChange(field.id, 'id', e.target.value)} className="font-mono text-xs" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tiêu đề</Label>
                          <Input value={field.label} onChange={e => handleInputFieldChange(field.id, 'label', e.target.value)} />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Loại ô</Label>
                          <Select value={field.type} onValueChange={(value: 'input' | 'textarea') => handleInputFieldChange(field.id, 'type', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="input">Ô nhỏ (Input)</SelectItem>
                              <SelectItem value="textarea">Ô rộng (Textarea)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Mô tả (Placeholder)</Label>
                          <Textarea value={field.description} onChange={e => handleInputFieldChange(field.id, 'description', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed" onClick={addInputField}><PlusCircle className="mr-2 h-4 w-4" />Thêm trường</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa mẫu "{templateToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTemplate} className="bg-red-600">Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};