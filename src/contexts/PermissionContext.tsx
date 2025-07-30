import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface PermissionContextType {
  permissions: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (action: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsSuperAdmin(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [permissionsRes, superAdminRes] = await Promise.all([
        supabase.rpc('get_user_permissions'),
        supabase.rpc('is_super_admin')
      ]);

      if (permissionsRes.error) throw permissionsRes.error;
      if (superAdminRes.error) throw superAdminRes.error;

      setPermissions(permissionsRes.data?.map((p: { permission_action: string }) => p.permission_action) || []);
      setIsSuperAdmin(superAdminRes.data || false);
    } catch (error: any) {
      console.error("Failed to fetch user permissions:", error.message);
      setPermissions([]);
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchPermissions();
    }
  }, [isAuthLoading, fetchPermissions]);

  const hasPermission = useCallback((action: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(action);
  }, [permissions, isSuperAdmin]);

  const value = { permissions, isSuperAdmin, isLoading, hasPermission };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};