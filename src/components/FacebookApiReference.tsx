import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from 'lucide-react';

interface FacebookApiReferenceProps {
  baseUrl: string;
}

export const FacebookApiReference: React.FC<FacebookApiReferenceProps> = ({ baseUrl }) => {
  const finalBaseUrl = baseUrl || 'https://graph.facebook.com/v20.0';

  const examples = [
    {
      title: "Lấy thông tin trang",
      description: "Lấy tên và ID của một trang Facebook.",
      endpoint: `${finalBaseUrl}/me?fields=id,name`,
    },
    {
      title: "Đăng bài viết lên trang",
      description: "Tạo một bài đăng mới trên dòng thời gian của trang.",
      endpoint: `${finalBaseUrl}/me/feed`,
      method: 'POST',
      body: `{ "message": "Hello, world!" }`,
    },
  ];

  return (
    <Card className="mt-6 shadow-sm rounded-2xl bg-white">
      <CardHeader>
        <CardTitle>Tham khảo API</CardTitle>
        <CardDescription>
          Một vài ví dụ về cách sử dụng API với cấu hình của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {examples.map((ex, index) => (
          <div key={index} className="p-4 border rounded-lg bg-slate-50/50">
            <h4 className="font-semibold text-slate-800">{ex.title}</h4>
            <p className="text-sm text-slate-500 mt-1">{ex.description}</p>
            <div className="mt-3 p-3 bg-slate-900 rounded-md text-white font-mono text-xs flex items-center gap-2">
              <Code className="h-4 w-4 flex-shrink-0" />
              <span className="break-all">
                <span className={`font-bold ${ex.method === 'POST' ? 'text-yellow-400' : 'text-green-400'}`}>{ex.method || 'GET'}</span> {ex.endpoint}
              </span>
            </div>
            {ex.body && (
               <div className="mt-2 p-3 bg-slate-800 rounded-md text-white font-mono text-xs">
                <p className="text-slate-400 mb-1">// Request Body</p>
                <pre><code>{ex.body}</code></pre>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};