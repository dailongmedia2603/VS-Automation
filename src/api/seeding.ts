import apiClient from './client';

export interface SeedingProject {
    id: number;
    name: string;
    creator_id: number;
    color: string;
    status: 'checking' | 'completed' | 'archived';
    total_posts: number;
    checking_posts: number;
    completed_posts: number;
    comment_check_count?: number;  // For CheckSeeding page stats
    post_approval_count?: number;  // For CheckSeeding page stats
    posts_count?: number;  // Legacy, kept for compatibility
    created_at: string;
    updated_at: string;
    creator?: { id: number; name: string };
    posts?: SeedingPost[];
}



export interface SeedingPost {
    id: number;
    project_id: number;
    fb_post_id: string | null;
    fb_post_url: string;
    post_content: string | null;
    status: 'checking' | 'completed' | 'archived';
    is_notification_seen: boolean;
    target_comments: number;
    current_comments: number;
    last_checked_at: string | null;
    created_at: string;
    schedule?: SeedingSchedule;
}

// Extended post format for SeedingProjectDetail page
export interface SeedingPostExtended {
    id: number;
    name: string;
    links: string | null;
    content: string | null;
    status: 'checking' | 'completed';
    type: 'comment_check' | 'post_approval';
    visible_count: number;
    total_count: number;
    last_checked_at?: string | null;
    schedule?: SeedingSchedule;
}

export interface SeedingSchedule {
    id: number;
    post_id: number;
    status: 'pending' | 'running' | 'completed' | 'cancelled';
    scheduled_at: string;
    run_count: number;
}


