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
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { Navigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Role = { id: number; name: string; description: string | null; };
type Permission = { id: number; action: string; description: string | null; };
type RolePermission = { role_id: number; permission_id: number; };

const featureMapping: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Dự án',
  reports: 'Báo cáo',
  training_documents: 'Tài liệu đào tạo',
  training_chatbot: 'Training Chatbot',
  content_ai: 'Content AI',
  check_seeding: 'Check Seeding',
  tools: 'Công cụ chung',
  keyword_check: 'Công cụ - Keyword Check',
  post_scan: 'Công cụ - Post Scan',
  staff: 'Nhân sự',
  settings: 'Cài đặt chung',
};

const RolesManager = () => {
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
        supabase.from('permissions').select('*').order('action'),
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
  
  const handleSelectAllForGroup = (groupPermissions: Permission[], checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        groupPermissions.forEach(p => newSet.add(p.id));
      } else {
        groupPermissions.forEach(p => newSet.delete(p.id));
      }
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

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, p) => {
      const featureKey = Object.keys(featureMapping).find(key => p.action.includes(key));
      if (featureKey) {
        if (!acc[featureKey]) {
          acc[featureKey] = [];
        }
        acc[featureKey].push(p);
      }
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  if (isLoadingPermissions) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingRole?.id ? 'Sửa vai trò' : 'Thêm vai trò mới'}</DialogTitle>
            <DialogDescription>Điền thông tin và chọn các quyền hạn chi tiết cho vai trò này.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <div className="md:col-span-1 space-y-6">
              <Card className="shadow-none border">
                <CardHeader><CardTitle className="text-lg">Thông tin vai trò</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="role-name">Tên vai trò</Label><Input id="role-name" value={editingRole?.name || ''} onChange={(e) => setEditingRole(r => ({...r, name: e.target.value}))} /></div>
                  <div className="space-y-2"><Label htmlFor="role-desc">Mô tả</Label><Input id="role-desc" value={editingRole?.description || ''} onChange={(e) => setEditingRole(r => ({...r, description: e.target.value}))} /></div>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2">
              <Card className="shadow-none border">
                <CardHeader><CardTitle className="text-lg">Quyền hạn</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-80 pr-4">
                    <Accordion type="multiple" className="w-full space-y-2">
                      {Object.entries(groupedPermissions).map(([key, perms]) => {
                        const allInGroupSelected = perms.every(p => selectedPermissions.has(p.id));
                        return (
                          <AccordionItem value={key} key={key} className="border rounded-lg px-4 bg-slate-50/50">
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                                <Checkbox id={`select-all-${key}`} checked={allInGroupSelected} onCheckedChange={(checked) => handleSelectAllForGroup(perms, !!checked)} aria-label={`Select all for ${featureMapping[key]}`} />
                                <Label htmlFor={`select-all-${key}`} className="font-semibold text-slate-800 cursor-pointer">{featureMapping[key] || key}</Label>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-8">
                                {perms.map(p => (
                                  <div key={p.id} className="flex items-center space-x-2">
                                    <Checkbox id={`perm-${p.id}`} checked={selectedPermissions.has(p.id)} onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)} />
                                    <Label htmlFor={`perm-${p.id}`} className="font-normal capitalize text-slate-600 cursor-pointer">{p.action.split('_').join(' ')}</Label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button>
            <Button onClick={handleSaveRole} disabled={isSaving} className="rounded-lg bg-blue-600 hover:bg-blue-700">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle><AlertDialogDescription>Hành động này sẽ xóa vai trò "{roleToDelete?.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRole} className="bg-red-600">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RolesManager;