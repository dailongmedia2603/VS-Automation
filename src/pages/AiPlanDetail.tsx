import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AiPlanDetail = () => {
  const { planId } = useParams();

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/ai-plan">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Kế hoạch Marketing {planId}</h1>
          <p className="text-muted-foreground mt-2">
            Đây là nơi hiển thị chi tiết kế hoạch marketing của bạn.
          </p>
        </div>
      </div>
      <div className="text-center py-16 text-muted-foreground">
        <p>Giao diện chi tiết (dạng bảng hoặc slide) sẽ sớm được phát triển!</p>
      </div>
    </main>
  );
};

export default AiPlanDetail;