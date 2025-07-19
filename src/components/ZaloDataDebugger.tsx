import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ZaloUser {
  userId: string;
  displayName: string;
  zaloName: string;
  avatar: string;
}

interface ZaloConversation {
  threadId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
}

interface ZaloDataDebuggerProps {
  usersMap: Map<string, ZaloUser>;
  conversations: ZaloConversation[];
}

export const ZaloDataDebugger: React.FC<ZaloDataDebuggerProps> = ({ usersMap, conversations }) => {
  const availableUserIds = Array.from(usersMap.keys());

  return (
    <Card className="mt-6 border-red-500">
      <CardHeader>
        <CardTitle className="text-red-600">Trình gỡ lỗi dữ liệu Zalo</CardTitle>
        <CardDescription>
          Công cụ này giúp kiểm tra sự khớp dữ liệu giữa `zalo_messages` (threadId) và `zalo_user` (userId).
          Để avatar hiển thị, cột "Trạng thái khớp" phải là màu xanh.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h4 className="font-semibold mb-2">User ID có sẵn trong bảng `zalo_user` ({availableUserIds.length})</h4>
          <div className="bg-slate-50 p-2 rounded-lg max-h-96 overflow-y-auto">
            <ul className="text-xs list-disc list-inside">
              {availableUserIds.map(id => <li key={id}>{id}</li>)}
            </ul>
          </div>
        </div>
        <div className="md:col-span-2">
          <h4 className="font-semibold mb-2">Kiểm tra các cuộc trò chuyện</h4>
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thread ID (từ tin nhắn)</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Trạng thái khớp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map(convo => {
                  const isMatched = usersMap.has(String(convo.threadId).trim());
                  return (
                    <TableRow key={convo.threadId} className={isMatched ? 'bg-green-50' : 'bg-red-50'}>
                      <TableCell className="font-mono text-xs">{convo.threadId}</TableCell>
                      <TableCell>{convo.name}</TableCell>
                      <TableCell>
                        {isMatched ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};