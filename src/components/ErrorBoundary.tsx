import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Cập nhật state để lần render tiếp theo sẽ hiển thị UI dự phòng.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Bạn cũng có thể log lỗi tới một dịch vụ báo cáo lỗi
    console.error("Lỗi chưa được bắt:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Giao diện dự phòng khi có lỗi
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-4">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Đã có lỗi xảy ra</h1>
          <p className="text-slate-600 mb-6">
            Rất tiếc, ứng dụng đã gặp sự cố không mong muốn.
          </p>
          <Button onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;