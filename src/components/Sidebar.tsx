import { Button } from "@/components/ui/button";
import {
  Pencil,
  Plus,
  LayoutDashboard,
  ListPlus,
  BookText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "#",
    active: true,
  },
  {
    name: "Request Feature",
    icon: ListPlus,
    href: "#",
    active: false,
  },
  {
    name: "Guides",
    icon: BookText,
    href: "#",
    active: false,
  },
  {
    name: "Settings",
    icon: Settings,
    href: "#",
    active: false,
  },
];

export function Sidebar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-full flex flex-col bg-zinc-50 text-zinc-800 p-4 lg:p-6 space-y-8",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 rounded-full p-2">
          <Pencil className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-blue-600">ava</span>
      </div>

      {/* New Project Button */}
      <Button
        size="lg"
        className="w-full text-md font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl"
      >
        <Plus className="mr-2 h-5 w-5" />
        New Project
      </Button>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-md font-medium text-zinc-600 hover:bg-zinc-200 hover:text-blue-600",
              item.active && "text-blue-600 bg-zinc-200"
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.name}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}