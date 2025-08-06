import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

function Index() {
  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-slate-800">AI Planner</h1>
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>Danh sách dự án</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-600 mb-4">Chọn một dự án để bắt đầu.</p>
                <Link to="/projects/2" className="flex items-center justify-between p-4 rounded-lg bg-white hover:bg-slate-100 border transition-colors">
                    <div>
                        <p className="font-semibold text-slate-800">Dự án 2</p>
                        <p className="text-sm text-slate-500">Xem chi tiết và cấu hình</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                </Link>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Index;