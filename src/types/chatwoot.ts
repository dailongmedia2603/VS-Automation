export interface Conversation {
  id: number;
  messages: Message[];
  meta: {
    sender: Contact;
  };
  status: string;
  unread_count: number;
  last_activity_at: number;
  labels: string[];
}

export interface Contact {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  thumbnail: string;
  additional_attributes?: { [key: string]: any };
}

export interface Message {
  id: number;
  content: string;
  created_at: number;
  message_type: number; // 0 for incoming, 1 for outgoing
  private: boolean;
  sender?: {
    id: number;
    name: string;
    thumbnail: string;
  };
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  message_id: number;
  file_type: 'image' | 'video' | 'audio' | 'file';
  data_url: string;
}

export type CareScriptStatus = 'scheduled' | 'sent' | 'failed';

export interface CareScript {
  id: number;
  conversation_id: number;
  contact_id: number;
  content: string;
  scheduled_at: string;
  status: CareScriptStatus;
  image_url?: string;
  created_at: string;
}

export interface ChatwootLabel {
  id: number;
  name: string;
  color: string;
}

export interface AiLog {
  id: number;
  created_at: string;
  status: 'success' | 'error';
  details: string;
  system_prompt: string | null;
}

export interface KeywordAction {
  id: number;
  type: 'keyword' | 'phone_number';
  keyword: string | null;
  action_type: 'stop_auto_reply' | 'reply_with_content';
  reply_content: string | null;
  creator_email: string | null;
  created_at: string;
  is_active: boolean;
}