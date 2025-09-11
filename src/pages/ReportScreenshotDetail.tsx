import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const ReportScreenshotDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjectName = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('report_screenshot_projects')
          .select('name')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        if (data) {
          setProjectName(data.name);
        }
      } catch (error) {
        console.error("Error fetching project name:", error);
        setProjectName("Không tìm thấy dự án");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectName();
  }, [projectId]);

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/report-screenshot">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{projectName}</h1>
          )}
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Trang chi tiết dự án đang được xây dựng.
          </p>
        </div>
      </div>
    </main>
  );
};

export default ReportScreenshotDetail;