export interface ZaloUser {
  userId: string;
  displayName: string;
  zaloName: string;
  avatar: string;
}

export interface ZaloConversation {
  threadId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
  lastMessageDirection?: 'in' | 'out' | null;
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