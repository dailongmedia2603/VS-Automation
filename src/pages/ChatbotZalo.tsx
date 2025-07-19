import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ChatbotZalo = () => {
  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <Card className="shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Chatbot Zalo</CardTitle>
          <CardDescription>
            Quản lý và cấu hình Chatbot cho Zalo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Tính năng đang được phát triển.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default ChatbotZalo;