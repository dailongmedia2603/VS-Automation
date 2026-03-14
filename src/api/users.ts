import apiClient from './client';

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    roles?: Role[];
}

export interface Role {
    id: number;
    name: string;
    permissions?: Permission[];
}

export interface Permission {
    id: number;
    name: string;
}

export const userService = {
    async getUsers(): Promise<User[]> {
        const response = await apiClient.get('/users');
        return response.data.users;
    },

    async getUser(id: number): Promise<User> {
        const response = await apiClient.get(`/users/${id}`);
        return response.data.user;
    },

    async createUser(data: { name: string; email: string; password: string; role?: string }): Promise<User> {
        const response = await apiClient.post('/users', data);
        return response.data.user;
    },

    async updateUser(id: number, data: Partial<User> & { password?: string; role?: string }): Promise<User> {
        const response = await apiClient.put(`/users/${id}`, data);
        return response.data.user;
    },

    async deleteUser(id: number): Promise<void> {
        await apiClient.delete(`/users/${id}`);
    },
};

export const roleService = {
    async getRoles(): Promise<Role[]> {
        const response = await apiClient.get('/roles');
        return response.data.roles;
    },

    async getRole(id: number): Promise<Role> {
        const response = await apiClient.get(`/roles/${id}`);
        return response.data.role;
    },

    async createRole(data: { name: string; permissions?: string[] }): Promise<Role> {
        const response = await apiClient.post('/roles', data);
        return response.data.role;
    },

    async updateRole(id: number, data: { name?: string; permissions?: string[] }): Promise<Role> {
        const response = await apiClient.put(`/roles/${id}`, data);
        return response.data.role;
    },

    async deleteRole(id: number): Promise<void> {
        await apiClient.delete(`/roles/${id}`);
    },

    async getPermissions(): Promise<Permission[]> {
        const response = await apiClient.get('/permissions');
        return response.data.permissions;
    },
};

export default { userService, roleService };
