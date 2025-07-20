import { ZaloAutoReplyManager } from "@/components/ZaloAutoReplyManager";
import { ZaloLabelManager } from "@/components/ZaloLabelManager";

const ZaloSettings = () => {
  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Cài đặt Chatbot Zalo</h2>
      <div className="space-y-6">
        <ZaloAutoReplyManager />
        <ZaloLabelManager />
      </div>
    </main>
  );
};

export default ZaloSettings;