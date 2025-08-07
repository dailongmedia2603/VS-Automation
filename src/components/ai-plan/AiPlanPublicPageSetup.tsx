import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, UploadCloud, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

type PublicSettings = {
  id: number;
  company_name: string;
  description: string;
  logo_url: string | null;
};

export const AiPlanPublicPageSetup = () => {
  const [settings, setSettings] = useState<Partial<PublicSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('public_page_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        showError("Không thể tải cài đặt: " + error.message);
      } else if (data) {
        setSettings(data);
        setLogoPreview(data.logo_url);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoPreview(URL.createObjectURL(file));

      // Resize image before setting it to state for upload
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 512;
          const MAX_HEIGHT = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              setLogoFile(resizedFile);
            }
          }, file.type, 0.9);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setSettings(s => ({ ...s, logo_url: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let logoUrl = settings.logo_url;

      if (logoFile) {
        const filePath = `public/${Date.now()}-${logoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('public_logos')
          .upload(filePath, logoFile, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('public_logos')
          .getPublicUrl(filePath);
        logoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('public_page_settings')
        .upsert({
          id: 1,
          company_name: settings.company_name,
          description: settings.description,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      showSuccess("Đã lưu cài đặt thành công!");
      setLogoFile(null);
    } catch (error: any) {
      showError("Lưu thất bại: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  return (
    <Card className="shadow-sm rounded-2xl bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Cài đặt trang Public</CardTitle>
        <CardDescription>Tùy chỉnh tiêu đề, mô tả và logo hiển thị trên trang chia sẻ kế hoạch AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="public-title">Tên kế hoạch</Label>
          <Input
            id="public-title"
            value={settings.company_name || ''}
            onChange={(e) => setSettings(s => ({ ...s, company_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="public-description">Mô tả</Label>
          <Textarea
            id="public-description"
            value={settings.description || ''}
            onChange={(e) => setSettings(s => ({ ...s, description: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-slate-50">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Chưa có logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Tải ảnh lên
              </Button>
              {logoPreview && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive justify-start p-2 h-auto" onClick={handleRemoveLogo}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa logo
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};