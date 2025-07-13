import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

type StaffMember = {
  id: number;
  name: string;
  role: string;
  email: string;
  avatar_url: string;
  status: 'active' | 'inactive';
};

const Staff = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Partial<StaffMember> | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const fetchStaff = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('staff').select('*').order('name', { ascending: true });
    if (error) {
      showError("Không thể tải danh sách nhân sự: " + error.message);
    } else {
      setStaffList(data as StaffMember[] || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddNew = () => {
    setSelectedStaff({ name: '', role: '', email: '', status: 'active', avatar_url: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.from('staff').delete().eq('id', staffToDelete.id);
    if (error) {
      showError("Xóa nhân sự thất bại: " + error.message);
    } else {
      showSuccess("Đã xóa nhân sự thành công!");
      setStaffList(staffList.filter(s => s.id !== staffToDelete.id));
      setIsAlertOpen(false);
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!selectedStaff || !selectedStaff.name || !selectedStaff.email) {
      showError("Tên và email không được để trống.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from('staff').upsert({
      id: selectedStaff.id,
      name: selectedStaff.name,
      role: selectedStaff.role,
      email: selectedStaff.email,
      status: selectedStaff.status,
      avatar_url: selectedStaff.avatar_url || `https://i.pravatar.cc/150?u=${selectedStaff.email}`
    });

    if (error) {
      showError("Lưu thông tin thất bại: " + error.message);
    } else {
      showSuccess("Đã lưu thông tin nhân sự!");
      setIsDialogOpen(false);
      fetchStaff();
    }
    setIsSaving(false);
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(staff =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Quản lý nhân sự</CardTitle>
          <CardDescription>Thêm, sửa, xóa và quản lý thông tin các thành viên trong nhóm của bạn.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân sự..."
                className="pl-9 rounded-lg bg-slate-100 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleAddNew} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm nhân viên
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={staff.avatar_url} alt={staff.name} />
                            <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">{staff.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{staff.role}</TableCell>
                      <TableCell>
                        <Badge variant={staff.status === 'active' ? 'default' : 'outline'} className={cn(staff.status === 'active' && 'bg-green-100 text-green-800 border-green-200')}>
                          {staff.status === 'active' ? 'Hoạt động' : 'Tạm nghỉ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(staff)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setStaffToDelete(staff); setIsAlertOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">Không tìm thấy nhân sự nào.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedStaff?.id ? 'Sửa thông tin nhân sự' : 'Thêm nhân sự mới'}</DialogTitle>
            <DialogDescription>Điền thông tin chi tiết cho nhân viên.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="name">Tên nhân viên</Label><Input id="name" value={selectedStaff?.name || ''} onChange={(e) => setSelectedStaff({ ...selectedStaff, name: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={selectedStaff?.email || ''} onChange={(e) => setSelectedStaff({ ...selectedStaff, email: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
            <div className="space-y-2"><Label htmlFor="role">Chức vụ</Label><Input id="role" value={selectedStaff?.role || ''} onChange={(e) => setSelectedStaff({ ...selectedStaff, role: e.target.value })} className="bg-slate-100 border-none rounded-lg" /></div>
            <div className="space-y-2"><Label htmlFor="status">Trạng thái</Label><Select value={selectedStaff?.status || 'active'} onValueChange={(value) => setSelectedStaff({ ...selectedStaff, status: value as 'active' | 'inactive' })}><SelectTrigger className="bg-slate-100 border-none rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Hoạt động</SelectItem><SelectItem value="inactive">Tạm nghỉ</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button>
            <Button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Nhân sự "{staffToDelete?.name}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setStaffToDelete(null)} className="rounded-lg">Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isSaving} className="rounded-lg bg-red-600 hover:bg-red-700">{isSaving ? 'Đang xóa...' : 'Xóa'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Staff;