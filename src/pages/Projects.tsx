import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

const Projects = () => {
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

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: prompt.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentPrompt = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    const systemPrompt = {
      role: "system",
      content:
        "You are a helpful AI assistant specialized in professional content creation.",
    };
    const apiMessages = [systemPrompt, { role: "user", content: currentPrompt }];

    try {
      const { data, error } = await supabase.functions.invoke(
        "multi-ai-proxy",
        {
          body: { messages: apiMessages },
        }
      );

      if (error) {
        const detailedMessage = (error as any).context?.error || error.message;
        throw new Error(detailedMessage);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      const aiResponse = data.choices[0].message.content;
      setMessages([...newMessages, { role: "ai", content: aiResponse }]);
    } catch (err: any) {
      const errorMessage = `Đã xảy ra lỗi: ${err.message}.`;
      showError(errorMessage);
      setMessages([...newMessages, { role: "ai", content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="border-b p-4 flex items-center justify-between h-16 bg-white">
        <h1 className="text-xl font-bold text-gray-800">New Project</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <Sparkles className="w-16 h-16 mb-4 text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-800">
                Bắt đầu dự án mới
              </h2>
              <p className="mt-2">
                Nhập yêu cầu của bạn bên dưới để AI bắt đầu làm việc.
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
                  <AvatarFallback className="bg-blue-500 text-white">
                    AI
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 max-w-[80%] break-words text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
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
                <AvatarFallback className="bg-blue-500 text-white">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg p-3 max-w-[80%] bg-gray-200 flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-0"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-400"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="p-4 border-t bg-white">
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

export default Projects;