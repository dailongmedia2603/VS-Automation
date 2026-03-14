import apiClient from './client';

// ========== KEYWORD CHECK ==========
export interface KeywordCheckProject {
    id: number;
    name: string;
    creator_id: number;
    color: string;
    created_at: string;
    posts_count?: number;
    creator?: { id: number; name: string };
}

export interface KeywordCheckPost {
    id: number;
    project_id: number;
    fb_post_url: string;
    keywords: string;
    status: 'pending' | 'checking' | 'completed';
    created_at: string;
    items_count?: number;
}

export interface KeywordCheckItem {
    id: number;
    post_id: number;
    account_id: string;
    account_name: string;
    comment_content: string;
    comment_link: string;
    matched_keywords: string[];
}

export const keywordCheckService = {
    async getProjects(): Promise<KeywordCheckProject[]> {
        const response = await apiClient.get('/keyword-check/projects');
        return response.data.projects;
    },

    async getProject(id: number): Promise<KeywordCheckProject> {
        const response = await apiClient.get(`/keyword-check/projects/${id}`);
        return response.data.project;
    },

    async createProject(data: { name: string }): Promise<KeywordCheckProject> {
        const response = await apiClient.post('/keyword-check/projects', data);
        return response.data.project;
    },

    async deleteProject(id: number): Promise<void> {
        await apiClient.delete(`/keyword-check/projects/${id}`);
    },

    async updateProject(id: number, data: { name: string }): Promise<KeywordCheckProject> {
        const response = await apiClient.put(`/keyword-check/projects/${id}`, data);
        return response.data.project;
    },

    async getPosts(projectId: number): Promise<KeywordCheckPost[]> {
        const response = await apiClient.get(`/keyword-check/projects/${projectId}/posts`);
        return response.data.posts;
    },

    async createPost(projectId: number, data: { name: string; type: 'comment' | 'post'; link?: string | null; keywords: string }): Promise<KeywordCheckPost> {
        const response = await apiClient.post(`/keyword-check/projects/${projectId}/posts`, data);
        return response.data.post;
    },

    async checkKeywords(postId: number): Promise<{ success: boolean; matched_count?: number; error?: string }> {
        const response = await apiClient.post(`/services/keyword-check/${postId}`);
        return response.data;
    },

    async getItems(postId: number): Promise<KeywordCheckItem[]> {
        const response = await apiClient.get(`/keyword-check/posts/${postId}/items`);
        return response.data.items;
    },

    async createItem(postId: number, data: { content: string }): Promise<KeywordCheckItem> {
        const response = await apiClient.post(`/keyword-check/posts/${postId}/items`, data);
        return response.data.item;
    },

    async updateItem(itemId: number, data: { content?: string }): Promise<KeywordCheckItem> {
        const response = await apiClient.put(`/keyword-check/items/${itemId}`, data);
        return response.data.item;
    },

    async deleteItem(itemId: number): Promise<void> {
        await apiClient.delete(`/keyword-check/items/${itemId}`);
    },

    async updatePost(postId: number, data: { name?: string; status?: string; keywords?: string }): Promise<KeywordCheckPost> {
        const response = await apiClient.put(`/keyword-check/posts/${postId}`, data);
        return response.data.post;
    },

    async deletePost(postId: number): Promise<void> {
        await apiClient.delete(`/keyword-check/posts/${postId}`);
    },

    async deleteMultiplePosts(postIds: number[]): Promise<void> {
        await apiClient.post('/keyword-check/posts/delete-multiple', { post_ids: postIds });
    },

    async createPostWithItems(projectId: number, data: {
        name: string;
        type: 'comment' | 'post';
        keywords: string;
        items: string[];
    }): Promise<KeywordCheckPost> {
        const response = await apiClient.post(`/keyword-check/projects/${projectId}/posts/with-items`, data);
        return response.data.post;
    },
};

// ========== POST SCAN ==========
export interface PostScanProject {
    id: number;
    name: string;
    fb_page_id: string;
    public_id: string | null;
    created_at: string;
    last_scanned_at: string | null;
    keywords: string | null;
    group_ids: string | null;
    scan_frequency: string | null;
    is_active: boolean;
    is_ai_check_active: boolean;
    post_scan_ai_prompt: string | null;
    is_public: boolean;
    creator?: { id: number; name: string };
    results_count?: number;
}

