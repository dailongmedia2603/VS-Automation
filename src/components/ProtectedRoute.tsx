import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from './ui/skeleton';

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
        <div className="flex h-screen">
            <Skeleton className="hidden md:block w-72" />
            <div className="flex-1 p-8">
                <Skeleton className="h-12 w-1/3 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Outlet />
  );
};