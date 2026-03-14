/**
 * Query Cache Utilities
 * Persist React Query cache to localStorage for instant data loading
 */

export const CACHE_PREFIX = 'rq_cache_';
export const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Get cached data from localStorage
 */
export function getCachedData<T>(key: string): T | undefined {
    try {
        const stored = localStorage.getItem(CACHE_PREFIX + key);
        if (!stored) return undefined;

        const entry: CacheEntry<T> = JSON.parse(stored);

        // Check if cache is expired
        if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return undefined;
        }

        return entry.data;
    } catch {
        return undefined;
    }
}

/**
 * Save data to localStorage cache
 */
export function setCachedData<T>(key: string, data: T): void {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
        // localStorage might be full or disabled
        console.warn('Failed to cache data:', error);
    }
}

/**
 * Clear specific cache entry
 */
export function clearCachedData(key: string): void {
    localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all query cache entries
 */
export function clearAllQueryCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
    // Content AI
    contentAiProjects: 'content-ai-projects',
    contentAiProject: (id: number) => `content-ai-project-${id}`,
    contentAiItems: (projectId: number) => `content-ai-items-${projectId}`,

    // Seeding
    seedingProjects: 'seeding-projects',
    seedingProject: (id: number) => `seeding-project-${id}`,
    seedingPosts: (projectId: number) => `seeding-posts-${projectId}`,
    seedingUnreadCount: 'seeding-unread-count',

    // Staff
    staffList: 'staff-list',
    rolesList: 'roles-list',

    // Report Screenshot
    reportProjects: 'report-projects',
    reportProject: (id: number) => `report-project-${id}`,

    // Email Scan
    emailScanProjects: 'email-scan-projects',
    emailScanProject: (id: number) => `email-scan-project-${id}`,

    // Post Scan
    postScanProjects: 'post-scan-projects',
    postScanProject: (id: number) => `post-scan-project-${id}`,

    // Keyword Check
    keywordCheckProjects: 'keyword-check-projects',
    keywordCheckProject: (id: number) => `keyword-check-project-${id}`,

    // AI Plan
    aiPlans: 'ai-plans',
    aiPlan: (id: number) => `ai-plan-${id}`,
    aiPlanTemplates: 'ai-plan-templates',

    // Libraries
    promptLibraries: 'prompt-libraries',
    conditionLibraries: 'condition-libraries',
    structureLibraries: 'structure-libraries',

    // Notifications
    completedNotifications: 'completed-notifications',
} as const;
