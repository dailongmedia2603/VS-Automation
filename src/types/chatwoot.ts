export interface Attachment {
  id: number;
  file_type: 'image' | 'video' | 'audio' | 'file';
  data_url: string;
}

export interface MessageSender {
  name: string;
  thumbnail?: string;
}

export interface Conversation {
  id: number;
  meta: {
    sender: {
      id: number;
      name: string;
      email?: string;
      phone_number?: string;
      thumbnail?: string;
      additional_attributes?: {
        company_name?: string;
        product_service?: string;
      };
    };
  };
  messages: {
    content: string;
    message_type: number;
  }[];
  last_activity_at: number;
  unread_count: number;
  labels: string[];
  status: string;
  additional_attributes?: {
    type?: string;
  };
}

export interface Message {
  id: number;
  content: string;
  created_at: number;
  message_type: number;
  private: boolean;
  sender?: MessageSender;
  attachments?: Attachment[];
}

export type CareScriptStatus = 'scheduled' | 'sent' | 'failed';

export interface CareScript {
  id: number;
  content: string;
  scheduled_at: string;
  status: CareScriptStatus;
  image_url?: string;
}

export interface ChatwootLabel {
  id: number;
  name: string;
  color: string;
}