export const seedingService = {
    // ========== PROJECTS ==========
    async getProjects(): Promise<SeedingProject[]> {
        const response = await apiClient.get('/seeding/projects');
        return response.data.projects;
    },

    async getProject(id: number): Promise<SeedingProject> {
        const response = await apiClient.get(`/seeding/projects/${id}`);
        return response.data.project;
    },

    async createProject(data: { name: string; color?: string }): Promise<SeedingProject> {
        const response = await apiClient.post('/seeding/projects', data);
        return response.data.project;
    },

    async updateProject(id: number, data: Partial<SeedingProject>): Promise<SeedingProject> {
        const response = await apiClient.put(`/seeding/projects/${id}`, data);
        return response.data.project;
    },

    async deleteProject(id: number): Promise<void> {
        await apiClient.delete(`/seeding/projects/${id}`);
    },

    // ========== POSTS ==========
    async getPosts(projectId: number): Promise<SeedingPost[]> {
        const response = await apiClient.get(`/seeding/projects/${projectId}/posts`);
        return response.data.posts;
    },

    // Extended posts for project detail page (with computed stats)
    async getPostsExtended(projectId: number): Promise<SeedingPostExtended[]> {
        const response = await apiClient.get(`/seeding/projects/${projectId}/posts`);
        return response.data.posts;
    },

    async getPost(id: number): Promise<SeedingPost> {
        const response = await apiClient.get(`/seeding/posts/${id}`);
        return response.data.post;
    },

    async createPost(projectId: number, data: {
        name: string;
        type: 'comment_check' | 'post_approval';
        links?: string;
        content?: string;
        is_active?: boolean;
        status?: string;
        fb_post_url?: string;
        target_comments?: number;
    }): Promise<SeedingPost> {
        const response = await apiClient.post(`/seeding/projects/${projectId}/posts`, data);
        return response.data.post;
    },

    // Extended create for project detail page
    async createPostExtended(projectId: number, data: {
        name: string;
        type: 'comment_check' | 'post_approval';
        links?: string;
        content?: string;
    }): Promise<SeedingPostExtended> {
        const response = await apiClient.post(`/seeding/projects/${projectId}/posts`, data);
        return response.data.post;
    },

    async updatePost(id: number, data: Partial<SeedingPost>): Promise<SeedingPost> {
        const response = await apiClient.put(`/seeding/posts/${id}`, data);
        return response.data.post;
    },

    async updatePostName(id: number, name: string): Promise<void> {
        await apiClient.put(`/seeding/posts/${id}`, { name });
    },

    async updatePostStatus(id: number, status: 'checking' | 'completed'): Promise<void> {
        await apiClient.put(`/seeding/posts/${id}`, { status });
    },

    async deletePost(id: number): Promise<void> {
        await apiClient.delete(`/seeding/posts/${id}`);
    },

    // ========== COMMENTS ==========
    async createComment(postId: number, data: { content: string }): Promise<any> {
        const response = await apiClient.post(`/seeding/posts/${postId}/comments`, data);
        return response.data.comment;
    },

    async getComments(postId: number): Promise<any[]> {
        const response = await apiClient.get(`/seeding/posts/${postId}/comments`);
        return response.data.comments;
    },

    // ========== GROUPS ==========
    async createGroup(postId: number, data: { group_id: string }): Promise<any> {
        const response = await apiClient.post(`/seeding/posts/${postId}/groups`, data);
        return response.data.group;
    },

    async getGroups(postId: number): Promise<any[]> {
        const response = await apiClient.get(`/seeding/posts/${postId}/groups`);
        return response.data.groups;
    },


    // ========== ACTIONS ==========
    async checkPost(postId: number): Promise<{ success: boolean; current_comments?: number; error?: string }> {
        const response = await apiClient.post(`/services/seeding/check/${postId}`);
        return response.data;
    },

    async checkAllPosts(): Promise<{ success: boolean; results: Record<number, any> }> {
        const response = await apiClient.post('/services/seeding/check-all');
        return response.data;
    },

    async createSchedule(postId: number, scheduledAt?: string): Promise<SeedingSchedule> {
        const response = await apiClient.post(`/seeding/posts/${postId}/schedule`, { scheduled_at: scheduledAt });
        return response.data.schedule;
    },

    async cancelSchedule(postId: number): Promise<void> {
        await apiClient.delete(`/seeding/posts/${postId}/schedule`);
    },

    async markAsRead(postId: number): Promise<void> {
        await apiClient.post(`/seeding/posts/${postId}/mark-read`);
    },

    // ========== NOTIFICATIONS ==========
    async getUnreadCount(): Promise<number> {
        const response = await apiClient.get('/seeding/notifications/unread-count');
        return response.data.unread_count;
    },

    async getCompletedPosts(): Promise<CompletedPost[]> {
        const response = await apiClient.get('/seeding/notifications/completed');
        return response.data.posts;
    },

    async markMultipleAsRead(postIds: number[]): Promise<void> {
        await apiClient.post('/seeding/posts/mark-multiple-read', { post_ids: postIds });
    },

    async deleteMultiplePosts(postIds: number[]): Promise<void> {
        await apiClient.post('/seeding/posts/delete-multiple', { post_ids: postIds });
    },

    // ========== POST CONTENT ==========
    async updatePostContent(postId: number, content: string): Promise<void> {
        await apiClient.put(`/seeding/posts/${postId}`, { content });
    },

    // ========== COMMENTS EXTENDED ==========
    async updateComment(commentId: number, content: string): Promise<void> {
        await apiClient.put(`/seeding/comments/${commentId}`, { content });
    },

    async deleteComment(commentId: number): Promise<void> {
        await apiClient.delete(`/seeding/comments/${commentId}`);
    },

    async bulkCreateComments(postId: number, contents: string[]): Promise<void> {
        await apiClient.post(`/seeding/posts/${postId}/comments/bulk`, { contents });
    },

    // ========== GROUPS EXTENDED ==========
    async updateGroup(groupId: number, groupIdValue: string): Promise<void> {
        await apiClient.put(`/seeding/groups/${groupId}`, { group_id: groupIdValue });
    },

    async deleteGroup(groupId: number): Promise<void> {
        await apiClient.delete(`/seeding/groups/${groupId}`);
    },

    async bulkCreateGroups(postId: number, groupIds: string[]): Promise<void> {
        await apiClient.post(`/seeding/posts/${postId}/groups/bulk`, { group_ids: groupIds });
    },

    // ========== CHECK LOGS ==========
    async getCheckLogs(postId: number): Promise<SeedingCheckLog[]> {
        const response = await apiClient.get(`/seeding/posts/${postId}/logs`);
        return response.data.logs;
    },

    async saveCheckLog(postId: number, data: Partial<SeedingCheckLog>): Promise<void> {
        await apiClient.post(`/seeding/posts/${postId}/logs`, data);
    },

    // ========== CHECK OPERATIONS ==========
    async runCommentCheck(postId: number, fbPostId: string): Promise<CommentCheckResult> {
        const response = await apiClient.post(`/services/seeding/comment-check/${postId}`, { fb_post_id: fbPostId });
        return response.data;
    },

    async runPostApprovalCheck(postId: number, timeCheckString?: string): Promise<PostApprovalCheckResult> {
        const response = await apiClient.post(`/services/seeding/post-approval-check/${postId}`, { time_check_string: timeCheckString });
        return response.data;
    },

    // ========== EXPORT ==========
    async getPostApprovalExportData(postId: number): Promise<PostApprovalExportRow[]> {
        const response = await apiClient.get(`/seeding/posts/${postId}/export-data`);
        return response.data.data;
    },
};

// Check log type
export interface SeedingCheckLog {
    id: number;
    post_id: number;
    created_at: string;
    request_url: string | null;
    raw_response: any;
    status: 'success' | 'error';
    error_message: string | null;
    type?: 'comment_check' | 'post_approval';
}

// Comment check result
export interface CommentCheckResult {
    success: boolean;
    found: number;
    notFound: number;
    total: number;
    requestUrl?: string;
    rawResponse?: string;
    error?: string;
}

// Post approval check result
export interface PostApprovalCheckResult {
    success: boolean;
    approved: number;
    pending: number;
    total: number;
    requestUrl?: string;
    rawResponse?: any;
    error?: string;
}

// Export data row
export interface PostApprovalExportRow {
    post_content: string;
    group_id: string;
    approved_post_link: string | null;
    account_name: string | null;
    account_id: string | null;
}

// Completed post type for notifications
export interface CompletedPost {
    id: number;
    name: string;
    type: 'comment_check' | 'post_approval';
    project_id: number;
    last_checked_at: string | null;
    seeding_projects: { name: string } | null;
    is_notification_seen: boolean;
}

export default seedingService;
