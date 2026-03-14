import apiClient from './client';

// ========== TYPES ==========
export interface AiPlan {
    id: number;
    name: string;
    creator_id: number;
    template_id: number;
    color: string;
    updated_at: string;
    created_at: string;
    items_count?: number;
    creator?: { id: number; name: string };
}

export interface AiPlanItem {
    id: number;
    plan_id: number;
    name: string;
    content: string | null;
    order_index: number;
    created_at: string;
    updated_at: string;
}

export interface AiPlanTemplate {
    id: number;
    name: string;
    description: string | null;
    content: any; // JSON prompt config
    created_at: string;
    updated_at: string;
}

export interface AiPlanDocument {
    id: number;
    plan_id: number;
    name: string;
    content: string | null;
    created_at: string;
}

// ========== SERVICE ==========
export const aiPlanService = {
    // ========== PLANS ==========
    async getPlans(): Promise<AiPlan[]> {
        const response = await apiClient.get('/ai-plan/plans');
        return response.data.plans;
    },

    async getPlan(id: number): Promise<AiPlan> {
        const response = await apiClient.get(`/ai-plan/plans/${id}`);
        return response.data.plan;
    },

    async createPlan(data: { name: string; template_id: number; color?: string }): Promise<AiPlan> {
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

    // ========== TEMPLATES ==========
    async getTemplates(): Promise<AiPlanTemplate[]> {
        const response = await apiClient.get('/ai-plan/templates');
        return response.data.templates;
    },

    async getTemplate(id: number): Promise<AiPlanTemplate> {
        const response = await apiClient.get(`/ai-plan/templates/${id}`);
        return response.data.template;
    },

    async createTemplate(data: { name: string; description?: string; content?: any }): Promise<AiPlanTemplate> {
        const response = await apiClient.post('/ai-plan/templates', data);
        return response.data.template;
    },

    async updateTemplate(id: number, data: Partial<AiPlanTemplate>): Promise<AiPlanTemplate> {
        const response = await apiClient.put(`/ai-plan/templates/${id}`, data);
        return response.data.template;
    },

    async deleteTemplate(id: number): Promise<void> {
        await apiClient.delete(`/ai-plan/templates/${id}`);
    },

    // ========== ITEMS ==========
    async getItems(planId: number): Promise<AiPlanItem[]> {
        const response = await apiClient.get(`/ai-plan/plans/${planId}/items`);
        return response.data.items;
    },

    async createItem(planId: number, data: { name: string; content?: string }): Promise<AiPlanItem> {
        const response = await apiClient.post(`/ai-plan/plans/${planId}/items`, data);
        return response.data.item;
    },

    async updateItem(itemId: number, data: Partial<AiPlanItem>): Promise<AiPlanItem> {
        const response = await apiClient.put(`/ai-plan/items/${itemId}`, data);
        return response.data.item;
    },

    async deleteItem(itemId: number): Promise<void> {
        await apiClient.delete(`/ai-plan/items/${itemId}`);
    },

    // ========== DOCUMENTS ==========
    async getDocuments(planId: number): Promise<AiPlanDocument[]> {
        const response = await apiClient.get(`/ai-plan/plans/${planId}/documents`);
        return response.data.documents;
    },

    async createDocument(planId: number, data: { name: string; content?: string }): Promise<AiPlanDocument> {
        const response = await apiClient.post(`/ai-plan/plans/${planId}/documents`, data);
        return response.data.document;
    },

    async updateDocument(docId: number, data: Partial<AiPlanDocument>): Promise<AiPlanDocument> {
        const response = await apiClient.put(`/ai-plan/documents/${docId}`, data);
        return response.data.document;
    },

    async deleteDocument(docId: number): Promise<void> {
        await apiClient.delete(`/ai-plan/documents/${docId}`);
    },

    // ========== PROMPT CONFIG ==========
    async getPromptConfig(planId: number): Promise<{ template: AiPlanTemplate; documents: AiPlanDocument[] }> {
        const response = await apiClient.get(`/ai-plan/plans/${planId}/prompt-config`);
        return response.data;
    },

    async updatePromptConfig(planId: number, config: any): Promise<void> {
        await apiClient.put(`/ai-plan/plans/${planId}/prompt-config`, { config });
    },

    // ========== PUBLIC PAGE ==========
    async getPublicPageConfig(planId: number): Promise<any> {
        const response = await apiClient.get(`/ai-plan/plans/${planId}/public-page`);
        return response.data;
    },

    async updatePublicPageConfig(planId: number, data: any): Promise<void> {
        await apiClient.put(`/ai-plan/plans/${planId}/public-page`, data);
    },

    async uploadLogo(planId: number, file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await apiClient.post(`/ai-plan/plans/${planId}/upload-logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // ========== GLOBAL PROMPT CONFIG ==========
    async getGlobalPromptConfig(): Promise<any> {
        const response = await apiClient.get('/ai-plan/prompt-config');
        return response.data.prompt_structure;
    },

    async updateGlobalPromptConfig(config: any): Promise<void> {
        await apiClient.put('/ai-plan/prompt-config', { prompt_structure: config });
    },

    // ========== GLOBAL PUBLIC PAGE SETTINGS ==========
    async getGlobalPublicPageSettings(): Promise<any> {
        const response = await apiClient.get('/ai-plan/public-page-settings');
        return response.data.settings;
    },

    async updateGlobalPublicPageSettings(data: any): Promise<void> {
        await apiClient.put('/ai-plan/public-page-settings', data);
    },

    async uploadGlobalLogo(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await apiClient.post('/ai-plan/public-page-settings/upload-logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // ========== PLAN DOCUMENTS (for AI Plan specific documents) ==========
    async getPlanDocuments(planId: number): Promise<AiPlanDocument[]> {
        const response = await apiClient.get(`/ai-plan/plans/${planId}/documents`);
        return response.data.documents;
    },

    async createPlanDocument(planId: number, data: { title: string; purpose?: string; document_type?: string; content?: string }): Promise<AiPlanDocument> {
        const response = await apiClient.post(`/ai-plan/plans/${planId}/documents`, data);
        return response.data.document;
    },

    async updatePlanDocument(docId: number, data: Partial<AiPlanDocument>): Promise<AiPlanDocument> {
        const response = await apiClient.put(`/ai-plan/documents/${docId}`, data);
        return response.data.document;
    },

    async deletePlanDocument(docId: number): Promise<void> {
        await apiClient.delete(`/ai-plan/documents/${docId}`);
    },

    async bulkDeletePlanDocuments(docIds: number[]): Promise<void> {
        await apiClient.post('/ai-plan/documents/bulk-delete', { ids: docIds });
    },
};

export default aiPlanService;

