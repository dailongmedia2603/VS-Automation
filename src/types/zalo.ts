export interface ZaloUser {
  userId: string;
  displayName: string;
  zaloName: string;
  phoneNumber: string | null;
  avatar: string;
  gender: string | null;
}

export interface ZaloConversation {
  threadId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
  lastMessageDirection?: 'in' | 'out' | null;
  labels: string[];
  hasScheduledScript: boolean;
}

export interface ZaloMessageDb {
  id: number;
  threadId: string;
  message_content: string | null;
  message_image: string | null;
  created_at: string;
  threadId_name: string;
  direction?: 'in' | 'out';
}

export interface ZaloMessage {
  id: number;
  content: string | null;
  imageUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  isOutgoing: boolean;
}

export type CareScriptStatus = 'scheduled' | 'sent' | 'failed';

export interface ZaloCareScript {
  id: number;
  thread_id: string;
  content: string;
  scheduled_at: string;
  status: CareScriptStatus;
  image_url?: string;
  created_at: string;
}

export interface ZaloNote {
  id: number;
  thread_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export interface ZaloLabel {
  id: number;
  name: string;
  color: string;
}

export interface ZaloAiLog {
  id: number;
  created_at: string;
  status: 'success' | 'error';
  details: string;
  system_prompt: string | null;
  log_type: 'auto_reply' | 'care_script_suggestion';
}