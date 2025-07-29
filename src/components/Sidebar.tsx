import {
  Briefcase,
  BarChart3,
  Users,
  Settings,
  GraduationCap,
  LayoutDashboard,
  ChevronLeft,
  BookCopy,
  LogOut,
  Sparkles,
  CheckCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import hexaLogo from "@/assets/images/dailongmedia.png";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { useNotification } from "@/contexts/NotificationContext";

interface NavItem {
  name: string;
  icon: React.ElementType;
  href: string;
  resource: string;
}

const generalNavItems: NavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", resource: "dashboard" },
  { name: "Dự án", icon: Briefcase, href: "/projects", resource: "projects" },
  { name: "Báo cáo", icon: BarChart3, href: "/reports", resource: "reports" },
];

const documentsNavItems: NavItem[] = [
    { name: "Tài liệu đào tạo", icon: BookCopy, href: "/training-documents", resource: "training-documents" },
    { name: "Training Chatbot", icon: GraduationCap, href: "/training-chatbot", resource: "training-chatbot" },
];

const contentNavItems: NavItem[] = [
    { name: "Content AI", icon: Sparkles, href: "/content-ai", resource: "content-ai" },
];

const seederNavItems: NavItem[] = [
    { name: "Check Seeding", icon: CheckCircle, href: "/check-seeding", resource: "check-seeding" },
];

const toolsNavItems: NavItem[] = [
    { name: "Công cụ", icon: Wrench, href: "/tools", resource: "tools" },
];

const supportNavItems: NavItem[] = [
    { name: "Nhân sự", icon: Users, href: "/staff", resource: "staff" },
    { name: "Cài đặt chung", icon: Settings, href: "/settings", resource: "settings" },
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
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { unreadCount } = useNotification();

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
  }, [user, location]);

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

  const hasPermission = (resource: string, action: string) => {
    if (authProfile?.role === 'Admin') return true;
    return authProfile?.permissions?.[resource]?.includes(action);
  };

  const renderLink = (item: NavItem) => {
    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center rounded-lg py-2 text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600",
          location.pathname === item.href && "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
          isCollapsed ? "justify-center px-3 relative" : "px-4"
        )}
      >
        <div className="flex items-center">
          <item.icon className={cn("h-5 w-5 transition-all", !isCollapsed && "mr-3")} />
          <span className={cn("transition-all", isCollapsed && "sr-only")}>{item.name}</span>
        </div>
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

  const renderNavSection = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter(item => hasPermission(item.resource, 'view'));
    if (visibleItems.length === 0) return null;

    return (
      <div>
        <p className={cn("px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>{title}</p>
        <nav className="flex flex-col space-y-1">
          {visibleItems.map(renderLink)}
        </nav>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white text-zinc-800 space-y-4 border-r border-slate-100 relative transition-all duration-300",
        isCollapsed ? "p-3" : "p-4",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-8 h-8 w-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 z-10"
        onClick={toggleSidebar}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
      </Button>

      <div className={cn("flex items-center", isCollapsed ? "justify-center h-10" : "")}>
        {isCollapsed ? (
          <div className="bg-blue-600 rounded-lg p-2 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
        ) : (
          <img src={hexaLogo} alt="HEXA Logo" className="w-4/5 h-auto mx-auto" />
        )}
      </div>

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

      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
        {renderNavSection("General", generalNavItems)}
        {renderNavSection("TÀI LIỆU & HUẤN LUYỆN", documentsNavItems)}
        {renderNavSection("Content", contentNavItems)}
        {renderNavSection("Seeder", seederNavItems)}
        {renderNavSection("Công cụ", toolsNavItems)}
      </div>

       <div className="mt-auto">
         {renderNavSection("CÀI ĐẶT CHUNG", supportNavItems)}
       </div>
    </div>
  );
}