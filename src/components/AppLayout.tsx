import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden md:flex md:w-72 flex-col shadow-md">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}