export interface PostScanResult {
    id: number;
    project_id: number;
    post_content: string;
    post_link: string;
    found_keywords: string[];
    scanned_at: string;
    group_id: string;
    ai_check_result: string | null;
    ai_check_details: { prompt: string; response: any } | null;
    post_created_at: string | null;
}

export interface PostScanLog {
    id: number;
    project_id: number;
    request_urls: string[];
    created_at: string;
}

export const postScanService = {
    async getProjects(): Promise<PostScanProject[]> {
        const response = await apiClient.get('/post-scan/projects');
        return response.data.projects;
    },

    async getProject(id: number): Promise<PostScanProject> {
        const response = await apiClient.get(`/post-scan/projects/${id}`);
        return response.data.project;
    },

    async createProject(data: { name: string; fb_page_id?: string }): Promise<PostScanProject> {
        const response = await apiClient.post('/post-scan/projects', data);
        return response.data.project;
    },

    async deleteProject(id: number): Promise<void> {
        await apiClient.delete(`/post-scan/projects/${id}`);
    },

    async updateProject(id: number, data: { name: string }): Promise<PostScanProject> {
        const response = await apiClient.put(`/post-scan/projects/${id}`, data);
        return response.data.project;
    },

    async getResults(projectId: number): Promise<PostScanResult[]> {
        const response = await apiClient.get(`/post-scan/projects/${projectId}/results`);
        return response.data.results;
    },

    async scanPosts(projectId: number): Promise<{ success: boolean; new_posts?: number; error?: string }> {
        const response = await apiClient.post(`/services/post-scan/${projectId}`);
        return response.data;
    },

    async analyzePost(resultId: number): Promise<{ success: boolean; analysis?: string; error?: string }> {
        const response = await apiClient.post('/services/post-scan/analyze', { result_id: resultId });
        return response.data;
    },

    async getPublic(publicId: string): Promise<PostScanProject> {
        const response = await apiClient.get(`/post-scan/public/${publicId}`);
        return response.data.project;
    },

    async saveConfig(projectId: number, data: {
        keywords?: string;
        group_ids?: string;
        is_active?: boolean;
        is_ai_check_active?: boolean;
        post_scan_ai_prompt?: string;
        scan_frequency?: string;
    }): Promise<void> {
        await apiClient.put(`/post-scan/projects/${projectId}`, data);
    },

    async getLogs(projectId: number): Promise<PostScanLog[]> {
        const response = await apiClient.get(`/post-scan/projects/${projectId}/logs`);
        return response.data.logs;
    },

    async runComprehensiveScan(projectId: number, timeCheckString?: string): Promise<{
        success: boolean;
        posts: PostScanResult[];
        error?: string;
    }> {
        const response = await apiClient.post(`/services/post-scan/${projectId}/comprehensive`, {
            timeCheckString
        });
        return response.data;
    },

    async deleteMultipleResults(resultIds: number[]): Promise<void> {
        await apiClient.post('/post-scan/results/delete-multiple', { result_ids: resultIds });
    },

    async updatePublicStatus(projectId: number, isPublic: boolean): Promise<{ public_id: string | null }> {
        const response = await apiClient.post(`/post-scan/projects/${projectId}/public`, { is_public: isPublic });
        return response.data;
    },
};

// ========== EMAIL SCAN ==========
export interface EmailScanProject {
    id: number;
    name: string;
    fb_post_id: string;
    created_at: string;
    last_scanned_at: string | null;
    creator?: { id: number; name: string };
    results_count?: number;

}

export interface EmailScanResult {
    id: number;
    project_id: number;
    email: string;
    comment_content: string;
    account_name: string;
    account_id: string;
    comment_link: string;
}

