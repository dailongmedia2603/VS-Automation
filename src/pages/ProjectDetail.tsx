import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';

type Project = {
  id: number;
  name: string;
};

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('content_ai_ds_du_an')
          .select('id, name')
          .eq('id', projectId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // No rows found
            setProject(null);
          } else {
            throw error;
          }
        } else {
          setProject(data);
        }
      } catch (error: any) {
        showError("Không thể tải chi tiết dự án: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-96 mt-2 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center gap-4">
          <Link to="/content-ai">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Không tìm thấy dự án
            </h1>
            <p className="text-muted-foreground mt-2">Dự án bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/content-ai">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {project.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Đây là nơi nội dung chi tiết của dự án sẽ được hiển thị.
          </p>
        </div>
      </div>
      {/* Placeholder for project content */}
      <div className="border-2 border-dashed border-slate-200 rounded-2xl h-96 flex items-center justify-center">
        <p className="text-slate-500">Nội dung dự án sẽ ở đây.</p>
      </div>
    </main>
  );
};

export default ProjectDetail;