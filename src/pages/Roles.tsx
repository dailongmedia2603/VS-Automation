import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Loader2, Users, ShieldCheck } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { Navigate } from 'react-router-dom';

type Role = { id: number; name: string; description: string | null; };
type Permission = { id: number; action: string; description: string | null; };
type RolePermission = { role_id: number; permission_id: number; };

const Roles = () => {
  const { isSuperAdmin, isLoading: isLoadingPermissions } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permissionsRes, rolePermissionsRes] = await Promise.all([
        supabase.from('roles').select('*'),
        supabase.from('permissions').select('*'),
        supabase.from('role_permissions').select('*')
      ]);
      if (rolesRes.error) throw rolesRes.error;
      if (permissionsRes.error) throw permissionsRes.error;
      if (rolePermissionsRes.error) throw rolePermissionsRes.error;
      setRoles(rolesRes.data || []);
      setPermissions(permissionsRes.data || []);
      setRolePermissions(rolePermissionsRes.data || []);
    } catch (error: any) {
      showError("Không thể tải dữ liệu phân quyền: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (role: Role | null = null) => {
    if (role) {
      setEditingRole(role);
      const currentPermissions = rolePermissions
        .filter(rp => rp.role_id === role.id)
        .map(rp => rp.permission_id);
      setSelectedPermissions(new Set(currentPermissions));
    } else {
      setEditingRole({ name: '', description: '' });
      setSelectedPermissions(new Set());
    }
    setIsDialogOpen(true);
  };

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(permissionId);
      else newSet.delete(permissionId);
      return newSet;
    });
  };

  const handleSaveRole = async () => {
    if (!editingRole || !editingRole.name?.trim()) {
      showError("Tên vai trò không được để trống.");
      return;
    }
    setIsSaving(true);
    try {
      let roleId = editingRole.id;
      if (roleId) { // Update
        const { error } = await supabase.from('roles').update({ name: editingRole.name, description: editingRole.description }).eq('id', roleId);
        if (error) throw error;
      } else { // Create
        const { data, error } = await supabase.from('roles').insert({ name: editingRole.name, description: editingRole.description }).select().single();
        if (error) throw error;
        roleId = data.id;
      }

      // Sync permissions
      await supabase.from('role_permissions').delete().eq('role_id', roleId);
      const permissionsToInsert = Array.from(selectedPermissions).map(pid => ({ role_id: roleId!, permission_id: pid }));
      if (permissionsToInsert.length > 0) {
        const { error: permError } = await supabase.from('role_permissions').insert(permissionsToInsert);
        if (permError) throw permError;
      }

      showSuccess("Đã lưu vai trò thành công!");
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      showError("Lưu vai trò thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    const { error } = await supabase.from('roles').delete().eq('id', roleToDelete.id);
    if (error) showError("Xóa thất bại: " + error.message);
    else {
      showSuccess("Đã xóa vai trò!");
      fetchData();
    }
    setRoleToDelete(null);
  };

  const permissionsByRole = useMemo(() => {
    const map = new Map<number, string[]>();
    roles.forEach(role => {
      const perms = rolePermissions
        .filter(rp => rp.role_id === role.id)
        .map(rp => permissions.find(p => p.id === rp.permission_id)?.action)
        .filter(Boolean) as string[];
      map.set(role.id, perms);
    });
    return map;
  }, [roles, permissions, rolePermissions]);

  if (isLoadingPermissions) {
    return <main className="flex-1 p-6 sm:p-8"><Skeleton className="h-full w-full" /></main>;
  }
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">Quản lý Phân quyền</CardTitle>
              <CardDescription>Tạo và quản lý các vai trò, gán quyền hạn chi tiết cho từng vai trò.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Thêm vai trò
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Quyền hạn</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : roles.length > 0 ? (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {permissionsByRole.get(role.id)?.join(', ') || 'Chưa có quyền nào'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {role.name !== 'Super Admin' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(role)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setRoleToDelete(role)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">Chưa có vai trò nào.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole?.id ? 'Sửa vai trò' : 'Thêm vai trò mới'}</DialogTitle>
            <DialogDescription>Điền thông tin và chọn các quyền hạn cho vai trò này.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-6 py-4">
            <div className="col-span-1 space-y-4">
              <div className="space-y-2"><Label>Tên vai trò</Label><Input value={editingRole?.name || ''} onChange={(e) => setEditingRole(r => ({...r, name: e.target.value}))} /></div>
              <div className="space-y-2"><Label>Mô tả</Label><Input value={editingRole?.description || ''} onChange={(e) => setEditingRole(r => ({...r, description: e.target.value}))} /></div>
            </div>
            <div className="col-span-2">
              <Label>Quyền hạn</Label>
              <ScrollArea className="h-64 border rounded-md p-4 mt-2">
                <div className="space-y-2">
                  {permissions.map(p => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox id={`perm-${p.id}`} checked={selectedPermissions.has(p.id)} onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)} />
                      <Label htmlFor={`perm-${p.id}`} className="font-normal">{p.action}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vai trò "{roleToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRole} className="bg-red-600">Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Roles;