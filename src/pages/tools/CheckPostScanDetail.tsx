import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CheckPostScanDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/tools/check-post-scan">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Chi tiết dự án quét bài viết #{projectId}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Đây là trang chi tiết cho công cụ Check Post Scan. Chức năng sẽ được phát triển thêm.
          </p>
        </div>
      </div>
    </main>
  );
};

export default CheckPostScanDetail;