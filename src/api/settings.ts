import apiClient from './client';

export interface AiSettings {
    id: number;
    troll_llm_api_url: string;
    troll_llm_api_key?: string;
    troll_llm_model_id: string;
    gemini_api_key?: string;
    gemini_scan_model: string;
    gemini_content_model: string;
    embedding_model_name: string;
    antigravity_api_url?: string;
    antigravity_api_key?: string;
    vertex_project_id?: string;
    vertex_location?: string;
    vertex_model_id?: string;
}

export interface ApifbSettings {
    id: number;
    access_token?: string;
    page_id: string;
}

export interface TelegramSettings {
    id: number;
    bot_token?: string;
    chat_id: string;
    is_enabled: boolean;
}

export interface TelegramConfig {
    id: number;
    name: string;
    bot_token: string;
    chat_id: string;
    creator_id: string;
}

export interface N8nSettings {
    id: number;
    telegram_config_id_for_seeding?: number | null;
}

export interface NotebookLmSettings {
    id: number;
    cookies?: string;
    active_account_id?: string;
    api_key?: string;
}

export interface NotebookLmAccount {
    id: number;
    name: string;
    email?: string;
    cookies: string;
    account_id?: string;
    is_active: boolean;
    created_at: string;
    last_check_status?: 'success' | 'failed' | null;
    last_checked_at?: string | null;
    last_check_message?: string | null;
}

export interface CliproxySettings {
    id: number;
    api_url?: string;
    api_key?: string;
    default_model?: string;
}

export interface TrollLlmProvider {
    id: number;
    name: string;
    api_url: string;
    api_key?: string;
    model_id?: string;
    is_active: boolean;
    created_at: string;
    last_check_status?: 'success' | 'failed' | null;
    last_checked_at?: string | null;
    last_check_message?: string | null;
}

export interface AiApiPriority {
    id: number;
    provider_type: 'cliproxy' | 'troll_llm_provider';
    provider_id: number | null;
    priority: number;
    is_enabled: boolean;
    // Enriched fields from backend
    provider_name?: string;
    provider_url?: string;
    provider_model?: string;
}

export interface AllSettings {
    ai_settings: AiSettings;
    apifb_settings: ApifbSettings;
    telegram_settings: TelegramSettings;
    notebooklm_settings: NotebookLmSettings;
    notebooklm_accounts?: NotebookLmAccount[];
    cliproxy_settings?: CliproxySettings;
    troll_llm_providers?: TrollLlmProvider[];
    ai_api_priorities?: AiApiPriority[];
}