export const emailScanService = {
    async getProjects(): Promise<EmailScanProject[]> {
        const response = await apiClient.get('/email-scan/projects');
        return response.data.projects;
    },

    async getProject(id: number): Promise<EmailScanProject> {
        const response = await apiClient.get(`/email-scan/projects/${id}`);
        return response.data.project;
    },

    async createProject(data: { name: string; fb_post_id?: string }): Promise<EmailScanProject> {
        const response = await apiClient.post('/email-scan/projects', data);
        return response.data.project;
    },

    async deleteProject(id: number): Promise<void> {
        await apiClient.delete(`/email-scan/projects/${id}`);
    },

    async updateProject(id: number, data: { name: string }): Promise<EmailScanProject> {
        const response = await apiClient.put(`/email-scan/projects/${id}`, data);
        return response.data.project;
    },

    async getResults(projectId: number): Promise<EmailScanResult[]> {
        const response = await apiClient.get(`/email-scan/projects/${projectId}/results`);
        return response.data.results;
    },

    async scanEmails(projectId: number): Promise<{ success: boolean; emails_found?: number; error?: string }> {
        const response = await apiClient.post(`/services/email-scan/${projectId}`);
        return response.data;
    },

    async saveConfig(projectId: number, data: { fb_post_id: string }): Promise<void> {
        await apiClient.put(`/email-scan/projects/${projectId}`, data);
    },

    async deleteMultipleResults(resultIds: number[]): Promise<void> {
        await apiClient.post('/email-scan/results/delete-multiple', { result_ids: resultIds });
    },

    async getLogs(projectId: number): Promise<{ id: number; created_at: string; request_url: string | null; raw_response: any; status: 'success' | 'error'; error_message: string | null }[]> {
        const response = await apiClient.get(`/email-scan/projects/${projectId}/logs`);
        return response.data.logs;
    },
};

// ========== AI PLAN ==========
export interface AiPlan {
    id: number;
    name: string;
    creator_id: number;
    status: 'draft' | 'generating' | 'completed' | 'failed';
    color: string;
    items_count: number;
    config: Record<string, any> | null;
    plan_data: Record<string, any> | null;
    public_slug: string;
    created_at: string;
    template_id: number | null;
    slug: string | null;
    is_public: boolean;
    creator?: { id: number; name: string };
    documents?: AiPlanDocument[];
}

export interface AiPlanDocument {
    id: number;
    plan_id: number;
    title: string;
    content: string;
}

export interface AiPlanTemplate {
    id: number;
    name: string;
    config: Record<string, any>;
    creator?: { id: number; name: string };
}

export const aiPlanService = {
    async getPlans(): Promise<AiPlan[]> {
        const response = await apiClient.get('/ai-plan/plans');
        return response.data.plans;
    },

    async getPlan(id: number): Promise<AiPlan> {
        const response = await apiClient.get(`/ai-plan/plans/${id}`);
        return response.data.plan;
    },

    async createPlan(data: { name: string; config?: Record<string, any> }): Promise<AiPlan> {
        const response = await apiClient.post('/ai-plan/plans', data);
        return response.data.plan;
    },

    async updatePlan(id: number, data: Partial<AiPlan>): Promise<AiPlan> {
        const response = await apiClient.put(`/ai-plan/plans/${id}`, data);
        return response.data.plan;
    },

    async deletePlan(id: number): Promise<void> {
        await apiClient.delete(`/ai-plan/plans/${id}`);
    },

    async generatePlan(planId: number): Promise<{ success: boolean; plan_data?: Record<string, any>; error?: string }> {
        const response = await apiClient.post(`/services/ai-plan/generate/${planId}`);
        return response.data;
    },

    async getTemplates(): Promise<AiPlanTemplate[]> {
        const response = await apiClient.get('/ai-plan/templates');
        return response.data.templates;
    },

    async createTemplate(data: { name: string; config: Record<string, any> }): Promise<AiPlanTemplate> {
        const response = await apiClient.post('/ai-plan/templates', data);
        return response.data.template;
    },

    async getPublic(slug: string): Promise<AiPlan> {
        const response = await apiClient.get(`/ai-plan/public/${slug}`);
        return response.data.plan;
    },

    async getLogs(planId: number): Promise<{ id: number; created_at: string; prompt: string; response: any }[]> {
        const response = await apiClient.get(`/ai-plan/plans/${planId}/logs`);
        return response.data.logs;
    },

    async getTemplate(templateId: number): Promise<AiPlanTemplate & { structure: any }> {
        const response = await apiClient.get(`/ai-plan/templates/${templateId}`);
        return response.data.template;
    },

    async updateTemplate(templateId: number, data: { structure?: any; name?: string }): Promise<AiPlanTemplate> {
        const response = await apiClient.put(`/ai-plan/templates/${templateId}`, data);
        return response.data.template;
    },

    async regenerateSection(planId: number, data: { sectionId: string; feedback: string; itemToRegenerate?: any }): Promise<AiPlan> {
        const response = await apiClient.post(`/services/ai-plan/regenerate-section/${planId}`, data);
        return response.data.plan;
    },
};



export default {
    keywordCheck: keywordCheckService,
    postScan: postScanService,
    emailScan: emailScanService,
    aiPlan: aiPlanService,
};

