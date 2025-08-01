import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Library } from 'lucide-react';
import { showError } from '@/utils/toast';

type Condition = {
  id: string;
  content: string;
};

type Library = {
  id: number;
  name: string;
  conditions: Condition[];
};

interface ConditionLibraryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (conditions: Condition[]) => void;
}

export const ConditionLibraryDialog = ({ isOpen, onOpenChange, onSelect }: ConditionLibraryDialogProps) => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchLibraries = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('condition_libraries')
          .select('id, name, conditions');
        
        if (error) {
          showError("Không thể tải thư viện điều kiện: " + error.message);
        } else {
          setLibraries(data || []);
        }
        setIsLoading(false);
      };
      fetchLibraries();
    }
  }, [isOpen]);

  const filteredLibraries = libraries.filter(lib => 
    lib.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectLibrary = (library: Library) => {
    onSelect(library.conditions || []);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chọn từ Thư viện Điều kiện</DialogTitle>
          <DialogDescription>Chọn một bộ điều kiện đã được định sẵn để thêm vào mục này.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm thư viện..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ScrollArea className="h-64 border rounded-md">
            <div className="p-2 space-y-1">
              {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : filteredLibraries.length > 0 ? (
                filteredLibraries.map(lib => (
                  <button 
                    key={lib.id} 
                    onClick={() => handleSelectLibrary(lib)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-slate-100"
                  >
                    <Library className="h-5 w-5 text-slate-500" />
                    <span className="font-medium text-slate-800">{lib.name}</span>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">Không tìm thấy thư viện nào.</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};