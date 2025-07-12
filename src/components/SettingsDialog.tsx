import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from '@/contexts/SettingsContext';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const SettingsDialog = ({ isOpen, onOpenChange }: SettingsDialogProps) => {
  const { settings, saveSettings } = useSettings();
  const [apiKey, setApiKey] = useState('');
  const [gptModel, setGptModel] = useState('gpt-4o');

  useEffect(() => {
    if (settings && isOpen) {
      setApiKey(settings.openaiApiKey || '');
      setGptModel(settings.gptModel || 'gpt-4o'); // Luôn đảm bảo có giá trị mặc định là gpt-4o
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    saveSettings({ openaiApiKey: apiKey, gptModel });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cài đặt API AI</DialogTitle>
          <DialogDescription>
            Cấu hình API Key và mô hình ngôn ngữ để sử dụng các tính năng AI.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gpt-model">Mô hình GPT</Label>
            <Select value={gptModel} onValueChange={setGptModel}>
              <SelectTrigger id="gpt-model">
                <SelectValue placeholder="Chọn mô hình" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">gpt-4o (Nhanh, rẻ, mạnh nhất)</SelectItem>
                <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                <SelectItem value="gpt-4">gpt-4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave}>Lưu thay đổi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};