import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Copy, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

type Plan = {
  id: number;
  is_public: boolean;
  public_id: string | null;
  slug: string | null;
};

interface SharePlanDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: Plan;
  onPlanUpdate: (updates: Partial<Plan>) => void;
}

export const SharePlanDialog = ({ isOpen, onOpenChange, plan, onPlanUpdate }: SharePlanDialogProps) => {
  const [isPublic, setIsPublic] = useState(plan.is_public);
  const [isLoading, setIsLoading] = useState(false);
  const publicUrl = `${window.location.origin}/plan/${plan.slug}`;

  useEffect(() => {
    setIsPublic(plan.is_public);
  }, [plan.is_public]);

  const handleTogglePublic = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_plans')
        .update({ is_public: checked, updated_at: new Date().toISOString() })
        .eq('id', plan.id)
        .select('is_public, public_id, slug')
        .single();
      
      if (error) throw error;

      setIsPublic(data.is_public);
      onPlanUpdate(data);
      showSuccess(`Kế hoạch đã được ${checked ? 'công khai' : 'đặt riêng tư'}.`);
    } catch (error: any) {
      showError("Cập nhật thất bại: " + error.message);
      setIsPublic(!checked); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    showSuccess("Đã sao chép liên kết!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chia sẻ kế hoạch</DialogTitle>
          <DialogDescription>
            Tạo một liên kết công khai để chia sẻ kế hoạch này với người khác mà không cần họ đăng nhập.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="public-switch" className="font-medium">
              Công khai
            </Label>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch
                id="public-switch"
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={isLoading}
              />
            </div>
          </div>
          {isPublic && (
            <div className="space-y-2">
              <Label>Liên kết công khai</Label>
              <div className="flex items-center gap-2">
                <Input value={publicUrl} readOnly />
                <Button size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};