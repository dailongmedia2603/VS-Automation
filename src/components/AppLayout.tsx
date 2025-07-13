import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-white">
      <aside className="hidden md:flex md:w-72 flex-col">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}