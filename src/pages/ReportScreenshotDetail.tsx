import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ReportScreenshotDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/report-screenshot">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dự án Chụp ảnh Report #{projectId}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Trang chi tiết dự án đang được xây dựng.
          </p>
        </div>
      </div>
    </main>
  );
};

export default ReportScreenshotDetail;