import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, Phone, Building, Send, Loader2, PlusCircle, Calendar, Clock, Trash2, Pencil, ImagePlus, Bot } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from "@/components/ui/badge";

// Interfaces
interface Message { id: number; content: string; created_at: number; private: boolean; sender?: { name: string; thumbnail?: string; }; }
interface Conversation { id: number; meta: { sender: { id: number; name: string; email?: string; phone_number?: string; thumbnail?: string; additional_attributes?: { company_name?: string; }; }; }; labels: string[]; }
type CareScriptStatus = 'scheduled' | 'sent' | 'failed';
interface CareScript { id: number; content: string; scheduled_at: string; status: CareScriptStatus; image_url?: string; }
interface ChatwootContactPanelProps { 
  selectedConversation: Conversation | null; 
  messages: Message[]; 
  onNewNote: (newNote: Message) => void;
  scripts: CareScript[];
  fetchCareScripts: (conversationId: number) => Promise<void>;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.trim().split(' ');
  if (names.length > 1 && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); }
  return name.substring(0, 2).toUpperCase();
};

const statusMap: Record<CareScriptStatus, string> = { scheduled: 'Đã lên lịch', sent: 'Đã gửi', failed: 'Thất bại' };
const statusColorMap: Record<CareScriptStatus, "default" | "secondary" | "destructive"> = { scheduled: 'secondary', sent: 'default', failed: 'destructive' };

export const ChatwootContactPanel = ({ selectedConversation, messages, onNewNote, scripts, fetchCareScripts }: ChatwootContactPanelProps) => {
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

  useEffect(() => { if (notesContainerRef.current) { notesContainerRef.current.scrollTop = 0; } }, [messages]);

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

  const notes = messages.filter(msg => msg.private).sort((a, b) => b.created_at - a.created_at);

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
      <Tabs defaultValue="info" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none h-14">
          <TabsTrigger value="info" className="text-sm font-semibold">Thông tin</TabsTrigger>
          <TabsTrigger value="care" className="text-sm font-semibold">Chăm sóc</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="flex-1 flex flex-col justify-between bg-gray-50">
          <div>
            <div className="p-4 space-y-4 border-b"><div className="flex items-center space-x-3"><Avatar className="h-12 w-12"><AvatarImage src={contact.thumbnail} /><AvatarFallback>{getInitials(contact.name)}</AvatarFallback></Avatar><h3 className="font-bold text-lg">{contact.name}</h3></div><div className="space-y-2 text-sm text-muted-foreground"><div className="flex items-center"><Mail className="h-4 w-4 mr-3" /><span>{contact.email || 'Không có sẵn'}</span></div><div className="flex items-center"><Phone className={cn("h-4 w-4 mr-3", contact.phone_number && "text-green-500")} /><span className={cn(contact.phone_number && "text-green-600 font-medium")}>{contact.phone_number || 'Không có sẵn'}</span></div><div className="flex items-center"><Building className="h-4 w-4 mr-3" /><span>{contact.additional_attributes?.company_name || 'Không có sẵn'}</span></div></div></div>
            <div ref={notesContainerRef} className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '240px' }}>{notes.length === 0 ? (<div className="flex flex-col items-center justify-center text-center text-muted-foreground py-4"><FileText className="h-8 w-8 mb-2 text-gray-300" /><p className="text-sm font-semibold text-gray-600">Chưa có ghi chú nào</p></div>) : (notes.map(n => (<div key={n.id} className="bg-yellow-100/50 border-l-4 border-yellow-400 p-3 rounded-r-lg"><p className="text-sm text-gray-800">{n.content}</p><p className="text-xs text-gray-500 mt-2 text-right">{n.sender?.name} - {format(new Date(n.created_at * 1000), 'dd/MM/yy HH:mm')}</p></div>)))}</div>
          </div>
          <form onSubmit={handleSendNote} className="p-4 border-t bg-gray-50"><div className="relative"><Input placeholder="Nhập ghi chú (Enter để gửi)" className="pr-10 bg-white" value={note} onChange={e => setNote(e.target.value)} disabled={isSendingNote} /><Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" disabled={isSendingNote}>{isSendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div></form>
        </TabsContent>
        <TabsContent value="care" className="w-full flex-1 flex flex-col p-4 space-y-4 bg-gray-50">
          <div className="w-full">
            <Button className="w-full" onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tạo kịch bản thủ công
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2 px-2">
            Để AI tự động chăm sóc, thêm nhãn "AI chăm" vào cuộc trò chuyện.
          </p>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {scripts.length === 0 ? (
              hasAiCareTag ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4">
                  <Bot className="h-10 w-10 mb-3 text-blue-500 animate-pulse" />
                  <p className="text-sm font-semibold text-gray-700">AI đang phân tích...</p>
                  <p className="text-xs mt-1">
                    Hệ thống đã ghi nhận và sẽ sớm tự động tạo kịch bản chăm sóc cho cuộc trò chuyện này.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full">
                  <Calendar className="h-10 w-10 mb-3 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-600">Chưa có kịch bản nào</p>
                  <p className="text-xs">Hãy tạo kịch bản để chăm sóc khách hàng tự động.</p>
                </div>
              )
            ) : (
              scripts.map(script => (
                <div key={script.id} className="bg-white p-3 rounded-lg border shadow-sm">
                  <p className="text-sm text-gray-800 mb-2">{script.content}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(script.scheduled_at), 'dd/MM/yy HH:mm')}</span>
                      <Badge variant={statusColorMap[script.status]}>{statusMap[script.status]}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6"><ImagePlus className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(script)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setScriptToDelete(script)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingScript ? 'Sửa kịch bản' : 'Tạo kịch bản mới'}</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Textarea placeholder="Nhập nội dung tin nhắn..." value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} /><div className="flex items-center gap-2"><Input type="date" value={scriptDate} onChange={(e) => setScriptDate(e.target.value)} className="flex-1" /><Select value={String(scriptHour)} onValueChange={(value) => setScriptHour(Number(value))}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 15 }, (_, i) => i + 7).map(hour => (<SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, '0')}:00</SelectItem>))}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsScriptDialogOpen(false)}>Hủy</Button><Button onClick={handleSaveScript}>Lưu</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!scriptToDelete} onOpenChange={() => setScriptToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể được hoàn tác. Kịch bản chăm sóc này sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteScript}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </aside>
  );
};