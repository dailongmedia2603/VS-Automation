import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InputConfigDialogProps {
  planConfig: any;
  onSave: (newConfig: any) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InputConfigDialog = ({ planConfig, onSave, open, onOpenChange }: InputConfigDialogProps) => {
    const [config, setConfig] = useState(planConfig || {});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setConfig(planConfig || {});
        }
    }, [planConfig, open]);

    const handleChange = (key: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(config);
            onOpenChange(false);
        } catch (error) {
            showError("Lỗi khi lưu cấu hình. Vui lòng thử lại.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Cấu hình thông tin đầu vào</DialogTitle>
                    <DialogDescription>
                        Chỉnh sửa các thông tin chi tiết để AI xây dựng kế hoạch marketing.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                    <div className="grid gap-6 py-4 pr-6">
                        <div className="grid gap-2">
                            <Label htmlFor="product_info">Thông tin sản phẩm/dịch vụ</Label>
                            <Textarea
                                id="product_info"
                                placeholder="Mô tả sản phẩm, điểm nổi bật, giá cả..."
                                value={config.product_info || ''}
                                onChange={(e) => handleChange('product_info', e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="target_audience">Đối tượng khách hàng mục tiêu</Label>
                            <Textarea
                                id="target_audience"
                                placeholder="Độ tuổi, giới tính, sở thích, vấn đề họ gặp phải..."
                                value={config.target_audience || ''}
                                onChange={(e) => handleChange('target_audience', e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="main_message">Thông điệp chính</Label>
                            <Input
                                id="main_message"
                                placeholder="Thông điệp cốt lõi bạn muốn truyền tải"
                                value={config.main_message || ''}
                                onChange={(e) => handleChange('main_message', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tone_style">Tông giọng & Phong cách</Label>
                            <Input
                                id="tone_style"
                                placeholder="VD: Thân thiện, chuyên gia, hài hước..."
                                value={config.tone_style || ''}
                                onChange={(e) => handleChange('tone_style', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="direction">Định hướng nội dung</Label>
                            <Textarea
                                id="direction"
                                placeholder="Nhập định hướng chi tiết cho bài viết..."
                                value={config.direction || ''}
                                onChange={(e) => handleChange('direction', e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reference_example">Ví dụ tham khảo</Label>
                            <Textarea
                                id="reference_example"
                                placeholder="Dán một bài viết hoặc đoạn văn mẫu vào đây..."
                                value={config.reference_example || ''}
                                onChange={(e) => handleChange('reference_example', e.target.value)}
                                className="min-h-[100px]"
                            />
                            <p className="text-xs text-muted-foreground">AI sẽ tham khảo văn phong, cách xưng hô, giọng điệu từ ví dụ này nhưng không sao chép nội dung.</p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lưu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};