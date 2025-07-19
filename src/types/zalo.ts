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
}

export interface ZaloMessageDb {
  id: number;
  threadId: string;
  message_content: string;
  created_at: string;
  threadId_name: string;
}

export interface ZaloMessage {
  id: number;
  content: string;
  createdAt: string;
  isOutgoing: boolean;
}