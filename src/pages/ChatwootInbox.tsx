import { useState, useEffect } from 'react';
import { useChatwoot } from '@/contexts/ChatwootContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const ChatwootInbox = () => {
  const { settings } = useChatwoot();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!settings.accountId || !settings.inboxId || !settings.apiToken) {
        setError('Vui lòng điền đầy đủ thông tin trong trang Cài đặt Chatbot.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('chatwoot-proxy', {
          body: {
            action: 'list_conversations',
            settings: settings,
          },
        });

        if (functionError) {
          const errorData = await functionError.context.json();
          throw new Error(errorData.error || functionError.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // API của Chatwoot trả về danh sách trong một thuộc tính 'payload'
        setConversations(data.payload || []);
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi không xác định.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [settings]);

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100">
      <h2 className="text-3xl font-bold tracking-tight">Hộp thư Chatbot</h2>
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Lỗi!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách cuộc trò chuyện</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <ul className="space-y-2">
              {conversations.length > 0 ? conversations.map((convo) => (
                <li key={convo.id} className="p-3 border rounded-md hover:bg-zinc-50 cursor-pointer">
                  <p className="font-semibold">{convo.meta.sender.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {convo.messages[0]?.content || 'Không có tin nhắn'}
                  </p>
                </li>
              )) : (
                <p className="text-sm text-muted-foreground">Không tìm thấy cuộc trò chuyện nào.</p>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ChatwootInbox;