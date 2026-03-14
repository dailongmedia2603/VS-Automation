import apiClient from './client';

export interface ContentAiProject {
    id: number;
    name: string;
    creator_id: number;
    color: string;
    items_count: number;
    created_at: string;
    updated_at: string;
    creator?: { id: number; name: string };
    items?: ContentAiItem[];
    documents?: Document[];
    check_feedback_prompt?: string | null;
}

export interface ContentAiItem {
    id: number;
    project_id: number;
    name: string;
    type: 'article' | 'comment';
    content: string | null;
    config: Record<string, any> | null;
    generation_status: 'idle' | 'generating' | 'completed' | 'failed';
    generation_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface Document {
    id: number;
    project_id: number;
    title: string;
    purpose: string | null;
    document_type: string | null;
    content: string | null;
    created_at: string;
}

export interface PromptLibrary {
    id: number;
    name: string;
    config: Record<string, any> | null;
    creator_id: number;
    created_at: string;
    creator?: { id: number; name: string };
}

export const contentAiService = {
    // ========== PROJECTS ==========
    async getProjects(): Promise<ContentAiProject[]> {
        const response = await apiClient.get('/content-ai/projects');
        return response.data.projects;
    },

    async getProject(id: number): Promise<ContentAiProject> {
        const response = await apiClient.get(`/content-ai/projects/${id}`);
        return response.data.project;
    },

    async createProject(data: { name: string; color?: string }): Promise<ContentAiProject> {
        const response = await apiClient.post('/content-ai/projects', data);
        return response.data.project;
    },

    async updateProject(id: number, data: Partial<ContentAiProject>): Promise<ContentAiProject> {
        const response = await apiClient.put(`/content-ai/projects/${id}`, data);
        return response.data.project;
    },

    async deleteProject(id: number): Promise<void> {
        await apiClient.delete(`/content-ai/projects/${id}`);
    },

    // ========== ITEMS ==========
    async getItems(projectId: number): Promise<ContentAiItem[]> {
        const response = await apiClient.get(`/content-ai/projects/${projectId}/items`);
        return response.data.items;
    },

    async getItem(id: number): Promise<ContentAiItem> {
        const response = await apiClient.get(`/content-ai/items/${id}`);
        return response.data.item;
    },

    async createItem(projectId: number, data: { name: string; type: 'article' | 'comment'; config?: Record<string, any> }): Promise<ContentAiItem> {
        const response = await apiClient.post(`/content-ai/projects/${projectId}/items`, data);
        return response.data.item;
    },

    async updateItem(id: number, data: Partial<ContentAiItem>): Promise<ContentAiItem> {
        const response = await apiClient.put(`/content-ai/items/${id}`, data);
        return response.data.item;
    },

    async deleteItem(id: number): Promise<void> {
        await apiClient.delete(`/content-ai/items/${id}`);
    },

    async generateContent(itemId: number): Promise<{ success: boolean; content?: string; error?: string }> {
        const response = await apiClient.post(`/services/generate-content/${itemId}`);
        return response.data;
    },

    async regenerateContent(itemId: number, data: { feedback: string; content_ids: string[] }): Promise<{ success: boolean; content?: string; error?: string }> {
        const response = await apiClient.post(`/services/regenerate-content/${itemId}`, data);
        return response.data;
    },

    async getLogs(itemId: number): Promise<any[]> {
        const response = await apiClient.get(`/content-ai/items/${itemId}/logs`);
        return response.data.logs;
    },

    async deleteLogs(itemId: number): Promise<void> {
        await apiClient.delete(`/content-ai/items/${itemId}/logs`);
    },

    // ========== DOCUMENTS ==========
    async getDocuments(projectId: number): Promise<Document[]> {
        const response = await apiClient.get(`/content-ai/projects/${projectId}/documents`);
        return response.data.documents;
    },

    async createDocument(projectId: number, data: Partial<Document>): Promise<Document> {
        const response = await apiClient.post(`/content-ai/projects/${projectId}/documents`, data);
        return response.data.document;
    },

    async updateDocument(id: number, data: Partial<Document>): Promise<Document> {
        const response = await apiClient.put(`/content-ai/documents/${id}`, data);
        return response.data.document;
    },

    async deleteDocument(id: number): Promise<void> {
        await apiClient.delete(`/content-ai/documents/${id}`);
    },

    // ========== NOTEBOOK SOURCES (FEEDBACK) ==========
    async getNotebookSources(projectId: number): Promise<any[]> {
        const response = await apiClient.get(`/content-ai/projects/${projectId}/notebook-sources`);
        return response.data.sources;
    },

    async uploadNotebookSource(projectId: number, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(`/content-ai/projects/${projectId}/notebook-sources`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async checkFeedback(projectId: number, data: { item_id: number; content_ids: string[] }): Promise<{ success: boolean; analysis: string; feedbacks?: { content_id: string; feedback: string }[] }> {
        const response = await apiClient.post(`/content-ai/projects/${projectId}/check-feedback`, data);
        return response.data;
    },

    async getItemFeedbacks(itemId: number): Promise<{ content_id: string; feedback: string }[]> {
        const response = await apiClient.get(`/content-ai/items/${itemId}/feedbacks`);
        return response.data;
    },

    async deleteNotebookSource(projectId: number, sourceId: string): Promise<void> {
        await apiClient.delete(`/content-ai/projects/${projectId}/notebook-sources/${sourceId}`);
    },
};

export const libraryService = {
    // ========== PROMPT LIBRARIES ==========
    async getPromptLibraries(): Promise<PromptLibrary[]> {
        const response = await apiClient.get('/libraries/prompts');
        return response.data.libraries;
    },

    async getPromptLibrary(id: number): Promise<PromptLibrary> {
        const response = await apiClient.get(`/libraries/prompts/${id}`);
        return response.data.library;
    },

    async createPromptLibrary(data: { name: string; config?: Record<string, any> }): Promise<PromptLibrary> {
        const response = await apiClient.post('/libraries/prompts', data);
        return response.data.library;
    },

    async updatePromptLibrary(id: number, data: Partial<PromptLibrary>): Promise<PromptLibrary> {
        const response = await apiClient.put(`/libraries/prompts/${id}`, data);
        return response.data.library;
    },

    async deletePromptLibrary(id: number): Promise<void> {
        await apiClient.delete(`/libraries/prompts/${id}`);
    },

    // ========== CONDITION LIBRARIES ==========
    async getConditionLibraries(): Promise<PromptLibrary[]> {
        const response = await apiClient.get('/libraries/conditions');
        return response.data.libraries;
    },

    async getConditionLibrary(id: number): Promise<PromptLibrary> {
        const response = await apiClient.get(`/libraries/conditions/${id}`);
        return response.data.library;
    },

    async createConditionLibrary(data: { name: string; config?: Record<string, any> }): Promise<PromptLibrary> {
        const response = await apiClient.post('/libraries/conditions', data);
        return response.data.library;
    },

    async updateConditionLibrary(id: number, data: Partial<PromptLibrary>): Promise<PromptLibrary> {
        const response = await apiClient.put(`/libraries/conditions/${id}`, data);
        return response.data.library;
    },

    async deleteConditionLibrary(id: number): Promise<void> {
        await apiClient.delete(`/libraries/conditions/${id}`);
    },

    // ========== STRUCTURE LIBRARIES ==========
    async getStructureLibraries(): Promise<PromptLibrary[]> {
        const response = await apiClient.get('/libraries/structures');
        return response.data.libraries;
    },

    async getStructureLibrary(id: number): Promise<PromptLibrary> {
        const response = await apiClient.get(`/libraries/structures/${id}`);
        return response.data.library;
    },

    async createStructureLibrary(data: { name: string; config?: Record<string, any> }): Promise<PromptLibrary> {
        const response = await apiClient.post('/libraries/structures', data);
        return response.data.library;
    },

    async updateStructureLibrary(id: number, data: Partial<PromptLibrary>): Promise<PromptLibrary> {
        const response = await apiClient.put(`/libraries/structures/${id}`, data);
        return response.data.library;
    },

    async deleteStructureLibrary(id: number): Promise<void> {
        await apiClient.delete(`/libraries/structures/${id}`);
    },

    async getStructureItems(): Promise<any[]> {
        const response = await apiClient.get('/libraries/structures/items');
        return response.data.structures;
    },

    async getStructuresByLibrary(libraryId: number): Promise<any[]> {
        const response = await apiClient.get(`/libraries/structures/${libraryId}/items`);
        return response.data.structures;
    },

    async createStructure(data: { name: string; library_id: number; description?: string; structure_content?: string }): Promise<any> {
        const response = await apiClient.post('/libraries/structures/items', data);
        return response.data;
    },

    async updateStructure(id: number, data: any): Promise<any> {
        const response = await apiClient.put(`/libraries/structures/items/${id}`, data);
        return response.data;
    },

    async deleteStructure(id: number): Promise<void> {
        await apiClient.delete(`/libraries/structures/items/${id}`);
    },
};

// ========== REPORTS SERVICE ==========
export const reportsService = {
    async getCostLogs(): Promise<{ created_at: string; response: any }[]> {
        const response = await apiClient.get('/content-ai/logs/all');
        return response.data.logs;
    },
};

export default contentAiService;

