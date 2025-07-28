import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CompletionNotification = () => {
  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center gap-4">
        <Link to="/check-seeding">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Thông báo hoàn thành</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Gửi thông báo khi các dự án seeding đã hoàn thành.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-sm">
        <p className="text-slate-500">Nội dung trang thông báo hoàn thành sẽ được xây dựng ở đây.</p>
      </div>
    </main>
  );
};

export default CompletionNotification;