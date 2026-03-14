import apiClient, { setAuthToken, clearAuth } from './client';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    roles?: { name: string }[];
    permissions?: { name: string }[];
}

export interface AuthResponse {
    user: User;
    token: string;
}

export const authService = {
    /**
     * Login user
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await apiClient.post('/login', credentials);
        const { user, token } = response.data;

        setAuthToken(token);
        localStorage.setItem('user', JSON.stringify(user));

        return response.data;
    },

    /**
     * Register new user
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        const response = await apiClient.post('/register', data);
        const { user, token } = response.data;

        setAuthToken(token);
        localStorage.setItem('user', JSON.stringify(user));

        return response.data;
    },

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/logout');
        } finally {
            clearAuth();
        }
    },

    /**
     * Get current user info
     */
    async me(): Promise<{ user: User; permissions: string[]; is_super_admin: boolean }> {
        const response = await apiClient.get('/me');
        return response.data;
    },

    /**
     * Get stored user from localStorage
     */
    getStoredUser(): User | null {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!localStorage.getItem('auth_token');
    },
};

export default authService;
