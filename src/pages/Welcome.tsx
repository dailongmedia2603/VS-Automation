import hexaLogo from "@/assets/images/dailongmedia.png";
import { useAuth } from "@/contexts/AuthContext";

const Welcome = () => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || 'bạn';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-600 p-8">
      <img src={hexaLogo} alt="DAILONG MEDIA Logo" className="w-64 h-auto mb-8" />
      <h1 className="text-3xl font-bold text-slate-800">Chào mừng, {userName}!</h1>
      <p className="mt-2 max-w-md">
        Hệ thống Automation AI đã sẵn sàng. Hãy sử dụng menu bên trái để bắt đầu công việc của bạn.
      </p>
    </div>
  );
};

export default Welcome;