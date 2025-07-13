import {
  Briefcase,
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  GraduationCap,
  Search,
  ArrowRight,
  LayoutDashboard,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "./ui/button";

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

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ className, isCollapsed, toggleSidebar }: SidebarProps) {
  const location = useLocation();

  const renderLink = (item: NavItem) => {
    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center rounded-lg py-2.5 text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600",
          location.pathname === item.href && "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
          isCollapsed ? "justify-center px-3" : "px-4"
        )}
      >
        <item.icon className={cn("h-5 w-5 transition-all", !isCollapsed && "mr-3")} />
        <span className={cn("transition-all", isCollapsed && "sr-only")}>{item.name}</span>
      </Link>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right" className="bg-blue-600 text-white border-blue-600">
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return linkContent;
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white text-zinc-800 space-y-6 border-r border-slate-100 relative transition-all duration-300",
        isCollapsed ? "p-3" : "p-6",
        className
      )}
    >
      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-8 h-8 w-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 z-10"
        onClick={toggleSidebar}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
      </Button>

      {/* Logo */}
      <div className={cn("flex items-center space-x-3 px-2", isCollapsed && "justify-center")}>
        <div className="bg-blue-600 rounded-lg p-2 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <span className={cn("text-2xl font-bold text-gray-800 whitespace-nowrap transition-all duration-200", isCollapsed && "opacity-0 w-0")}>HEXO</span>
      </div>

      {/* User Profile */}
      <div className={cn("flex items-center justify-between rounded-lg bg-white p-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>
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
        <ArrowRight className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>

      {/* Search */}
      <div className={cn("relative transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search" className="bg-slate-100 border-none pl-9 rounded-lg focus-visible:ring-blue-500" />
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto">
        <div>
            <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>General</p>
            <nav className="flex flex-col space-y-1">
                {generalNavItems.map(renderLink)}
            </nav>
        </div>
        
        <div>
            <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>Chatbot</p>
            <nav className="flex flex-col space-y-1">
                {chatbotNavItems.map(renderLink)}
            </nav>
        </div>
      </div>

      {/* Support/Settings at the bottom */}
       <div className="mt-auto">
         <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>Support</p>
         <nav className="flex flex-col space-y-1">
            {supportNavItems.map(renderLink)}
         </nav>
       </div>
    </div>
  );
}