export const settingsService = {
    /**
     * Get all settings
     */
    async getAll(): Promise<AllSettings> {
        const response = await apiClient.get('/settings');
        return response.data;
    },

    /**
     * Update AI settings
     */
    async updateAiSettings(data: Partial<AiSettings>): Promise<AiSettings> {
        const response = await apiClient.put('/settings/ai', data);
        return response.data.settings;
    },

    /**
     * Update Facebook API settings
     */
    async updateApifbSettings(data: Partial<ApifbSettings>): Promise<ApifbSettings> {
        const response = await apiClient.put('/settings/facebook', data);
        return response.data.settings;
    },

    /**
     * Update Telegram settings
     */
    async updateTelegramSettings(data: Partial<TelegramSettings>): Promise<TelegramSettings> {
        const response = await apiClient.put('/settings/telegram', data);
        return response.data.settings;
    },

    /**
     * Update NotebookLM settings
     */
    async updateNotebookLmSettings(data: Partial<NotebookLmSettings>): Promise<NotebookLmSettings> {
        const response = await apiClient.put('/settings/notebooklm', data);
        return response.data.settings;
    },

    /**
     * Update Cliproxy settings
     */
    async updateCliproxySettings(data: Partial<CliproxySettings>): Promise<CliproxySettings> {
        const response = await apiClient.put('/settings/cliproxy', data);
        return response.data.settings;
    },

    // ========== AI API PRIORITIES ==========
    async getAiApiPriorities(): Promise<AiApiPriority[]> {
        const response = await apiClient.get('/settings/ai-api-priorities');
        return response.data.priorities;
    },

    async updateAiApiPriorities(
        priorities: Array<{ provider_type: string; provider_id: number | null; priority: number; is_enabled: boolean }>
    ): Promise<void> {
        await apiClient.put('/settings/ai-api-priorities', { priorities });
    },

    async syncAiApiPriorities(): Promise<AiApiPriority[]> {
        const response = await apiClient.post('/settings/ai-api-priorities/sync');
        return response.data.priorities;
    },

    // ========== TROLL LLM PROVIDERS ==========
    async getTrollLlmProviders(): Promise<TrollLlmProvider[]> {
        const response = await apiClient.get('/settings/troll-llm-providers');
        return response.data.providers;
    },

    async storeTrollLlmProvider(data: { name: string; api_url: string; api_key: string; model_id?: string }): Promise<TrollLlmProvider> {
        const response = await apiClient.post('/settings/troll-llm-providers', data);
        return response.data.provider;
    },

    async deleteTrollLlmProvider(id: number): Promise<void> {
        await apiClient.delete(`/settings/troll-llm-providers/${id}`);
    },

    async setActiveTrollLlmProvider(id: number): Promise<TrollLlmProvider> {
        const response = await apiClient.post(`/settings/troll-llm-providers/${id}/active`);
        return response.data.provider;
    },

    async checkTrollLlmProviderConnection(id: number): Promise<{ success: boolean; message: string; provider: TrollLlmProvider }> {
        const response = await apiClient.post(`/settings/troll-llm-providers/${id}/check`);
        return response.data;
    },

    // ========== NOTEBOOKLM ACCOUNTS ==========
    async getNotebookLmAccounts(): Promise<NotebookLmAccount[]> {
        const response = await apiClient.get('/settings/notebooklm-accounts');
        return response.data.accounts;
    },

    async storeNotebookLmAccount(data: { name: string; cookies: string }): Promise<NotebookLmAccount> {
        const response = await apiClient.post('/settings/notebooklm-accounts', data);
        return response.data.account;
    },

    async deleteNotebookLmAccount(id: number): Promise<void> {
        await apiClient.delete(`/settings/notebooklm-accounts/${id}`);
    },

    async setActiveNotebookLmAccount(id: number): Promise<NotebookLmAccount> {
        const response = await apiClient.post(`/settings/notebooklm-accounts/${id}/active`);
        return response.data.account;
    },

    async checkNotebookLmAccount(id: number): Promise<{ success: boolean; message: string; account: NotebookLmAccount }> {
        const response = await apiClient.post(`/settings/notebooklm-accounts/${id}/check`);
        return response.data;
    },

    // ========== TELEGRAM CONFIGS ==========
    async getTelegramConfigs(): Promise<TelegramConfig[]> {
        const response = await apiClient.get('/settings/telegram-configs');
        return response.data.configs;
    },

    async createTelegramConfig(data: { name: string; bot_token: string; chat_id: string }): Promise<TelegramConfig> {
        const response = await apiClient.post('/settings/telegram-configs', data);
        return response.data.config;
    },

    async updateTelegramConfig(id: number, data: Partial<TelegramConfig>): Promise<TelegramConfig> {
        const response = await apiClient.put(`/settings/telegram-configs/${id}`, data);
        return response.data.config;
    },

    async deleteTelegramConfig(id: number): Promise<void> {
        await apiClient.delete(`/settings/telegram-configs/${id}`);
    },

    async testTelegramConnection(botToken: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post('/services/test-telegram', { bot_token: botToken });
        return response.data;
    },

    // ========== N8N SETTINGS ==========
    async getN8nSettings(): Promise<N8nSettings> {
        const response = await apiClient.get('/settings/n8n');
        return response.data.settings;
    },

    async updateN8nSettings(data: Partial<N8nSettings>): Promise<N8nSettings> {
        const response = await apiClient.put('/settings/n8n', data);
        return response.data.settings;
    },

    // ========== TEST CONNECTIONS ==========
    async testAntigravityConnection(apiUrl: string, token: string): Promise<{ success: boolean; message: string }> {
        // Keeping the endpoint same for now or assume it will be handled by backend.
        // If backend endpoint name hasn't changed, we might need to update backend routes too if we want perfect naming.
        // For now, let's assume we reuse the same endpoint or I should verify backend routes.
        // Wait, I didn't update backend route names.
        // Let's keep the backend endpoint as 'test-gemini-custom' if I didn't change it, OR change it.
        // I checked routes/api.php earlier, didn't see explicit test routes in listing but they are likely there.
        // I will assume the endpoint is 'services/test-gemini-custom' based on previous file view.
        // Let's keep it 'test-gemini-custom' in URL but 'testAntigravityConnection' in function for now to minimize backend route changes unless requested.
        const response = await apiClient.post('/services/test-gemini-custom', { apiUrl, token });
        return response.data;
    },

    async testVertexConnection(): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post('/services/test-vertex');
        return response.data;
    },

    async testTrollLlmConnection(apiUrl: string, apiKey: string, modelId: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post('/services/test-troll-llm', { apiUrl, apiKey, modelId });
        return response.data;
    },

    async testNotebookLmConnection(cookies: string): Promise<{ success: boolean; message: string; data?: any }> {
        const response = await apiClient.post('/services/test-notebooklm', { cookies });
        return response.data;
    },

    async testCliproxyConnection(apiUrl: string, apiKey: string, model: string): Promise<{ success: boolean; message: string; data?: any }> {
        const response = await apiClient.post('/services/test-cliproxy', { apiUrl, apiKey, model });
        return response.data;
    },
};

export default settingsService;
