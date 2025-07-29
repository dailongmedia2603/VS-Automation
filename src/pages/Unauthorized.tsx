import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
        <ShieldAlert className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Không có quyền truy cập</h1>
        <p className="mt-2 text-slate-600">
          Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được cấp quyền.
        </p>
        <Button asChild className="mt-8 bg-blue-600 hover:bg-blue-700">
          <Link to="/">Quay về Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;