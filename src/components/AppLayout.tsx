import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex h-screen bg-white">
      <aside className={cn(
        "hidden md:flex md:flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      </aside>
      <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
        <header className="md:hidden sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-white px-4 sm:px-6">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar 
                isCollapsed={false} 
                toggleSidebar={() => {}}
                onLinkClick={() => setIsMobileMenuOpen(false)}
                hideToggleButton={true}
              />
            </SheetContent>
          </Sheet>
        </header>
        <Outlet />
      </div>
    </div>
  );
}