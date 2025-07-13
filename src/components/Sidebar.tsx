import {
  Pencil,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  GraduationCap,
  Search,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface NavItem {
  name: string;
  icon: React.ElementType;
  href: string;
}

const generalNavItems: NavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Dự án", icon: Briefcase, href: "/projects" },
  { name: "Báo cáo", icon: BarChart3, href: "/reports" },
  { name: "Nhân sự", icon: Users, href: "/staff" },
];

const chatbotNavItems: NavItem[] = [
    { name: "Hộp thư Chatbot", icon: MessageSquare, href: "/chatbot-inbox" },
    { name: "Cài đặt Chatbot", icon: Settings, href: "/chatbot-settings" },
    { name: "Training Chatbot", icon: GraduationCap, href: "/training-chatbot" },
]

const supportNavItems: NavItem[] = [
    { name: "Cài đặt API AI", icon: Settings, href: "/settings" },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();

  const renderLink = (item: NavItem) => (
    <Link
      key={item.name}
      to={item.href}
      className={cn(
        "flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-blue-100 hover:text-blue-700",
        location.pathname === item.href && "bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
      )}
    >
      <item.icon className="mr-4 h-5 w-5" />
      <span>{item.name}</span>
    </Link>
  );

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white text-zinc-800 p-6 space-y-6",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center space-x-3 px-2">
        <div className="bg-blue-600 rounded-full p-2">
          <Pencil className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-800">ava</span>
      </div>

      {/* User Profile */}
      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
        <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
                <AvatarImage src="https://i.pravatar.cc/150?u=dough" />
                <AvatarFallback>DD</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold text-sm">Dough Donut</p>
                <p className="text-xs text-gray-500">HyperDrive Plus</p>
            </div>
        </div>
        <LogOut className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search" className="bg-gray-100 border-none pl-9 rounded-lg focus-visible:ring-blue-500" />
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto">
        <div>
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">General</p>
            <nav className="flex flex-col space-y-1">
                {generalNavItems.map(renderLink)}
            </nav>
        </div>
        
        <div>
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chatbot</p>
            <nav className="flex flex-col space-y-1">
                {chatbotNavItems.map(renderLink)}
            </nav>
        </div>
      </div>

      {/* Support/Settings at the bottom */}
       <div className="mt-auto">
         <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Support</p>
         <nav className="flex flex-col space-y-1">
            {supportNavItems.map(renderLink)}
         </nav>
       </div>
    </div>
  );
}