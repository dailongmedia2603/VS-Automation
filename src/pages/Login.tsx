import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import hexaLogo from "@/assets/images/logo.png";

const Login = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-8">
        <div>
          <img src={hexaLogo} alt="HEXA Logo" className="w-2/3 h-auto mx-auto mb-6" />
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
            Đăng nhập vào tài khoản của bạn
          </h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Địa chỉ email',
                password_label: 'Mật khẩu',
                button_label: 'Đăng nhập',
                loading_button_label: 'Đang đăng nhập...',
                social_provider_text: 'Đăng nhập với {{provider}}',
                link_text: 'Đã có tài khoản? Đăng nhập',
              },
              sign_up: {
                email_label: 'Địa chỉ email',
                password_label: 'Mật khẩu',
                button_label: 'Đăng ký',
                loading_button_label: 'Đang đăng ký...',
                social_provider_text: 'Đăng ký với {{provider}}',
                link_text: 'Chưa có tài khoản? Đăng ký',
              },
              forgotten_password: {
                email_label: 'Địa chỉ email',
                button_label: 'Gửi hướng dẫn đặt lại mật khẩu',
                loading_button_label: 'Đang gửi...',
                link_text: 'Quên mật khẩu?',
              },
              update_password: {
                password_label: 'Mật khẩu mới',
                button_label: 'Cập nhật mật khẩu',
                loading_button_label: 'Đang cập nhật...',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;