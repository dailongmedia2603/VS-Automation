import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleGenerate = () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: prompt.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setPrompt("");
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse = `Đây là nội dung mẫu được tạo ra dựa trên yêu cầu của bạn: "${prompt.trim()}".\n\nTrong một ứng dụng thực tế, chúng ta sẽ gọi một API AI để nhận về kết quả thực sự.`;
      setMessages([...newMessages, { role: "ai", content: aiResponse }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b p-4 flex items-center justify-between h-16">
        <h1 className="text-xl font-bold">New Chat</h1>
        {/* Các nút hành động có thể được thêm vào đây trong tương lai */}
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="w-16 h-16 mb-4" />
              <h2 className="text-2xl font-bold text-foreground">
                Bắt đầu cuộc trò chuyện
              </h2>
              <p className="mt-2">
                Tôi có thể giúp gì cho bạn hôm nay?
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-4 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "ai" && (
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 max-w-[80%] break-words ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <Avatar>
                  <AvatarFallback>BẠN</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="rounded-lg p-3 max-w-[80%] bg-muted flex items-center space-x-2">
                 <span className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-0"></span>
                 <span className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-200"></span>
                 <span className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-400"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="p-4 border-t">
        <div className="relative">
          <Textarea
            placeholder="Ví dụ: Viết một bài đăng blog về 5 lợi ích của việc đọc sách mỗi ngày."
            className="pr-16 min-h-[52px] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-3 -translate-y-1/2"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Index;