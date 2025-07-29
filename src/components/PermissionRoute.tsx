import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from './ui/skeleton';

interface PermissionRouteProps {
    resource: string;
    action: string;
}

export const PermissionRoute = ({ resource, action }: PermissionRouteProps) => {
    const { profile, isLoading } = useAuth();
    const location = useLocation();

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

    const hasPermission = () => {
        if (profile?.role === 'Admin') return true;
        return profile?.permissions?.[resource]?.includes(action);
    };

    if (!hasPermission()) {
        return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }

    return <Outlet />;
};