import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Filter, Trash2, PlusCircle, Check, X } from 'lucide-react';
import { ChatwootLabel } from '@/types/chatwoot';

interface FilterPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  suggestedLabels: ChatwootLabel[];
  conversationCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  setFilters,
  isFilterOpen,
  setIsFilterOpen,
  suggestedLabels,
}) => {
  const handleClearFilters = () => {
    setFilters({ hasPhoneNumber: null, selectedLabels: [], seenNotReplied: false });
  };

  const areFiltersActive = filters.hasPhoneNumber !== null || filters.selectedLabels.length > 0 || filters.seenNotReplied;

  return (
    <div className="flex items-center gap-2 mt-2">
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="flex-grow">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-start px-3 font-normal text-muted-foreground">
            <Filter className="h-4 w-4 mr-2" />
            Thêm bộ lọc...
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="border rounded-lg p-3 space-y-3 bg-slate-50/50 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</h4>
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-white hover:bg-slate-100 cursor-pointer" onClick={() => setFilters((f: any) => ({...f, seenNotReplied: !f.seenNotReplied}))}>
                <Checkbox id="seenNotReplied" checked={filters.seenNotReplied} />
                <label htmlFor="seenNotReplied" className="flex-1 cursor-pointer text-slate-700">Đã xem, chưa trả lời</label>
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-semibold text-slate-500 uppercase tracking-wider">Tags</h4>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-white hover:bg-slate-50 h-8 font-normal">
                    <span className="text-slate-700">{filters.selectedLabels.length > 0 ? `${filters.selectedLabels.length} tag đã chọn` : "Chọn tags..."}</span>
                    <PlusCircle className="ml-2 h-4 w-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm tag..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy tag.</CommandEmpty>
                      <CommandGroup>
                        {suggestedLabels.map((label) => {
                          const isSelected = filters.selectedLabels.includes(label.name);
                          return (
                            <CommandItem key={label.id} onSelect={() => {
                              if (isSelected) {
                                setFilters((f: any) => ({ ...f, selectedLabels: f.selectedLabels.filter((l: string) => l !== label.name) }));
                              } else {
                                setFilters((f: any) => ({ ...f, selectedLabels: [...f.selectedLabels, label.name] }));
                              }
                            }}>
                              <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className={cn("h-4 w-4")} /></div>
                              <div className="flex items-center"><span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: label.color }}></span><span className="truncate">{label.name}</span></div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                      {filters.selectedLabels.length > 0 && (
                        <><CommandSeparator /><CommandGroup><CommandItem onSelect={() => setFilters((f: any) => ({ ...f, selectedLabels: [] }))} className="justify-center text-center">Xóa bộ lọc</CommandItem></CommandGroup></>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {filters.selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {filters.selectedLabels.map((labelName: string) => {
                    const label = suggestedLabels.find(l => l.name === labelName);
                    const color = label?.color || '#6B7280';
                    return (
                      <Badge key={labelName} variant="outline" className="font-medium" style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}50` }}>
                        {labelName}
                        <button className="ml-1.5 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2" onClick={() => setFilters((f: any) => ({ ...f, selectedLabels: f.selectedLabels.filter((l: string) => l !== labelName) }))}>
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {areFiltersActive && (
        <Button variant="ghost" size="icon" onClick={handleClearFilters} className="flex-shrink-0">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
};