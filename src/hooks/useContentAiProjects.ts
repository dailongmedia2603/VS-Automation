import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentAiService, ContentAiProject } from '@/api/contentAi';
import { getCachedData, setCachedData, queryKeys } from '@/lib/queryCache';
import { showSuccess, showError } from '@/utils/toast';

// Transform API project to UI project format
const transformProject = (p: ContentAiProject) => ({
    id: p.id,
    name: p.name,
    files: p.items_count || 0,
    size: '0 KB',
    updated_at: p.updated_at,
    color: p.color || 'bg-blue-100 text-blue-600',
});

export type Project = ReturnType<typeof transformProject>;

/**
 * Hook for Content AI projects with localStorage persistence
 * Data renders instantly from cache, then refreshes in background
 */
export function useContentAiProjects() {
    const cacheKey = queryKeys.contentAiProjects;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const data = await contentAiService.getProjects();
            const projects = data.map(transformProject);
            // Cache for next visit
            setCachedData(cacheKey, projects);
            return projects;
        },
        // Load from localStorage immediately
        initialData: () => getCachedData<Project[]>(cacheKey),
        // Data is "fresh" for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep in memory for 30 minutes
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Hook for single Content AI project
 */
export function useContentAiProject(projectId: number) {
    const cacheKey = queryKeys.contentAiProject(projectId);

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const project = await contentAiService.getProject(projectId);
            setCachedData(cacheKey, project);
            return project;
        },
        initialData: () => getCachedData<ContentAiProject>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

/**
 * Mutation for creating a project with optimistic update
 */
export function useCreateProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.contentAiProjects;

    return useMutation({
        mutationFn: (data: { name: string; color?: string }) =>
            contentAiService.createProject(data),

        // Optimistic update: add to list immediately
        onMutate: async (newProject) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });

            const previousProjects = queryClient.getQueryData<Project[]>([cacheKey]);

            // Add optimistic project
            const optimisticProject: Project = {
                id: Date.now(), // Temporary ID
                name: newProject.name,
                files: 0,
                size: '0 KB',
                updated_at: new Date().toISOString(),
                color: newProject.color || 'bg-blue-100 text-blue-600',
            };

            queryClient.setQueryData<Project[]>([cacheKey], (old) =>
                old ? [optimisticProject, ...old] : [optimisticProject]
            );

            return { previousProjects };
        },

        onError: (err, _newProject, context) => {
            // Rollback on error
            if (context?.previousProjects) {
                queryClient.setQueryData([cacheKey], context.previousProjects);
            }
            showError(`Tạo dự án thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã tạo dự án thành công!');
        },

        onSettled: () => {
            // Refetch to get real data
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

/**
 * Mutation for updating a project
 */
export function useUpdateProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.contentAiProjects;

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ContentAiProject> }) =>
            contentAiService.updateProject(id, data),

        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });

            const previousProjects = queryClient.getQueryData<Project[]>([cacheKey]);

            // Optimistic update
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
 * Mutation for deleting a project with optimistic update
 */
export function useDeleteProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.contentAiProjects;

    return useMutation({
        mutationFn: (id: number) => contentAiService.deleteProject(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });

            const previousProjects = queryClient.getQueryData<Project[]>([cacheKey]);

            // Remove immediately from UI
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
