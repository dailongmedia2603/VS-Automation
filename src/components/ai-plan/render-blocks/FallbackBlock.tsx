import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FallbackBlockProps {
  componentName: string;
}

export const FallbackBlock: React.FC<FallbackBlockProps> = ({ componentName }) => {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Lỗi Hiển thị</AlertTitle>
      <AlertDescription>
        Component có tên <strong>"{componentName}"</strong> không được hỗ trợ hoặc đã bị lỗi.
      </AlertDescription>
    </Alert>
  );
};