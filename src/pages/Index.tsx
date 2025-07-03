import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = () => {
    if (!prompt) return;

    setIsLoading(true);
    // Chú ý: Đây chỉ là một ví dụ mô phỏng.
    // Để có chức năng AI thực sự, bạn cần kết nối với một API của mô hình ngôn ngữ.
    setTimeout(() => {
      setGeneratedContent(
        `Đây là nội dung mẫu được tạo ra dựa trên yêu cầu của bạn: "${prompt}".\n\nTrong một ứng dụng thực tế, chúng ta sẽ gọi một API AI để nhận về kết quả thực sự. Bạn có thể thử nhập các yêu cầu khác nhau để xem giao diện hoạt động như thế nào.`
      );
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Trình Tạo Nội Dung AI
          </CardTitle>
          <CardDescription>
            Nhập chủ đề hoặc yêu cầu của bạn bên dưới và để AI viết nội dung cho
            bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="prompt" className="text-lg font-semibold">
                Yêu cầu của bạn
              </Label>
              <Textarea
                id="prompt"
                placeholder="Ví dụ: Viết một bài đăng blog về 5 lợi ích của việc đọc sách mỗi ngày."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] text-base"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt}
              size="lg"
            >
              {isLoading ? "Đang tạo..." : "Tạo Nội Dung"}
            </Button>
            {generatedContent && (
              <div className="grid gap-2 pt-4">
                <Label htmlFor="content" className="text-lg font-semibold">
                  Kết quả
                </Label>
                <div className="p-4 border rounded-md bg-secondary min-h-[250px]">
                  <p className="text-left whitespace-pre-wrap text-secondary-foreground">
                    {generatedContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;