import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    keywordCheckService,
    postScanService,
    emailScanService,
    aiPlanService,
    KeywordCheckProject,
    PostScanProject,
    PostScanResult,
    EmailScanProject,
    EmailScanResult,
    AiPlan,
    AiPlanTemplate,
} from '@/api/tools';
import { getCachedData, setCachedData, queryKeys } from '@/lib/queryCache';
import { showSuccess, showError } from '@/utils/toast';

// ========== KEYWORD CHECK HOOKS ==========

export function useKeywordCheckProjects() {
    const cacheKey = queryKeys.keywordCheckProjects;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const projects = await keywordCheckService.getProjects();
            setCachedData(cacheKey, projects);
            return projects;
        },
        initialData: () => getCachedData<KeywordCheckProject[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function useCreateKeywordCheckProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.keywordCheckProjects;

    return useMutation({
        mutationFn: (data: { name: string }) => keywordCheckService.createProject(data),

        onSuccess: () => {
            showSuccess('Đã tạo dự án!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo dự án thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteKeywordCheckProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.keywordCheckProjects;

    return useMutation({
        mutationFn: (id: number) => keywordCheckService.deleteProject(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<KeywordCheckProject[]>([cacheKey]);
            queryClient.setQueryData<KeywordCheckProject[]>([cacheKey], (old) =>
                old?.filter(p => p.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
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

export function useUpdateKeywordCheckProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.keywordCheckProjects;

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
            keywordCheckService.updateProject(id, data),

        onSuccess: () => {
            showSuccess('Đã cập nhật dự án!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useKeywordCheckPosts(projectId: number) {
    const cacheKey = 'keyword-check-posts-' + projectId;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: () => keywordCheckService.getPosts(projectId),
        staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

export function useKeywordCheckProject(projectId: number) {
    return useQuery({
        queryKey: ['keyword-check-project', projectId],
        queryFn: () => keywordCheckService.getProject(projectId),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

export function useUpdateKeywordCheckPost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, data }: { postId: number; data: { name?: string; status?: string } }) =>
            keywordCheckService.updatePost(postId, data),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keyword-check-posts'] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteKeywordCheckPost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: number) => keywordCheckService.deletePost(postId),

        onSuccess: () => {
            showSuccess('Đã xóa post!');
            queryClient.invalidateQueries({ queryKey: ['keyword-check-posts'] });
        },

        onError: (err) => {
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteMultipleKeywordCheckPosts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postIds: number[]) => keywordCheckService.deleteMultiplePosts(postIds),

        onSuccess: () => {
            showSuccess('Đã xóa thành công!');
            queryClient.invalidateQueries({ queryKey: ['keyword-check-posts'] });
        },

        onError: (err) => {
            showError(`Xóa hàng loạt thất bại: ${(err as Error).message}`);
        },
    });
}

export function useCreateKeywordCheckPostWithItems(projectId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; type: 'comment' | 'post'; keywords: string; items: string[] }) =>
            keywordCheckService.createPostWithItems(projectId, data),

        onSuccess: () => {
            showSuccess('Đã thêm post thành công!');
            queryClient.invalidateQueries({ queryKey: ['keyword-check-posts-' + projectId] });
        },

        onError: (err) => {
            showError(`Thêm post thất bại: ${(err as Error).message}`);
        },
    });
}

// ========== POST SCAN HOOKS ==========


export function usePostScanProjects() {
    const cacheKey = queryKeys.postScanProjects;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const projects = await postScanService.getProjects();
            setCachedData(cacheKey, projects);
            return projects;
        },
        initialData: () => getCachedData<PostScanProject[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function usePostScanResults(projectId: number) {
    const cacheKey = queryKeys.postScanProject(projectId);

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const results = await postScanService.getResults(projectId);
            setCachedData(cacheKey, results);
            return results;
        },
        initialData: () => getCachedData<PostScanResult[]>(cacheKey),
        staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

export function useCreatePostScanProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.postScanProjects;

    return useMutation({
        mutationFn: (data: { name: string; fb_page_id?: string }) =>
            postScanService.createProject(data),

        onSuccess: () => {
            showSuccess('Đã tạo dự án!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo dự án thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeletePostScanProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.postScanProjects;

    return useMutation({
        mutationFn: (id: number) => postScanService.deleteProject(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<PostScanProject[]>([cacheKey]);
            queryClient.setQueryData<PostScanProject[]>([cacheKey], (old) =>
                old?.filter(p => p.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
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

export function useUpdatePostScanProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.postScanProjects;

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
            postScanService.updateProject(id, data),

        onSuccess: () => {
            showSuccess('Đã cập nhật dự án!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useScanPosts(projectId: number) {
    const queryClient = useQueryClient();


    return useMutation({
        mutationFn: () => postScanService.scanPosts(projectId),

        onSuccess: (data) => {
            if (data.success) {
                showSuccess(`Đã quét ${data.new_posts || 0} bài viết mới!`);
                queryClient.invalidateQueries({ queryKey: [queryKeys.postScanProject(projectId)] });
            } else {
                showError(data.error || 'Quét thất bại');
            }
        },

        onError: (err) => {
            showError(`Quét thất bại: ${(err as Error).message}`);
        },
    });
}

// ========== EMAIL SCAN HOOKS ==========

export function useEmailScanProjects() {
    const cacheKey = queryKeys.emailScanProjects;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const projects = await emailScanService.getProjects();
            setCachedData(cacheKey, projects);
            return projects;
        },
        initialData: () => getCachedData<EmailScanProject[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function useEmailScanResults(projectId: number) {
    const cacheKey = queryKeys.emailScanProject(projectId);

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const results = await emailScanService.getResults(projectId);
            setCachedData(cacheKey, results);
            return results;
        },
        initialData: () => getCachedData<EmailScanResult[]>(cacheKey),
        staleTime: 2 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!projectId,
    });
}

export function useCreateEmailScanProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.emailScanProjects;

    return useMutation({
        mutationFn: (data: { name: string; fb_post_id?: string }) =>
            emailScanService.createProject(data),

        onSuccess: () => {
            showSuccess('Đã tạo dự án!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo dự án thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteEmailScanProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.emailScanProjects;

    return useMutation({
        mutationFn: (id: number) => emailScanService.deleteProject(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<EmailScanProject[]>([cacheKey]);
            queryClient.setQueryData<EmailScanProject[]>([cacheKey], (old) =>
                old?.filter(p => p.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
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

export function useUpdateEmailScanProject() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.emailScanProjects;

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
            emailScanService.updateProject(id, data),

        onSuccess: () => {
            showSuccess('Đã cập nhật dự án!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useScanEmails(projectId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => emailScanService.scanEmails(projectId),

        onSuccess: (data) => {
            if (data.success) {
                showSuccess(`Tìm thấy ${data.emails_found || 0} email!`);
                queryClient.invalidateQueries({ queryKey: [queryKeys.emailScanProject(projectId)] });
            } else {
                showError(data.error || 'Quét thất bại');
            }
        },

        onError: (err) => {
            showError(`Quét thất bại: ${(err as Error).message}`);
        },
    });
}

// ========== AI PLAN HOOKS ==========

export function useAiPlans() {
    const cacheKey = queryKeys.aiPlans;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const plans = await aiPlanService.getPlans();
            setCachedData(cacheKey, plans);
            return plans;
        },
        initialData: () => getCachedData<AiPlan[]>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function useAiPlan(planId: number) {
    const cacheKey = queryKeys.aiPlan(planId);

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const plan = await aiPlanService.getPlan(planId);
            setCachedData(cacheKey, plan);
            return plan;
        },
        initialData: () => getCachedData<AiPlan>(cacheKey),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!planId,
    });
}

export function useAiPlanTemplates() {
    const cacheKey = queryKeys.aiPlanTemplates;

    return useQuery({
        queryKey: [cacheKey],
        queryFn: async () => {
            const templates = await aiPlanService.getTemplates();
            setCachedData(cacheKey, templates);
            return templates;
        },
        initialData: () => getCachedData<AiPlanTemplate[]>(cacheKey),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function useCreateAiPlan() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.aiPlans;

    return useMutation({
        mutationFn: (data: { name: string; config?: Record<string, any> }) =>
            aiPlanService.createPlan(data),

        onSuccess: () => {
            showSuccess('Đã tạo kế hoạch!');
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },

        onError: (err) => {
            showError(`Tạo kế hoạch thất bại: ${(err as Error).message}`);
        },
    });
}

export function useUpdateAiPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<AiPlan> }) =>
            aiPlanService.updatePlan(id, data),

        onSuccess: (_, { id }) => {
            showSuccess('Đã cập nhật kế hoạch!');
            queryClient.invalidateQueries({ queryKey: [queryKeys.aiPlans] });
            queryClient.invalidateQueries({ queryKey: [queryKeys.aiPlan(id)] });
        },

        onError: (err) => {
            showError(`Cập nhật thất bại: ${(err as Error).message}`);
        },
    });
}

export function useDeleteAiPlan() {
    const queryClient = useQueryClient();
    const cacheKey = queryKeys.aiPlans;

    return useMutation({
        mutationFn: (id: number) => aiPlanService.deletePlan(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: [cacheKey] });
            const previous = queryClient.getQueryData<AiPlan[]>([cacheKey]);
            queryClient.setQueryData<AiPlan[]>([cacheKey], (old) =>
                old?.filter(p => p.id !== id)
            );
            return { previous };
        },

        onError: (err, _id, context) => {
            if (context?.previous) queryClient.setQueryData([cacheKey], context.previous);
            showError(`Xóa thất bại: ${(err as Error).message}`);
        },

        onSuccess: () => {
            showSuccess('Đã xóa kế hoạch!');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [cacheKey] });
        },
    });
}

export function useGenerateAiPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (planId: number) => aiPlanService.generatePlan(planId),

        onSuccess: (data, planId) => {
            if (data.success) {
                showSuccess('Đã tạo kế hoạch thành công!');
                queryClient.invalidateQueries({ queryKey: [queryKeys.aiPlan(planId)] });
            } else {
                showError(data.error || 'Tạo kế hoạch thất bại');
            }
        },

        onError: (err) => {
            showError(`Tạo kế hoạch thất bại: ${(err as Error).message}`);
        },
    });
}
