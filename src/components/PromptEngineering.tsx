import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FlaskConical } from 'lucide-react';

const PromptEngineering = () => {
  return (
    <div className="mt-6">
      <Card className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-200/80">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold text-slate-900">Prompt Engineering</CardTitle>
          <CardDescription className="text-sm text-slate-500 pt-1">
            Thử nghiệm và tinh chỉnh prompt của bạn trong môi trường thực tế.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-lg p-12">
            <FlaskConical className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Tính năng đang được phát triển</h3>
            <p className="mt-1 text-sm">
              Không gian để bạn thử nghiệm, đánh giá và tối ưu hóa prompt sẽ sớm ra mắt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptEngineering;