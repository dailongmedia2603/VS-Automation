import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Phone, Send, Loader2, PlusCircle, Calendar, Clock, Trash2, Pencil, ImagePlus, Bot, ShoppingBag, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Conversation, Message, CareScript, CareScriptStatus } from '@/types/chatwoot';

// Interfaces
interface ChatwootContactPanelProps { 
  selectedConversation: Conversation | null; 
  messages: Message[]; 
  onNewNote: (newNote: Message) => void;
  scripts: CareScript[];
  fetchCareScripts: (conversationId: number) => Promise<void>;
  onConversationUpdate: (updatedConversation: Conversation) => void;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const statusMap: Record<CareScriptStatus, string> = { scheduled: 'Xếp lịch', sent: 'Đã gửi', failed: 'Thất bại' };
const statusBadgeColors: Record<CareScriptStatus, string> = { 
  scheduled: 'bg-red-100 text-red-600 hover:bg-red-100', 
  sent: 'bg-green-100 text-green-600 hover:bg-green-100', 
  failed: 'bg-red-100 text-red-600 hover:bg-red-100' 
};

export const ChatwootContactPanel = ({ selectedConversation, messages, onNewNote, scripts, fetchCareScripts, onConversationUpdate }: ChatwootContactPanelProps) => {
  const { settings } = useChatwoot();
  const [note, setNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<CareScript | null>(null);
  const [scriptToDelete, setScriptToDelete] = useState<CareScript | null>(null);
  const [scriptContent, setScriptContent] = useState('');
  const [scriptDate, setScriptDate] = useState('');
  const [scriptHour, setScriptHour] = useState<number>(9);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'care'>('info');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [scriptForImageUpload, setScriptForImageUpload] = useState<CareScript | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productValue, setProductValue] = useState('');

  useEffect(() => {
    if (notesContainerRef.current) {
      notesContainerRef.current.scrollTop = 0;
    }
  }, [messages, activeTab, selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      setProductValue(selectedConversation.meta.sender.additional_attributes?.product_service || '');
      setIsEditingProduct(false);
    }
  }, [selectedConversation]);

