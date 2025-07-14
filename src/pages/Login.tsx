import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase } from 'lucide-react';

const Login = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="bg-blue-600 rounded-lg p-3 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-800">HEXO</span>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-lg">
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
                  social_provider_text: 'Đăng nhập với {{provider}}',
                  link_text: 'Đã có tài khoản? Đăng nhập',
                },
                sign_up: {
                  email_label: 'Địa chỉ email',
                  password_label: 'Mật khẩu',
                  button_label: 'Đăng ký',
                  social_provider_text: 'Đăng ký với {{provider}}',
                  link_text: 'Chưa có tài khoản? Đăng ký',
                },
                forgotten_password: {
                    email_label: 'Địa chỉ email',
                    password_label: 'Mật khẩu',
                    button_label: 'Gửi hướng dẫn',
                    link_text: 'Quên mật khẩu?',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;