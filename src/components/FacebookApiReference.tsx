import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Code, Search, Link as LinkIcon } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import apiData from '@/assets/data/facebook_graph_endpoints.json';

interface FacebookApiReferenceProps {
  baseUrl: string;
  accessToken: string;
}

interface Endpoint {
  path: string;
  description: string;
  doc_url?: string;
}

const generateDescription = (nodeName: string, edgeName: string, notes?: string): string => {
    const formattedEdge = edgeName.replace(/_/g, ' ');
    const description = `Lấy ${formattedEdge} cho một ${nodeName}.`;
    return notes ? `${description} ${notes}` : description;
}

export const FacebookApiReference: React.FC<FacebookApiReferenceProps> = ({ baseUrl, accessToken }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const finalBaseUrl = baseUrl || 'https://graph.facebook.com/v20.0';

  const allEndpoints = useMemo(() => {
    const endpoints: Endpoint[] = [];
    const apiEndpoints = (apiData as any).default || apiData;

    if (!apiEndpoints || !apiEndpoints.endpoints) return [];

    apiEndpoints.endpoints.forEach((node: any) => {
      if (node.get) {
        node.get.forEach((path: string) => {
          endpoints.push({
            path: path,
            description: `Lấy một đối tượng ${node.node}.`,
            doc_url: node.doc_url
          });
        });
      }
      if (node.edges) {
        node.edges.forEach((edge: any) => {
          const edgeName = edge.path.split('/').pop() || 'items';
          endpoints.push({
            path: edge.path,
            description: generateDescription(node.node, edgeName, edge.notes),
            doc_url: edge.doc_url
          });
        });
      }
    });
    
    if (apiEndpoints.special && apiEndpoints.special.alias) {
        apiEndpoints.special.alias.forEach((alias: any) => {
            endpoints.push({
                path: alias.path,
                description: alias.notes || `Một endpoint đại diện.`,
                doc_url: alias.doc_url
            });
        });
    }

    return endpoints;
  }, []);

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery) {
      return allEndpoints;
    }
    return allEndpoints.filter(
      (ep: Endpoint) =>
        ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allEndpoints]);

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
            placeholder={`Tìm kiếm trong ${allEndpoints.length} endpoints...`}
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
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-700 font-medium flex-1 pr-4">{ex.description}</p>
                    {ex.doc_url && (
                        <a href={ex.doc_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex-shrink-0" title="Xem tài liệu">
                            <LinkIcon className="h-4 w-4" />
                        </a>
                    )}
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 rounded-md text-slate-900 font-mono text-xs flex items-center gap-2">
                    <Code className="h-4 w-4 flex-shrink-0" />
                    <span className="break-all">
                      <span className="font-bold text-green-600">GET</span> {finalBaseUrl}{ex.path}{accessToken && `?access_token=${accessToken}`}
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