  const handleSaveProductService = async () => {
    if (!selectedConversation || productValue === (selectedConversation.meta.sender.additional_attributes?.product_service || '')) {
      setIsEditingProduct(false);
      return;
    }

    const toastId = showLoading("Đang cập nhật SP/DV...");
    try {
      const contactId = selectedConversation.meta.sender.id;
      const newAttributes = {
        ...selectedConversation.meta.sender.additional_attributes,
        product_service: productValue,
      };

      const { error } = await supabase.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'update_contact',
          settings,
          contactId,
          payload: { additional_attributes: newAttributes },
        },
      });

      if (error) throw error;

      const updatedConversation = {
        ...selectedConversation,
        meta: {
          ...selectedConversation.meta,
          sender: {
            ...selectedConversation.meta.sender,
            additional_attributes: newAttributes,
          },
        },
      };
      onConversationUpdate(updatedConversation as any);
      dismissToast(toastId);
      showSuccess("Đã cập nhật SP/DV.");
      setIsEditingProduct(false);
    } catch (err: any) {
      dismissToast(toastId);
      showError(`Cập nhật thất bại: ${err.message || 'Lỗi không xác định'}`);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !selectedConversation) return;
    setIsSendingNote(true);
    try {
      const { data: newNoteMessage } = await supabase.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings, conversationId: selectedConversation.id, content: note, isPrivate: true }, });
      setNote('');
      if (newNoteMessage) onNewNote(newNoteMessage);
    } catch (error) { console.error("Failed to send note:", error); } finally { setIsSendingNote(false); }
  };

  const openCreateDialog = () => {
    setEditingScript(null);
    setScriptContent('');
    setScriptDate(format(new Date(), 'yyyy-MM-dd'));
    setScriptHour(9);
    setIsScriptDialogOpen(true);
  };

  const openEditDialog = (script: CareScript) => {
    const scheduledDate = new Date(script.scheduled_at);
    setEditingScript(script);
    setScriptContent(script.content);
    setScriptDate(format(scheduledDate, "yyyy-MM-dd"));
    setScriptHour(scheduledDate.getHours());
    setIsScriptDialogOpen(true);
  };

  const handleSaveScript = async () => {
    if (!scriptContent || !scriptDate || !selectedConversation) { showError("Vui lòng nhập đầy đủ nội dung và lịch gửi."); return; }
    const scheduledDateTime = new Date(scriptDate);
    scheduledDateTime.setHours(scriptHour, 0, 0, 0);

    const scriptData = {
      conversation_id: selectedConversation.id,
      contact_id: selectedConversation.meta.sender.id,
      content: scriptContent,
      scheduled_at: scheduledDateTime.toISOString(),
    };
    const { error } = editingScript
      ? await supabase.from('care_scripts').update(scriptData).eq('id', editingScript.id)
      : await supabase.from('care_scripts').insert(scriptData);
    if (error) { showError("Lưu kịch bản thất bại: " + error.message); } 
    else { 
      showSuccess(`Đã ${editingScript ? 'cập nhật' : 'tạo'} kịch bản!`); 
      fetchCareScripts(selectedConversation.id); 
      setIsScriptDialogOpen(false); 
    }
  };

  const handleDeleteScript = async () => {
    if (!scriptToDelete) return;
    const { error } = await supabase.from('care_scripts').delete().eq('id', scriptToDelete.id);
    if (error) { showError("Xóa kịch bản thất bại: " + error.message); } 
    else { 
      showSuccess("Đã xóa kịch bản."); 
      fetchCareScripts(selectedConversation!.id); 
      setScriptToDelete(null); 
    }
  };

  const handleSelectImageClick = (script: CareScript) => {
    setScriptForImageUpload(script);
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !scriptForImageUpload || !selectedConversation) {
      return;
    }
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      showError("Vui lòng chọn một tệp hình ảnh.");
      return;
    }
    setIsUploadingImage(true);
    const toastId = showLoading("Đang tải ảnh lên...");
    try {
      const filePath = `public/care-scripts/${scriptForImageUpload.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('care_script_attachments').upload(filePath, file);
      if (uploadError) throw new Error(`Lỗi tải lên: ${uploadError.message}`);
      const { data: { publicUrl } } = supabase.storage.from('care_script_attachments').getPublicUrl(filePath);
      if (!publicUrl) throw new Error("Không thể lấy URL công khai của ảnh.");
      const { error: updateError } = await supabase.from('care_scripts').update({ image_url: publicUrl }).eq('id', scriptForImageUpload.id);
      if (updateError) throw new Error(`Lỗi cập nhật kịch bản: ${updateError.message}`);
      dismissToast(toastId);
      showSuccess("Đã thêm ảnh vào kịch bản!");
      fetchCareScripts(selectedConversation.id);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    } finally {
      setIsUploadingImage(false);
      setScriptForImageUpload(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const notes = messages.filter(msg => msg.private).sort((a, b) => b.created_at - a.created_at);
  const sortedScripts = [...scripts].sort((a, b) => b.id - a.id);

  if (!selectedConversation) {
    return (
      <aside className="hidden lg:flex lg:w-80 border-l bg-white flex-col items-center justify-center text-center p-4">
        <FileText className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-sm text-muted-foreground">Chọn một cuộc trò chuyện để xem chi tiết.</p>
      </aside>
    );
  }

  const contact = selectedConversation.meta.sender;
  const hasAiCareTag = selectedConversation.labels.includes('AI chăm');

  return (
    <aside className="hidden lg:flex lg:w-80 border-l bg-white flex-col">
      <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" disabled={isUploadingImage} />
      <div className="p-3 border-b border-slate-100 flex-shrink-0">
        <div className="grid w-full grid-cols-2 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setActiveTab('info')} className={cn("w-full rounded-md p-1.5 text-sm font-medium transition-colors", activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50')}>Ghi chú</button>
          <button onClick={() => setActiveTab('care')} className={cn("w-full rounded-md p-1.5 text-sm font-medium transition-colors", activeTab === 'care' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50')}>Chăm sóc</button>
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 border-b bg-white">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12"><AvatarImage src={contact.thumbnail} /><AvatarFallback>{getInitials(contact.name)}</AvatarFallback></Avatar>
              <h3 className="font-bold text-lg">{contact.name}</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start">
                <ShoppingBag className="h-4 w-4 mr-3 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-slate-500">SP/DV</span>
                  {isEditingProduct ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={productValue}
                        onChange={(e) => setProductValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveProductService();
                          if (e.key === 'Escape') {
                            setIsEditingProduct(false);
                            setProductValue(selectedConversation?.meta.sender.additional_attributes?.product_service || '');
                          }
                        }}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveProductService}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group min-h-[32px]">
                      <p className="text-slate-800 cursor-pointer" onClick={() => setIsEditingProduct(true)}>
                        {selectedConversation?.meta.sender.additional_attributes?.product_service || <span className="text-slate-400 italic">Chưa có</span>}
                      </p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setIsEditingProduct(true)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center"><Phone className={cn("h-4 w-4 mr-3", contact.phone_number && "text-green-500")} /><span className={cn(contact.phone_number && "text-green-600 font-medium")}>{contact.phone_number || 'Không có sẵn'}</span></div>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            <div ref={notesContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="flex items-center justify-center h-16 w-16 bg-slate-200/70 rounded-full mb-4"><FileText className="h-8 w-8 text-slate-400" /></div>
                  <p className="text-md font-semibold text-slate-800">Chưa có ghi chú</p>
                  <p className="text-sm text-slate-500 mt-1">Thêm ghi chú mới để thảo luận nội bộ về cuộc trò chuyện này.</p>
                </div>
              ) : (
                notes.map((n, index) => (
                  <div key={n.id} className={cn("bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-colors", index === 0 && "bg-blue-50 border-blue-200")}>
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8 border"><AvatarImage src={n.sender?.thumbnail} /><AvatarFallback>{getInitials(n.sender?.name)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{n.sender?.name || 'Hệ thống'}</p>
                          <p className="text-xs text-slate-400">{format(new Date(n.created_at * 1000), 'dd/MM/yy HH:mm', { locale: vi })}</p>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{n.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendNote} className="p-4 border-t bg-white flex-shrink-0">
              <div className="relative">
                <Input placeholder="Nhập ghi chú (Enter để gửi)" className="pr-12 bg-slate-100 border-slate-200 rounded-lg" value={note} onChange={e => setNote(e.target.value)} disabled={isSendingNote} />
                <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-10 rounded-md bg-blue-600 hover:bg-blue-700 text-white" disabled={isSendingNote}>{isSendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'care' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedScripts.length > 0 ? (
              <TooltipProvider>
                <div className="space-y-3">
                  {sortedScripts.map(script => (
                    <div key={script.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      {script.image_url && (<div className="mb-3"><img src={script.image_url} alt="Ảnh kịch bản" className="rounded-lg max-w-full h-auto" /></div>)}
                      <p className="text-sm text-slate-700 mb-4 leading-relaxed">{script.content}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500"><Clock className="h-3.5 w-3.5" /><span>{format(new Date(script.scheduled_at), 'dd/MM/yy HH:mm')}</span></div>
                          <Badge className={cn("px-2 py-0.5 text-xs font-medium rounded-full border-none whitespace-nowrap", statusBadgeColors[script.status])}>{statusMap[script.status]}</Badge>
                        </div>
                        <div className="flex items-center">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSelectImageClick(script)} disabled={isUploadingImage && scriptForImageUpload?.id === script.id}>{isUploadingImage && scriptForImageUpload?.id === script.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-slate-500" />}</Button></TooltipTrigger><TooltipContent><p>Thêm ảnh</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(script)}><Pencil className="h-4 w-4 text-slate-500" /></Button></TooltipTrigger><TooltipContent><p>Sửa</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScriptToDelete(script)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>Xóa</p></TooltipContent></Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                {hasAiCareTag ? (
                  <><div className="relative mb-4"><div className="absolute -inset-1.5 bg-blue-200 rounded-full animate-ping opacity-60"></div><div className="relative flex items-center justify-center h-16 w-16 bg-blue-100 rounded-full"><Bot className="h-8 w-8 text-blue-600" /></div></div><p className="text-md font-semibold text-slate-800">AI đang phân tích</p><p className="text-sm text-slate-500 mt-1 max-w-xs">Hệ thống sẽ sớm tự động tạo kịch bản chăm sóc cho cuộc trò chuyện này.</p></>
                ) : (
                  <><div className="flex items-center justify-center h-16 w-16 bg-slate-200/70 rounded-full mb-4"><Calendar className="h-8 w-8 text-slate-400" /></div><p className="text-md font-semibold text-slate-800">Chưa có kịch bản chăm sóc</p><p className="text-sm text-slate-500 mt-1">Tạo kịch bản mới để bắt đầu chăm sóc khách hàng tự động.</p></>
                )}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
            <Button onClick={openCreateDialog} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"><PlusCircle className="mr-2 h-5 w-5" />Tạo kịch bản mới</Button>
          </div>
        </div>
      )}

      <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}><DialogContent className="sm:max-w-[425px] rounded-xl"><DialogHeader><DialogTitle>{editingScript ? 'Sửa kịch bản' : 'Tạo kịch bản mới'}</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Textarea placeholder="Nhập nội dung tin nhắn..." value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} className="bg-slate-100 border-none rounded-lg min-h-[100px]" /><div className="flex items-center gap-2"><Input type="date" value={scriptDate} onChange={(e) => setScriptDate(e.target.value)} className="flex-1 bg-slate-100 border-none rounded-lg h-10" /><Select value={String(scriptHour)} onValueChange={(value) => setScriptHour(Number(value))}><SelectTrigger className="w-[120px] bg-slate-100 border-none rounded-lg h-10"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 15 }, (_, i) => i + 7).map(hour => (<SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, '0')}:00</SelectItem>))}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsScriptDialogOpen(false)} className="rounded-xl">Hủy</Button><Button onClick={handleSaveScript} className="rounded-xl bg-blue-600 hover:bg-blue-700">Lưu</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!scriptToDelete} onOpenChange={() => setScriptToDelete(null)}><AlertDialogContent className="rounded-xl"><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể được hoàn tác. Kịch bản chăm sóc này sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteScript} className="rounded-xl bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </aside>
  );
};