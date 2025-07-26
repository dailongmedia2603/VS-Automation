import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy } from 'lucide-react';
import { Button } from './ui/button';
import { showSuccess } from '@/utils/toast';

interface ApiReferenceProps {
  baseUrl: string;
}

const endpoints = [
  {
    category: 'User',
    items: [
      { path: '/me?fields=id,name,email', description: 'Lấy thông tin cơ bản (ID, tên, email) của người dùng đã xác thực.' },
      { path: '/me/accounts', description: 'Lấy danh sách các Trang mà người dùng có vai trò.' },
      { path: '/{user-id}/picture', description: 'Lấy ảnh đại diện của một người dùng cụ thể.' },
    ],
  },
  {
    category: 'Page',
    items: [
      { path: '/{page-id}?fields=id,name,about,fan_count', description: 'Lấy thông tin chi tiết của một Trang.' },
      { path: '/{page-id}/feed', description: 'Lấy danh sách các bài viết trên một Trang.' },
      { path: '/{page-id}/posts', description: 'Lấy danh sách các bài viết do Trang đăng (không bao gồm bài của người dùng khác).' },
      { path: '/{page-id}/photos', description: 'Lấy danh sách các ảnh đã được đăng lên Trang.' },
    ],
  },
  {
    category: 'Post',
    items: [
      { path: '/{post-id}?fields=id,message,created_time,from', description: 'Lấy thông tin chi tiết của một bài viết.' },
      { path: '/{post-id}/comments', description: 'Lấy danh sách các bình luận của một bài viết.' },
      { path: '/{post-id}/reactions', description: 'Lấy danh sách các cảm xúc (like, love,...) của một bài viết.' },
    ],
  },
  {
    category: 'Group',
    items: [
      { path: '/{group-id}?fields=id,name,description', description: 'Lấy thông tin chi tiết của một Nhóm.' },
      { path: '/{group-id}/feed', description: 'Lấy danh sách các bài viết trong một Nhóm.' },
    ],
  },
];

const ApiEndpoint = ({ baseUrl, path, description }: { baseUrl: string, path: string, description: string }) => {
  const fullUrl = `${baseUrl}${path}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    showSuccess('Đã sao chép URL!');
  };

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="flex-1 mr-4">
        <p className="font-mono text-sm text-slate-700 break-all">{fullUrl}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy URL">
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const FacebookApiReference: React.FC<ApiReferenceProps> = ({ baseUrl }) => {
  const finalBaseUrl = baseUrl || 'https://graph.facebook.com/v20.0';

  return (
    <Card className="shadow-sm rounded-2xl bg-white mt-6">
      <CardHeader>
        <CardTitle>Tham khảo nhanh API Endpoints</CardTitle>
        <CardDescription>
          Đây là danh sách các URL mẫu để lấy dữ liệu. Thay thế các giá trị trong dấu ngoặc nhọn `{}` bằng ID tương ứng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {endpoints.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Badge variant="secondary" className="mr-3">{category.category}</Badge>
              </h3>
              <div className="border rounded-lg overflow-hidden bg-slate-50/50">
                {category.items.map((item) => (
                  <ApiEndpoint key={item.path} baseUrl={finalBaseUrl} path={item.path} description={item.description} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};