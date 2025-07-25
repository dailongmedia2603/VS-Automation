import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface SoundPermissionBannerProps {
  onGrantPermission: () => void;
}

export const SoundPermissionBanner = ({ onGrantPermission }: SoundPermissionBannerProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5">
      <div className="bg-background p-4 rounded-lg shadow-lg border flex items-center gap-4">
        <VolumeX className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="font-semibold">Bật thông báo âm thanh?</p>
          <p className="text-sm text-muted-foreground">Nhấp để cho phép trình duyệt phát âm thanh.</p>
        </div>
        <Button onClick={onGrantPermission}>
          <Volume2 className="h-4 w-4 mr-2" />
          Bật âm thanh
        </Button>
      </div>
    </div>
  );
};