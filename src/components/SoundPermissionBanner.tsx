import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface SoundPermissionBannerProps {
  onGrantPermission: () => Promise<boolean>;
}

export const SoundPermissionBanner = ({ onGrantPermission }: SoundPermissionBannerProps) => {
  const handleGrant = async () => {
    const success = await onGrantPermission();
    if (success) {
      showSuccess("Âm thanh thông báo đã được bật!");
    } else {
      showError("Không thể bật âm thanh. Vui lòng kiểm tra cài đặt của trình duyệt.");
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <VolumeX className="h-6 w-6 text-slate-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-800">Bật thông báo âm thanh?</h3>
            <p className="text-sm text-slate-500">Nhấp để cho phép trình duyệt phát âm thanh khi có post hoàn thành.</p>
          </div>
        </div>
        <Button onClick={handleGrant} className="bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0">
          <Volume2 className="mr-2 h-4 w-4" />
          Bật âm thanh
        </Button>
      </div>
    </div>
  );
};