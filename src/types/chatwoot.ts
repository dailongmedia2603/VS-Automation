export type AiLog = {
  id: number;
  created_at: string;
  status: 'success' | 'error';
  details: string;
  system_prompt: string | null;
  conversation_id: number;
};

export type KeywordAction = {
  id: number;
  type: 'keyword' | 'phone_number';
  keyword: string | null;
  action_type: 'reply_with_content' | 'stop_auto_reply';
  reply_content: string | null;
  creator_email: string | null;
  created_at: string;
  is_active: boolean;
};

export type AiSettings = {
  id: number;
  api_url: string | null;
  api_key: string | null;
  created_at: string;
  embedding_model_name: string | null;
  openai_api_url: string | null;
  openai_api_key: string | null;
  openai_embedding_model: string | null;
};