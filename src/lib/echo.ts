/**
 * Laravel Echo WebSocket Configuration
 * 
 * This file sets up the connection to Laravel Reverb for real-time updates.
 * Import this in your main App component to enable WebSocket features.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

// Pusher is required as the client library
window.Pusher = Pusher;

// Initialize Laravel Echo with Reverb configuration
const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'vs-automation-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
});

export default echo;

// Export type for project updates
export interface ProjectUpdateEvent {
    module: 'content-ai' | 'seeding';
    action: 'created' | 'updated' | 'deleted';
    projectId: number;
    data?: Record<string, any>;
    timestamp: string;
}
