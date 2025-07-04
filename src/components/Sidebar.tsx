import { Button } from "@/components/ui/button";
import {
  Pencil,
  Plus,
  LayoutDashboard,
  Briefcase,
  GraduationCap,
  BarChart3,
  Users,
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
    name: "Dự án",
    icon: Briefcase,
    href: "#",
    active: false,
  },
  {
    name: "Training",
    icon: GraduationCap,
    href: "#",
    active: false,
  },
  {
    name: "Báo cáo",
    icon: BarChart3,
    href: "#",
    active: false,
  },
  {
    name: "Nhân sự",
    icon: Users,
    href: "#",
    active: false,
  },
  {
    name: "Cài đặt",
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
              "flex items-center rounded-lg px-3 py-2.5 text-md font-medium text-zinc-600 hover:bg-blue-50 hover:text-blue-600",
              item.active && "text-blue-600 bg-blue-100"
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