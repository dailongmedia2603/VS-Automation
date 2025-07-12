import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ShoppingBag, Image as ImageIcon } from "lucide-react";

export const ChatwootContactPanel = () => {
  return (
    <aside className="hidden lg:flex lg:w-80 border-l bg-white flex-col">
      <Tabs defaultValue="info" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none h-14">
          <TabsTrigger value="info" className="text-sm font-semibold">Thông tin</TabsTrigger>
          <TabsTrigger value="order" className="text-sm font-semibold">Tạo đơn</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="flex-1 flex flex-col p-4 space-y-4 bg-gray-50">
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-white rounded-lg p-4">
            <FileText className="h-10 w-10 mb-3 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">Bạn chưa có ghi chú nào</p>
          </div>
          <div className="relative">
            <Input placeholder="Nhập ghi chú (Enter để gửi)" className="pr-10 bg-white" />
            <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" />
          </div>
        </TabsContent>
        <TabsContent value="order" className="flex-1 flex flex-col p-4 space-y-4 bg-gray-50">
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-white rounded-lg p-4">
            <ShoppingBag className="h-10 w-10 mb-3 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">Chưa có lịch sử đơn hàng</p>
          </div>
          <Button className="w-full">+ Tạo đơn</Button>
        </TabsContent>
      </Tabs>
    </aside>
  );
};