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
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React from "react";

interface NavItem {
  name: string;
  icon: React.ElementType;
  href: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Dự án", icon: Briefcase, href: "/projects" },
  { name: "Training", icon: GraduationCap, href: "/training" },
  { name: "Báo cáo", icon: BarChart3, href: "/reports" },
  { name: "Nhân sự", icon: Users, href: "/staff" },
];

const chatbotNavItems: NavItem[] = [
    { name: "Hộp thư Chatbot", icon: MessageSquare, href: "/chatbot-inbox" },
    { name: "Cài đặt Chatbot", icon: Settings, href: "/chatbot-settings" },
]

const settingsNavItem: NavItem = { name: "Cài đặt API AI", icon: Settings, href: "/settings" };

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();

  const renderLink = (item: NavItem) => (
    <Link
      key={item.name}
      to={item.href}
      className={cn(
        "flex items-center rounded-lg px-3 py-2.5 text-md font-medium text-zinc-600 hover:bg-blue-50 hover:text-blue-600",
        location.pathname === item.href && "text-blue-100 text-blue-600"
      )}
    >
      <item.icon className="mr-3 h-5 w-5" />
      <span>{item.name}</span>
    </Link>
  );

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-zinc-50 text-zinc-800 p-4 lg:p-6 space-y-6",
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 rounded-full p-2">
          <Pencil className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-blue-600">ava</span>
      </div>

      <Button asChild size="lg" className="w-full text-md font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl">
        <Link to="/projects">
          <Plus className="mr-2 h-5 w-5" />
          New Project
        </Link>
      </Button>

      <nav className="flex flex-col space-y-1">
        {navItems.map(renderLink)}
      </nav>
      
      <div className="mt-auto flex flex-col space-y-1 border-t pt-4">
         <p className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Chatbot</p>
         {chatbotNavItems.map(renderLink)}
      </div>

       <div className="border-t pt-4">
         {renderLink(settingsNavItem)}
       </div>
    </div>
  );
}