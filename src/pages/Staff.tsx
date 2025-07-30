import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Search, Loader2, Upload } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesManager from '@/components/RolesManager';

type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url: string | null;
  status: 'active' | 'inactive';
  password?: string;
};

type Role = { id: number; name: string; };

const StaffList = () => {
  const { hasPermission } = usePermissions();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Partial<StaffMember> | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        supabase.functions.invoke('list-users'),
        supabase.from('roles').select('id, name')
      ]);
      
      if (staffRes.error) throw staffRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setStaffList(staffRes.data as StaffMember[] || []);
      setRoles(rolesRes.data || []);
    } catch (error: any) {
      showError("Không thể tải dữ liệu: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddNew = () => {
    setSelectedStaff({ name: '', role: 'Member', email: '', status: 'active', avatar_url: '', password: '' });
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setAvatarFile(null);
    setAvatarPreview(staff.avatar_url);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: staffToDelete.id },
      });
      if (error) throw error;
      showSuccess("Đã xóa nhân sự thành công!");
      setStaffList(staffList.filter(s => s.id !== staffToDelete.id));
      setIsAlertOpen(false);
    } catch (error: any) {
      showError("Xóa nhân sự thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!selectedStaff || !selectedStaff.name || !selectedStaff.email) {
      showError("Tên và email không được để trống.");
      return;
    }
    setIsSaving(true);

    try {
      let avatarUrl = selectedStaff.avatar_url;
      if (avatarFile) {
        const filePath = `public/${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicUrl;
      }

      if (!selectedStaff.id) {
        if (!selectedStaff.password) {
          showError("Mật khẩu không được để trống khi thêm nhân viên mới.");
          setIsSaving(false);
          return;
        }
        const { error } = await supabase.functions.invoke('create-user', {
          body: { email: selectedStaff.email, password: selectedStaff.password, name: selectedStaff.name, avatar_url: avatarUrl },
        });
        if (error) throw error;
        showSuccess("Đã thêm nhân sự thành công!");
      } else {
        const { error } = await supabase.functions.invoke('update-user', {
          body: { userId: selectedStaff.id, name: selectedStaff.name, avatar_url: avatarUrl, role: selectedStaff.role, status: selectedStaff.status },
        });
        if (error) throw error;
        showSuccess("Đã cập nhật thông tin nhân sự!");
      }
      
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      showError("Lưu thông tin thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(staff =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  return (
    <>
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Quản lý nhân sự</CardTitle>
          <CardDescription>Thêm, sửa, xóa và quản lý thông tin các thành viên trong nhóm của bạn.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm nhân sự..." className="pl-9 rounded-lg bg-slate-100 border-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {hasPermission('create_staff') && (
              <Button onClick={handleAddNew} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm nhân viên
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Nhân viên</TableHead><TableHead>Chức vụ</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? ([...Array(5)].map((_, i) => (<TableRow key={i}><TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div></div></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell></TableRow>))) : 
                filteredStaff.length > 0 ? (filteredStaff.map((staff) => (<TableRow key={staff.id}><TableCell><div className="flex items-center gap-3"><Avatar><AvatarImage src={staff.avatar_url ?? undefined} alt={staff.name} /><AvatarFallback>{staff.name.charAt(0)}</AvatarFallback></Avatar><div><p className="font-medium">{staff.name}</p><p className="text-sm text-muted-foreground">{staff.email}</p></div></div></TableCell><TableCell>{staff.role}</TableCell><TableCell><Badge variant={staff.status === 'active' ? 'default' : 'outline'} className={cn(staff.status === 'active' && 'bg-green-100 text-green-800 border-green-200')}>{staff.status === 'active' ? 'Hoạt động' : 'Tạm nghỉ'}</Badge></TableCell><TableCell className="text-right">{hasPermission('edit_staff') && (<Button variant="ghost" size="icon" onClick={() => handleEdit(staff)}><Edit className="h-4 w-4" /></Button>)}{hasPermission('delete_staff') && (<Button variant="ghost" size="icon" onClick={() => { setStaffToDelete(staff); setIsAlertOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}</TableCell></TableRow>))) : 
                (<TableRow><TableCell colSpan={4} className="text-center h-24">Không tìm thấy nhân sự nào.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{selectedStaff?.id ? 'Sửa thông tin nhân sự' : 'Thêm nhân sự mới'}</DialogTitle><DialogDescription>Điền thông tin chi tiết cho nhân viên.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="flex flex-col items-center gap-4"><Avatar className="h-24 w-24"><AvatarImage src={avatarPreview ?? undefined} /><AvatarFallback className="text-3xl">{selectedStaff?.name?.charAt(0) || '?'}</AvatarFallback></Avatar><input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" /><Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Tải ảnh lên</Button></div><div className="space-y-2"><Label htmlFor="name">Tên nhân viên</Label><Input id="name" value={selectedStaff?.name || ''} onChange={(e) => setSelectedStaff({ ...selectedStaff, name: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={selectedStaff?.email || ''} onChange={(e) => setSelectedStaff({ ...selectedStaff, email: e.target.value })} className="bg-slate-100 border-none rounded-lg" disabled={!!selectedStaff?.id} /></div>{!selectedStaff?.id && (<div className="space-y-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" type="password" value={selectedStaff?.password || ''} onChange={(e) => setSelectedStaff({ ...selectedStaff, password: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>)}<div className="space-y-2"><Label htmlFor="role">Chức vụ</Label><Select value={selectedStaff?.role || ''} onValueChange={(value) => setSelectedStaff({ ...selectedStaff, role: value })}><SelectTrigger className="bg-slate-100 border-none rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="status">Trạng thái</Label><Select value={selectedStaff?.status || 'active'} onValueChange={(value) => setSelectedStaff({ ...selectedStaff, status: value as 'active' | 'inactive' })}><SelectTrigger className="bg-slate-100 border-none rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Hoạt động</SelectItem><SelectItem value="inactive">Tạm nghỉ</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button><Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Nhân sự "{staffToDelete?.name}" sẽ bị xóa vĩnh viễn khỏi hệ thống.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setStaffToDelete(null)} className="rounded-lg">Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isSaving} className="rounded-lg bg-red-600 hover:bg-red-700">{isSaving ? 'Đang xóa...' : 'Xóa'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

const Staff = () => {
  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nhân sự & Phân quyền</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Quản lý thành viên, vai trò và quyền hạn trong hệ thống của bạn.
        </p>
      </div>
      <Tabs defaultValue="staff" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="staff">Nhân viên</TabsTrigger>
          <TabsTrigger value="roles">Phân quyền</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-6">
          <StaffList />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RolesManager />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Staff;