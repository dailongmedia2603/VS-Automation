import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, roleService, User, Role } from '@/api/users';
import { getCachedData, setCachedData, queryKeys } from '@/lib/queryCache';
import { showSuccess, showError } from '@/utils/toast';

// StaffMember type for UI - extends User with extracted role
export type StaffMember = {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar_url: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    roles?: Role[];
    password?: string;  // For form input only
};

// Transform API User to UI StaffMember
const transformUser = (user: User): StaffMember => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.roles?.[0]?.name || 'Member',
    avatar_url: null,
    status: 'active',
    created_at: user.created_at,
    roles: user.roles,
});

/**
 * Hook for Staff list with localStorage persistence
 * Returns data already transformed to StaffMember type
 */
export function useStaffList() {
    const cacheKey = queryKeys.staffList;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const users = await userService.getUsers();
            const staffMembers = users.map(transformUser);
            setCachedData(cacheKey, staffMembers);
            return staffMembers;
        },
        initialData: () => getCachedData<StaffMember[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}


/**
 * Hook for Roles list
 */
export function useRolesList() {
    const cacheKey = queryKeys.rolesList;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const roles = await roleService.getRoles();
            setCachedData(cacheKey, roles);
            return roles;
        },
        initialData: () => getCachedData<Role[]>(cacheKey),
        staleTime: 10 * 60 * 1000, // Roles change less frequently
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Mutation for creating staff
 */
export function useCreateStaff() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.staffList;

    return useMutation({
        mutationFn: (data: { name: string; email: string; password: string; role?: string }) =>
            userService.createUser(data),

        onMutate: async (newUser) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousUsers = queryClient.getQueryData<User[]>([cacheKey]);

            const optimisticUser: User = {
                id: Date.now(),
                name: newUser.name,
                email: newUser.email,
                created_at: new Date().toISOString(),
                roles: newUser.role ? [{ id: 0, name: newUser.role }] : [],
            };

            queryClient.setQueryData<User[]>([cacheKey], (old) =>
                old ? [...old, optimisticUser] : [optimisticUser]
            );

            return { previousUsers };
        },

        onError: (err, _newUser, context) => {
            if (context?.previousUsers) {
                queryClient.setQueryData([cacheKey], context.previousUsers);
            }
            showError(`Tạo nhân viên thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã tạo nhân viên thành công!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

/**
 * Mutation for updating staff
 */
export function useUpdateStaff() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.staffList;

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<User> & { password?: string; role?: string } }) =>
            userService.updateUser(id, data),

        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousUsers = queryClient.getQueryData<User[]>([cacheKey]);

            queryClient.setQueryData<User[]>([cacheKey], (old) =>
                old?.map(u => u.id === id ? { ...u, ...data } : u)
            );

            return { previousUsers };
        },

        onError: (err, _vars, context) => {
            if (context?.previousUsers) {
                queryClient.setQueryData([cacheKey], context.previousUsers);
            }
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã cập nhật nhân viên!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

/**
 * Mutation for deleting staff
 */
export function useDeleteStaff() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.staffList;

    return useMutation({
        mutationFn: (id: number) => userService.deleteUser(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousUsers = queryClient.getQueryData<User[]>([cacheKey]);

            queryClient.setQueryData<User[]>([cacheKey], (old) =>
                old?.filter(u => u.id !== id)
            );

            return { previousUsers };
        },

        onError: (err, _id, context) => {
            if (context?.previousUsers) {
                queryClient.setQueryData([cacheKey], context.previousUsers);
            }
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa nhân viên!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}
