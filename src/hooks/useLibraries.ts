import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryService, PromptLibrary } from '@/api/contentAi';
import { getCachedData, setCachedData, queryKeys } from '@/lib/queryCache';
import { showSuccess, showError } from '@/utils/toast';

// ========== PROMPT LIBRARIES ==========

export function usePromptLibraries() {
    const cacheKey = queryKeys.promptLibraries;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const libraries = await libraryService.getPromptLibraries();
            setCachedData(cacheKey, libraries);
            return libraries;
        },
        initialData: () => getCachedData<PromptLibrary[]>(cacheKey),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function usePromptLibrary(id: number) {
    return useQuery({
        queryKey: ['prompt-library', id],
        queryFn: () => libraryService.getPromptLibrary(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}


export function useCreatePromptLibrary() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.promptLibraries;

    return useMutation({
        mutationFn: (data: { name: string; config?: Record<string, any> }) =>
            libraryService.createPromptLibrary(data),

        onSuccess: () => {
            showSuccess('Đã tạo thư viện!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo thất bại: ${(err as Error).message}`);
        },
    });
}

export function useUpdatePromptLibrary() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<PromptLibrary> }) =>
            libraryService.updatePromptLibrary(id, data),

        onSuccess: () => {
            showSuccess('Đã cập nhật!');
            queryClient.invalidateQueries({ queryKey: [queryKeys.promptLibraries] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeletePromptLibrary() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.promptLibraries;

    return useMutation({
        mutationFn: (id: number) => libraryService.deletePromptLibrary(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<PromptLibrary[]>([cacheKey]);
            queryClient.setQueryData<PromptLibrary[]>([cacheKey], (old) =>
                old?.filter(l => l.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

// ========== CONDITION LIBRARIES ==========

export function useConditionLibraries() {
    const cacheKey = queryKeys.conditionLibraries;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const libraries = await libraryService.getConditionLibraries();
            setCachedData(cacheKey, libraries);
            return libraries;
        },
        initialData: () => getCachedData<PromptLibrary[]>(cacheKey),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: true, // Always refetch when component mounts
    });
}

export function useConditionLibrary(id: number) {
    return useQuery({
        queryKey: ['condition-library', id],
        queryFn: () => libraryService.getConditionLibrary(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        refetchOnMount: true, // Always refetch when detail page mounts
    });
}

export function useUpdateConditionLibrary() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            libraryService.updateConditionLibrary(id, data),

        onSuccess: () => {
            showSuccess('Đã cập nhật!');
            queryClient.invalidateQueries({ queryKey: [queryKeys.conditionLibraries] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useCreateConditionLibrary() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.conditionLibraries;

    return useMutation({
        mutationFn: (data: { name: string; config?: Record<string, any> }) =>
            libraryService.createConditionLibrary(data),

        onSuccess: () => {
            showSuccess('Đã tạo thư viện!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteConditionLibrary() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.conditionLibraries;

    return useMutation({
        mutationFn: (id: number) => libraryService.deleteConditionLibrary(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<PromptLibrary[]>([cacheKey]);
            queryClient.setQueryData<PromptLibrary[]>([cacheKey], (old) =>
                old?.filter(l => l.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

// ========== STRUCTURE LIBRARIES ==========

export function useStructureLibraries() {
    const cacheKey = queryKeys.structureLibraries;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const libraries = await libraryService.getStructureLibraries();
            setCachedData(cacheKey, libraries);
            return libraries;
        },
        initialData: () => getCachedData<PromptLibrary[]>(cacheKey),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: true, // Always refetch when component mounts
    });
}

export function useStructureLibrary(id: number) {
    return useQuery({
        queryKey: ['structure-library', id],
        queryFn: () => libraryService.getStructureLibrary(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        refetchOnMount: true, // Always refetch when detail page mounts
    });
}

export function useStructures(libraryId: number) {
    return useQuery({
        queryKey: ['structures', libraryId],
        queryFn: () => libraryService.getStructuresByLibrary(libraryId),
        enabled: !!libraryId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateStructure(libraryId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string }) =>
            libraryService.createStructure({ ...data, library_id: libraryId }),

        onSuccess: () => {
            showSuccess('Đã tạo cấu trúc!');
            queryClient.invalidateQueries({ queryKey: ['structures', libraryId] });
        },

        onError: (err) => {
            showError(`Tạo thất bại: ${(err as Error).message}`);
        },
    });
}

export function useUpdateStructure() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            libraryService.updateStructure(id, data),

        onSuccess: () => {
            showSuccess('Đã lưu thay đổi!');
            queryClient.invalidateQueries({ queryKey: ['structures'] });
        },

        onError: (err) => {
            showError(`Lưu thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteStructure(libraryId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => libraryService.deleteStructure(id),

        onSuccess: () => {
            showSuccess('Đã xóa cấu trúc!');
            queryClient.invalidateQueries({ queryKey: ['structures', libraryId] });
        },

        onError: (err) => {
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },
    });
}

export function useCreateStructureLibrary() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.structureLibraries;

    return useMutation({
        mutationFn: (data: { name: string; config?: Record<string, any> }) =>
            libraryService.createStructureLibrary(data),

        onSuccess: () => {
            showSuccess('Đã tạo thư viện!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteStructureLibrary() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.structureLibraries;

    return useMutation({
        mutationFn: (id: number) => libraryService.deleteStructureLibrary(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<PromptLibrary[]>([cacheKey]);
            queryClient.setQueryData<PromptLibrary[]>([cacheKey], (old) =>
                old?.filter(l => l.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}
