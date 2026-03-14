import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seedingService, SeedingProject, SeedingPost } from '@/api/seeding';
import { getCachedData, setCachedData, queryKeys } from '@/lib/queryCache';
import { showSuccess, showError } from '@/utils/toast';

// Transform API project to UI format
const transformProject = (p: SeedingProject) => ({
    id: p.id,
    name: p.name,
    posts: p.posts_count || 0,
    updated_at: p.updated_at,
    color: p.color || 'bg-green-100 text-green-600',
});

export type Project = ReturnType<typeof transformProject>;

/**
 * Hook for Seeding projects with localStorage persistence
 * Returns transformed projects for simple UI display
 */
export function useSeedingProjects() {
    const cacheKey = queryKeys.seedingProjects;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const data = await seedingService.getProjects();
            const projects = data.map(transformProject);
            setCachedData(cacheKey, projects);
            return projects;
        },
        initialData: () => getCachedData<Project[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook for Seeding projects with full stats
 * Returns full SeedingProject data including stats for CheckSeeding page
 */
export function useSeedingProjectsWithStats() {
    const cacheKey = queryKeys.seedingProjects + '-stats';

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const projects = await seedingService.getProjects();
            setCachedData(cacheKey, projects);
            return projects;
        },
        initialData: () => getCachedData<SeedingProject[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}


/**
 * Hook for single Seeding project
 */
export function useSeedingProject(projectId: number) {
    const cacheKey = queryKeys.seedingProject(projectId);

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const project = await seedingService.getProject(projectId);
            setCachedData(cacheKey, project);
            return project;
        },
        initialData: () => getCachedData<SeedingProject>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

/**
 * Hook for Seeding posts in a project
 */
export function useSeedingPosts(projectId: number) {
    const cacheKey = queryKeys.seedingPosts(projectId);

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const posts = await seedingService.getPosts(projectId);
            setCachedData(cacheKey, posts);
            return posts;
        },
        initialData: () => getCachedData<SeedingPost[]>(cacheKey),
        staleTime: 2 * 60 * 1000, // 2 minutes - posts change more frequently
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

/**
 * Hook for unread notification count
 */
export function useSeedingUnreadCount() {
    const cacheKey = queryKeys.seedingUnreadCount;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const count = await seedingService.getUnreadCount();
            setCachedData(cacheKey, count);
            return count;
        },
        initialData: () => getCachedData<number>(cacheKey),
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook for completed posts (notifications page)
 */
export function useCompletedPosts() {
    const cacheKey = queryKeys.completedNotifications;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const posts = await seedingService.getCompletedPosts();
            setCachedData(cacheKey, posts);
            return posts;
        },
        initialData: () => getCachedData<any[]>(cacheKey),
        staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Mutation for marking multiple posts as read
 */
export function useMarkMultipleAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postIds: number[]) => seedingService.markMultipleAsRead(postIds),

        onSuccess: () => {
            showSuccess('Đã đánh dấu đã xem!');
            queryClient.invalidateQueries({ queryKey: [queryKeys.completedNotifications] });
            queryClient.invalidateQueries({ queryKey: [queryKeys.seedingUnreadCount] });
        },

        onError: (err) => {
            showError(`Thao tác thất bại: ${(err as Error).message}`);
        },
    });
}

/**
 * Mutation for deleting multiple posts
 */
export function useDeleteMultiplePosts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postIds: number[]) => seedingService.deleteMultiplePosts(postIds),

        onSuccess: () => {
            showSuccess('Đã xóa thành công!');
            queryClient.invalidateQueries({ queryKey: [queryKeys.completedNotifications] });
        },

        onError: (err) => {
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },
    });
}

/**
 * Mutation for creating a project
 */
export function useCreateSeedingProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.seedingProjects;

    return useMutation({
        mutationFn: (data: { name: string; color?: string }) =>
            seedingService.createProject(data),

        onMutate: async (newProject) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousProjects = queryClient.getQueryData<Project[]>([cacheKey]);

            const optimisticProject: Project = {
                id: Date.now(),
                name: newProject.name,
                posts: 0,
                updated_at: new Date().toISOString(),
                color: newProject.color || 'bg-green-100 text-green-600',
            };

            queryClient.setQueryData<Project[]>([cacheKey], (old) =>
                old ? [optimisticProject, ...old] : [optimisticProject]
            );

            return { previousProjects };
        },

        onError: (err, _newProject, context) => {
            if (context?.previousProjects) {
                queryClient.setQueryData([cacheKey], context.previousProjects);
            }
            showError(`Tạo dự án thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã tạo dự án thành công!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

/**
 * Mutation for updating a project
 */
export function useUpdateSeedingProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.seedingProjects;

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<SeedingProject> }) =>
            seedingService.updateProject(id, data),

        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousProjects = queryClient.getQueryData<Project[]>([cacheKey]);

            queryClient.setQueryData<Project[]>([cacheKey], (old) =>
                old?.map(p => p.id === id ? { ...p, ...data } : p)
            );

            return { previousProjects };
        },

        onError: (err, _vars, context) => {
            if (context?.previousProjects) {
                queryClient.setQueryData([cacheKey], context.previousProjects);
            }
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã cập nhật dự án!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

/**
 * Mutation for deleting a project
 */
export function useDeleteSeedingProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.seedingProjects;

    return useMutation({
        mutationFn: (id: number) => seedingService.deleteProject(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousProjects = queryClient.getQueryData<Project[]>([cacheKey]);

            queryClient.setQueryData<Project[]>([cacheKey], (old) =>
                old?.filter(p => p.id !== id)
            );

            return { previousProjects };
        },

        onError: (err, _id, context) => {
            if (context?.previousProjects) {
                queryClient.setQueryData([cacheKey], context.previousProjects);
            }
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa dự án!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

/**
 * Mutation for creating a post
 */
export function useCreateSeedingPost(projectId: number) {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.seedingPosts(projectId);

    return useMutation({
        mutationFn: (data: { fb_post_url: string; target_comments?: number }) =>
            seedingService.createPost(projectId, data),

        onSuccess: () => {
            showSuccess('Đã thêm bài viết!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
            queryClient.invalidateQueries({ queryKey: [queryKeys.seedingProjects] });
        },

        onError: (err) => {
            showError(`Thêm bài viết thất bại: ${(err as Error).message}`);
        },
    });
}

/**
 * Mutation for deleting a post
 */
export function useDeleteSeedingPost(projectId: number) {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.seedingPosts(projectId);

    return useMutation({
        mutationFn: (id: number) => seedingService.deletePost(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previousPosts = queryClient.getQueryData<SeedingPost[]>([cacheKey]);

            queryClient.setQueryData<SeedingPost[]>([cacheKey], (old) =>
                old?.filter(p => p.id !== id)
            );

            return { previousPosts };
        },

        onError: (err, _id, context) => {
            if (context?.previousPosts) {
                queryClient.setQueryData([cacheKey], context.previousPosts);
            }
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa bài viết!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
            queryClient.invalidateQueries({ queryKey: [queryKeys.seedingProjects] });
        },
    });
}

/**
 * Mutation for checking a post
 */
export function useCheckSeedingPost(projectId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: number) => seedingService.checkPost(postId),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.seedingPosts(projectId)] });
            queryClient.invalidateQueries({ queryKey: [queryKeys.seedingUnreadCount] });
        },

        onError: (err) => {
            showError(`Kiểm tra thất bại: ${(err as Error).message}`);
        },
    });
}
