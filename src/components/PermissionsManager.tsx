import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Button } from './ui/button';
import { Save } from 'lucide-react';

type StaffMember = {
  id: string;
  name: string;
  email: string;
  permissions: { [key: string]: string[] };
};

const resources = [
  { id: 'dashboard', name: 'Dashboard', actions: ['view'] },
  { id: 'projects', name: 'Dự án', actions: ['view', 'edit'] },
  { id: 'reports', name: 'Báo cáo', actions: ['view'] },
  { id: 'training-documents', name: 'Tài liệu đào tạo', actions: ['view', 'edit', 'delete'] },
  { id: 'training-chatbot', name: 'Training Chatbot', actions: ['view', 'edit'] },
  { id: 'content-ai', name: 'Content AI', actions: ['view', 'edit', 'delete'] },
  { id: 'check-seeding', name: 'Check Seeding', actions: ['view', 'edit', 'delete'] },
  { id: 'tools', name: 'Công cụ', actions: ['view'] },
  { id: 'staff', name: 'Nhân sự', actions: ['view', 'edit', 'delete'] },
  { id: 'settings', name: 'Cài đặt chung', actions: ['view', 'edit'] },
];

const actionLabels: { [key: string]: string } = {
  view: 'Xem',
  edit: 'Sửa',
  delete: 'Xoá',
};

export const PermissionsManager = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchStaffWithPermissions = async () => {
      setIsLoading(true);
      try {
        const { data: users, error: usersError } = await supabase.functions.invoke('list-users');
        if (usersError) throw new Error("Không thể tải danh sách nhân sự.");
        
        const { data: staffData, error: staffError } = await supabase.from('staff').select('id, permissions');
        if (staffError) throw new Error("Không thể tải quyền của nhân sự.");

        const permissionsMap = new Map(staffData.map(s => [s.id, s.permissions || {}]));

        const combined = (users as any[])
          .filter(user => user.email !== 'ceo@dailongmedia.io.vn') // Exclude admin from the list
          .map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            permissions: permissionsMap.get(user.id) || {},
          }));

        setStaffList(combined);
      } catch (error: any) {
        showError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffWithPermissions();
  }, []);

  const handlePermissionChange = (userId: string, resourceId: string, action: string, checked: boolean) => {
    setStaffList(prevList =>
      prevList.map(staff => {
        if (staff.id === userId) {
          const newPermissions = { ...staff.permissions };
          if (!newPermissions[resourceId]) {
            newPermissions[resourceId] = [];
          }
          if (checked) {
            if (!newPermissions[resourceId].includes(action)) {
              newPermissions[resourceId].push(action);
            }
          } else {
            newPermissions[resourceId] = newPermissions[resourceId].filter(a => a !== action);
          }
          return { ...staff, permissions: newPermissions };
        }
        return staff;
      })
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const toastId = showLoading("Đang lưu tất cả quyền...");
    let errorCount = 0;
    let firstErrorMessage = '';

    for (const staff of staffList) {
      const { error } = await supabase
        .from('staff')
        .update({ permissions: staff.permissions })
        .eq('id', staff.id);

      if (error) {
        errorCount++;
        if (!firstErrorMessage) {
          firstErrorMessage = error.message;
        }
        console.error(`Failed to update permissions for ${staff.name}:`, error);
      }
    }
    
    dismissToast(toastId);
    setIsSaving(false);

    if (errorCount === 0) {
      showSuccess("Đã lưu tất cả thay đổi về quyền thành công!");
    } else {
      showError(`Lưu thất bại cho ${errorCount} nhân viên. Lỗi đầu tiên: ${firstErrorMessage}`);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full mt-6" />;
  }

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={handleSaveAll} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Đang lưu...' : 'Lưu tất cả'}
        </Button>
      </div>
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-slate-50 z-10 min-w-[200px]">Nhân viên</TableHead>
              {resources.map(r => <TableHead key={r.id} className="text-center min-w-[180px]">{r.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffList.map(staff => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium sticky left-0 bg-white z-10">{staff.name}</TableCell>
                {resources.map(resource => (
                  <TableCell key={resource.id} className="text-center">
                    <div className="flex justify-center items-center gap-3">
                      {resource.actions.map(action => (
                        <div key={action} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`${staff.id}-${resource.id}-${action}`}
                            checked={staff.permissions?.[resource.id]?.includes(action) || false}
                            onCheckedChange={(checked) => handlePermissionChange(staff.id, resource.id, action, !!checked)}
                          />
                          <label htmlFor={`${staff.id}-${resource.id}-${action}`} className="text-xs">{actionLabels[action]}</label>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};