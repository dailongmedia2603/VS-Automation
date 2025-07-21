import { DocumentTrainer } from "@/components/DocumentTrainer";

const TrainingDocuments = () => {
  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tài liệu đào tạo</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Quản lý và huấn luyện AI với các tài liệu nội bộ của bạn. Cung cấp kiến thức chuyên sâu để AI có thể trả lời các câu hỏi phức tạp.
        </p>
      </div>
      <DocumentTrainer />
    </main>
  );
};

export default TrainingDocuments;