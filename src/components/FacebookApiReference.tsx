import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Code, Search } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import endpointsData from '@/assets/data/facebook_graph_v23_get_endpoints_full.json';

interface FacebookApiReferenceProps {
  baseUrl: string;
}

interface Endpoint {
  endpoint: string;
  description: string;
}

export const FacebookApiReference: React.FC<FacebookApiReferenceProps> = ({ baseUrl }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const finalBaseUrl = baseUrl || 'https://graph.facebook.com/v20.0';

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery) {
      return endpointsData;
    }
    return (endpointsData as Endpoint[]).filter(
      (ep: Endpoint) =>
        ep.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <Card className="mt-6 shadow-sm rounded-2xl bg-white">
      <CardHeader>
        <CardTitle>Tham khảo API Endpoints (GET)</CardTitle>
        <CardDescription>
          Danh sách các GET endpoints có sẵn từ Facebook Graph API. Bạn có thể tìm kiếm theo đường dẫn hoặc mô tả.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Tìm kiếm trong ${endpointsData.length} endpoints...`}
            className="pl-9 bg-slate-100 border-none rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[400px] pr-4 border rounded-lg">
          <div className="p-4 space-y-4">
            {filteredEndpoints.length > 0 ? (
              filteredEndpoints.map((ex, index) => (
                <div key={index} className="p-4 border rounded-lg bg-slate-50/50">
                  <p className="text-sm text-slate-700 font-medium">{ex.description}</p>
                  <div className="mt-2 p-3 bg-slate-900 rounded-md text-white font-mono text-xs flex items-center gap-2">
                    <Code className="h-4 w-4 flex-shrink-0" />
                    <span className="break-all">
                      <span className="font-bold text-green-400">GET</span> {finalBaseUrl}{ex.endpoint}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Không tìm thấy endpoint nào phù hợp.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};