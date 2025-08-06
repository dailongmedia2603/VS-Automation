import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";

interface CalloutBlockProps {
  content: string;
  type?: 'info' | 'warning' | 'success';
}

const iconMap = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
};

const titleMap = {
  info: 'Thông tin',
  warning: 'Lưu ý',
  success: 'Thành công',
};

export const CalloutBlock: React.FC<CalloutBlockProps> = ({ content, type = 'info' }) => {
  return (
    <Alert>
      {iconMap[type]}
      <AlertTitle>{titleMap[type]}</AlertTitle>
      <AlertDescription>{content}</AlertDescription>
    </Alert>
  );
};