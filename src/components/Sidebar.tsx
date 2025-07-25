import {
  Briefcase,
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  GraduationCap,
  LayoutDashboard,
  ChevronLeft,
  MessageCircle,
  BookCopy,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import hexaLogo from "@/assets/images/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { useNotification } from "@/contexts/NotificationContext";

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
    { name: "Cấu hình Fanpage", icon: Settings, href: "/chatbot-settings" },
    { name: "Training Chatbot", icon: GraduationCap, href: "/training-chatbot" },
]

const zaloNavItems: NavItem[] = [
    { name: "Chatbot Zalo", icon: MessageCircle, href: "/chatbot-zalo" },
    { name: "Cấu hình Zalo", icon: Settings, href: "/zalo-settings" },
    { name: "Train Chatbot Zalo", icon: GraduationCap, href: "/training-zalo-chatbot" },
];

const documentsNavItems: NavItem[] = [
    { name: "Tài liệu đào tạo", icon: BookCopy, href: "/training-documents" },
];

const supportNavItems: NavItem[] = [
    { name: "Cài đặt chung", icon: Settings, href: "/settings" },
];

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

interface StaffProfile {
  name: string;
  role: string | null;
  avatar_url: string | null;
}

export function Sidebar({ className, isCollapsed, toggleSidebar }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { chatwootUnreadCount, zaloUnreadCount } = useNotification();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('role')
          .eq('id', user.id)
          .single();

        if (staffError && staffError.code !== 'PGRST116') { // Ignore 'not found' error
          throw staffError;
        }
        
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();

        if (refreshedUser) {
            setProfile({
                name: refreshedUser.user_metadata?.full_name || refreshedUser.email || 'Người dùng',
                role: staffData?.role || 'Thành viên',
                avatar_url: refreshedUser.user_metadata?.avatar_url
            });
        } else {
            setProfile(null);
        }

      } catch (e: any) {
        console.error('Exception fetching profile', e);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };
  
    fetchProfile();
  }, [user, location]); // Re-fetch on location change to catch updates

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess("Đăng xuất thành công!");
    } catch (error: any) {
      showError("Đăng xuất thất bại: " + error.message);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '...';
    const names = name.trim().split(' ');
    if (names.length > 1 && names[names.length - 1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderLink = (item: NavItem) => {
    let unreadCount = 0;
    if (item.href === '/chatbot-inbox') {
      unreadCount = chatwootUnreadCount;
    } else if (item.href === '/chatbot-zalo') {
      unreadCount = zaloUnreadCount;
    }

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center rounded-lg py-2 text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600",
          location.pathname === item.href && "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
          isCollapsed ? "justify-center px-3 relative" : "px-4 justify-between"
        )}
      >
        <div className="flex items-center">
          <item.icon className={cn("h-5 w-5 transition-all", !isCollapsed && "mr-3")} />
          <span className={cn("transition-all", isCollapsed && "sr-only")}>{item.name}</span>
        </div>
        {!isCollapsed && unreadCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isCollapsed && unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
        )}
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
        "h-full flex flex-col bg-white text-zinc-800 space-y-4 border-r border-slate-100 relative transition-all duration-300",
        isCollapsed ? "p-3" : "p-4",
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
      <div className={cn("flex items-center", isCollapsed ? "justify-center h-10" : "")}>
        {isCollapsed ? (
          <div className="bg-blue-600 rounded-lg p-2 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
        ) : (
          <img src={hexaLogo} alt="HEXA Logo" className="w-4/5 h-auto mx-auto" />
        )}
      </div>

      {/* User Profile */}
      <div className={cn("flex items-center justify-between rounded-lg bg-white p-2 transition-opacity duration-200 min-h-[60px]", isCollapsed && "opacity-0 hidden")}>
        {loadingProfile ? (
            <div className="flex items-center space-x-3 animate-pulse w-full">
                <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                </div>
            </div>
        ) : profile ? (
            <>
                <div className="flex items-center space-x-3 overflow-hidden">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="font-semibold text-sm truncate" title={profile.name}>{profile.name}</p>
                        <p className="text-xs text-gray-500 truncate" title={profile.role || 'Thành viên'}>{profile.role || 'Thành viên'}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleLogout}>
                  <LogOut className="h-5 w-5 text-gray-500 hover:text-red-500" />
                </Button>
            </>
        ) : (
            <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                    <AvatarFallback>??</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-sm">Chưa đăng nhập</p>
                </div>
            </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
        <div>
            <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>General</p>
            <nav className="flex flex-col space-y-1">
                {generalNavItems.map(renderLink)}
            </nav>
        </div>
        
        <div>
            <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>CHATBOT FANPAGE</p>
            <nav className="flex flex-col space-y-1">
                {chatbotNavItems.map(renderLink)}
            </nav>
        </div>

        <div>
            <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>Chatbot Zalo</p>
            <nav className="flex flex-col space-y-1">
                {zaloNavItems.map(renderLink)}
            </nav>
        </div>

        <div>
            <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>TÀI LIỆU</p>
            <nav className="flex flex-col space-y-1">
                {documentsNavItems.map(renderLink)}
            </nav>
        </div>
      </div>

      {/* Support/Settings at the bottom */}
       <div className="mt-auto">
         <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>CÀI ĐẶT CHUNG</p>
         <nav className="flex flex-col space-y-1">
            {supportNavItems.map(renderLink)}
         </nav>
       </div>
    </div>
  );
}