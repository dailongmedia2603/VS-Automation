import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        <Outlet />
      </div>
    </div>
  );
}