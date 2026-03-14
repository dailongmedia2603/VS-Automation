import { useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface PermissionContextType {
  permissions: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (action: string) => boolean;
}

// We no longer need a Provider because we derive state from AuthContext
export const PermissionProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const usePermissions = (): PermissionContextType => {
  const { permissions, isSuperAdmin, isLoading } = useAuth();

  const hasPermission = useCallback((action: string): boolean => {
    if (isLoading) return false;
    if (isSuperAdmin) return true;
    return (permissions || []).includes(action);
  }, [permissions, isSuperAdmin, isLoading]);

  return {
    permissions: permissions || [],
    isSuperAdmin: isSuperAdmin || false,
    isLoading,
    hasPermission
  };
};