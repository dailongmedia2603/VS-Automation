import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import hexaLogo from "@/assets/images/logo.png";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.5 69.5c-24.3-23.6-57.3-38.2-93.4-38.2-69.5 0-126.5 57.2-126.5 127.3s57 127.3 126.5 127.3c76.3 0 115.4-53.7 119.9-81.6h-120v-94.2h216.5c.8 12.2 1.2 24.5 1.2 37.2z"></path>
    </svg>
);

const Login = () => {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        showError("Vui lòng nhập email và mật khẩu.");
        return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      showSuccess('Đăng nhập thành công!');
    } catch (error: any) {
      showError(error.error_description || error.message || "Đã xảy ra lỗi đăng nhập.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    showError("Chức năng đăng nhập với Google chưa được hỗ trợ.");
  };

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-blue-600 lg:grid lg:grid-cols-2">
      <div className="bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 lg:rounded-r-[40px]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link to="#" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-8">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Trở lại trang chủ
            </Link>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Đăng nhập
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Nhập Email và mật khẩu để đăng nhập
            </p>
          </div>

          <div className="space-y-6">
            <Button variant="outline" className="w-full h-12 text-base" onClick={handleGoogleSignIn}>
              <GoogleIcon className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <Label htmlFor="email" className="font-semibold">Email*</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">Mật khẩu*</Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Tối thiểu 8 ký tự"
                    className="h-12 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Checkbox id="remember-me" name="remember-me" />
                  <Label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Giữ trạng thái đăng nhập
                  </Label>
                </div>

                <div className="text-sm">
                  <Link to="#" className="font-medium text-blue-600 hover:text-blue-500">
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Đăng nhập
                </Button>
              </div>
            </form>
            
            <p className="text-center text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Link to="#" className="font-medium text-blue-600 hover:text-blue-500">
                Đăng ký tài khoản
              </Link>
            </p>
          </div>
          <p className="text-center text-xs text-gray-400">
            © 2024 HEXA. All Rights Reserved.
          </p>
        </div>
      </div>
      <div className="hidden lg:flex items-center justify-center bg-blue-600 text-white p-8 relative">
        <div className="text-center z-10 flex flex-col items-center">
            <img src={hexaLogo} alt="HEXA Logo" className="w-32 h-auto mb-8" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="border border-white/20 rounded-2xl p-8 backdrop-blur-sm bg-white/10 max-w-md">
                <p className="text-sm uppercase tracking-widest text-blue-200">HEXA BOT</p>
                <p className="text-4xl font-bold mt-2 leading-tight">Siêu chatbot chăm sóc khách hàng</p>
            </div>
        </div>
        <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-8 text-sm text-blue-200">
            <a href="#" className="hover:text-white">Marketplace</a>
            <a href="#" className="hover:text-white">License</a>
            <a href="#" className="hover:text-white">Terms of Use</a>
            <a href="#" className="hover:text-white">Blog</a>
        </div>
      </div>
    </div>
  );
};

export default Login;