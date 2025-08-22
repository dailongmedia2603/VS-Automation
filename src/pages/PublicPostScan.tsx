import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, ScanSearch } from 'lucide-react';

type Project = {
  id: number;
  name: string;
  keywords: string | null;
};

type ScanResult = {
  id: number;
  post_content: string;
  post_link: string;
  found_keywords: string[];
  scanned_at: string;
  group_id: string;
  post_created_at: string | null;
};

const PublicPostScan = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!publicId) {
        setError("Không tìm thấy ID dự án.");
        setIsLoading(false);
        return;
      }
      // Don't set loading to true on interval refresh
      if (isLoading) {
        // This is the initial load
      }

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('post_scan_projects')
          .select('id, name, keywords')
          .eq('public_id', publicId)
          .eq('is_public', true)
          .single();

        if (projectError || !projectData) {
          throw new Error("Không tìm thấy dự án hoặc dự án không được công khai.");
        }
        setProject(projectData);

        const { data: resultsData, error: resultsError } = await supabase
          .from('post_scan_results')
          .select('id, post_content, post_link, found_keywords, scanned_at, group_id, post_created_at')
          .eq('project_id', projectData.id)
          .order('post_created_at', { ascending: false });

        if (resultsError) throw resultsError;
        setResults(resultsData || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicData();
    const interval = setInterval(fetchPublicData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [publicId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Lỗi truy cập</h1>
        <p className="text-slate-600 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <main className="p-6 sm:p-8 md:p-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg rounded-2xl">
          <CardHeader className="bg-slate-100/80 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <ScanSearch className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">{project?.name}</CardTitle>
                <CardDescription>Kết quả quét bài viết theo thời gian thực</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nội dung bài viết</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Từ khóa</TableHead>
                    <TableHead>ID Group</TableHead>
                    <TableHead>Ngày đăng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length > 0 ? results.map(result => (
                    <TableRow key={result.id}>
                      <TableCell className="max-w-md"><p className="line-clamp-3 whitespace-pre-wrap">{result.post_content}</p></TableCell>
                      <TableCell><a href={result.post_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem bài viết</a></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{result.found_keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}</div></TableCell>
                      <TableCell>{result.group_id}</TableCell>
                      <TableCell>{result.post_created_at ? format(new Date(result.post_created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</TableCell>
                    </TableRow>
                  )) : (<TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">Chưa có kết quả nào.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PublicPostScan;