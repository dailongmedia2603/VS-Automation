import { ToolCard } from "@/components/ToolCard";
import { MessageSquareQuote, ScanSearch } from "lucide-react";

const tools = [
  {
    title: "Check Key Word Comment",
    description: "Quét và lọc các bình luận chứa từ khóa trên các bài đăng Facebook.",
    icon: MessageSquareQuote,
    href: "/tools/check-keyword-comment",
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Check Post Scan",
    description: "Quét các bài viết mới trên group hàng ngày.",
    icon: ScanSearch,
    href: "/tools/check-post-scan",
    color: "bg-green-100 text-green-600",
  },
];

const Tools = () => {
  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Công cụ</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Khám phá các công cụ mạnh mẽ để tối ưu hóa quy trình làm việc của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <ToolCard
            key={tool.title}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            href={tool.href}
            color={tool.color}
          />
        ))}
      </div>
    </main>
  );
};

export default Tools;