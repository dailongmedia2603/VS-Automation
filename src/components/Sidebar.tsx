import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// Dữ liệu mẫu cho lịch sử chat
const chatHistory = [
  { id: 1, title: "Lợi ích của việc đọc sách" },
  { id: 2, title: "Làm thế nào để học React" },
  { id: 3, title: "Tương lai của AI" },
  { id: 4, title: "Công thức bữa tối chay" },
];

export function Sidebar({ className }: { className?: string }) {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="px-3 py-4">
        <h2 className="mb-2 px-4 text-xl font-semibold tracking-tight">
          AI Content Writer
        </h2>
        <div className="space-y-1">
          <Button variant="secondary" className="w-full justify-start">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Lịch sử
        </h2>
        <div className="space-y-1">
          {chatHistory.map((chat) => (
            <Button
              key={chat.id}
              variant="ghost"
              className="w-full justify-start"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span className="truncate">{chat.title}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}