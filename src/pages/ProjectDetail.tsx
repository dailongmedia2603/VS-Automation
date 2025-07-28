import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();

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
            Chi tiết dự án: {projectId}
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