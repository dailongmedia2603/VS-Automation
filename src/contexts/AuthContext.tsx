import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { authService, User } from '@/api/auth';
import { getAuthToken, clearAuth } from '@/api/client';

// Cache keys
const CACHE_KEYS = {
  USER: 'user',
  PERMISSIONS: 'user_permissions',
  IS_SUPER_ADMIN: 'user_is_super_admin',
} as const;

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isSuperAdmin: boolean;
  isLoading: boolean; // true only when no cached data and still fetching
  isRefreshing: boolean; // true when background refresh is happening
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get cached data synchronously
const getCachedAuth = () => {
  try {
    const cachedUser = localStorage.getItem(CACHE_KEYS.USER);
    const cachedPermissions = localStorage.getItem(CACHE_KEYS.PERMISSIONS);
    const cachedIsSuperAdmin = localStorage.getItem(CACHE_KEYS.IS_SUPER_ADMIN);

    return {
      user: cachedUser ? JSON.parse(cachedUser) : null,
      permissions: cachedPermissions ? JSON.parse(cachedPermissions) : [],
      isSuperAdmin: cachedIsSuperAdmin ? JSON.parse(cachedIsSuperAdmin) : false,
    };
  } catch {
    return { user: null, permissions: [], isSuperAdmin: false };
  }
};

// Helper to cache auth data
const cacheAuthData = (user: User | null, permissions: string[], isSuperAdmin: boolean) => {
  if (user) {
    localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(CACHE_KEYS.PERMISSIONS, JSON.stringify(permissions));
    localStorage.setItem(CACHE_KEYS.IS_SUPER_ADMIN, JSON.stringify(isSuperAdmin));
  }
};

// Helper to clear cached auth data
const clearCachedAuth = () => {
  localStorage.removeItem(CACHE_KEYS.USER);
  localStorage.removeItem(CACHE_KEYS.PERMISSIONS);
  localStorage.removeItem(CACHE_KEYS.IS_SUPER_ADMIN);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from cache synchronously for instant render
  const cached = getCachedAuth();
  const hasToken = !!getAuthToken();

  const [user, setUser] = useState<User | null>(hasToken ? cached.user : null);
  const [permissions, setPermissions] = useState<string[]>(hasToken ? cached.permissions : []);
  const [isSuperAdmin, setIsSuperAdmin] = useState(hasToken ? cached.isSuperAdmin : false);

  // isLoading = true only when we have token but no cached data
  const [isLoading, setIsLoading] = useState(hasToken && !cached.user);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await authService.me();
      setUser(data.user);
      setPermissions(data.permissions || []);
      setIsSuperAdmin(data.is_super_admin || false);
      // Cache for next time
      cacheAuthData(data.user, data.permissions || [], data.is_super_admin || false);
    } catch (error) {
      console.error('Refresh user failed:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Background refresh - UI already has cached data
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);

    // Fetch full profile to get permissions and cache them
    try {
      const data = await authService.me();
      setPermissions(data.permissions || []);
      setIsSuperAdmin(data.is_super_admin || false);
      cacheAuthData(data.user, data.permissions || [], data.is_super_admin || false);
    } catch (error) {
      console.error('Failed to fetch permissions after login:', error);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setPermissions([]);
      setIsSuperAdmin(false);
      clearCachedAuth();
      clearAuth();
    }
  };

  const value = {
    user,
    permissions,
    isSuperAdmin,
    isLoading,
    isRefreshing,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};