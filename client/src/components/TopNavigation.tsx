import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Moon, Sun, User, Settings, LogOut, ChevronDown, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/generated_images/Cooling_solutions_company_logo_f0d02c59.png";
import NotificationPanel from "@/components/NotificationPanel";
import type { Notification, Company } from "@shared/schema";

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userId = user?.id || "demo-user-id";
  const userName = user?.username || "Guest";
  const userRole = user?.role || "staff";

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/company/me"],
    enabled: !!user && user.role !== "super_admin",
    retry: false,
  });
  const companyName = company?.name || "CoolDesk";
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    // Apply theme on mount and when changed
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Persist to localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // Don't manually redirect - AppRouter will handle it
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "An error occurred while logging out",
        variant: "destructive",
      });
    }
  };

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="flex items-center justify-between gap-4 h-16 px-6 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60" data-testid="header-navigation">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="rounded-lg" />
        <div className="hidden md:block h-6 w-px bg-border" />
        <div className="min-w-0">
          <h1 className="font-semibold text-[15px] leading-tight truncate" data-testid="text-welcome-message">
            Welcome back, {userName}
          </h1>
          <p className="text-xs text-muted-foreground truncate" data-testid="text-company-name">
            {companyName} &middot; {currentDate}
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search clients, reports, quotations..."
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-shadow"
            data-testid="input-quick-search"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg text-muted-foreground"
          data-testid="button-theme-toggle"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-lg text-muted-foreground"
              data-testid="button-notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                  data-testid="badge-notification-count"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="end">
            <NotificationPanel userId={userId} />
          </PopoverContent>
        </Popover>

        <div className="hidden sm:block h-6 w-px bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pl-1.5 pr-2 rounded-lg" data-testid="button-user-menu">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-medium text-xs" data-testid="text-user-avatar">
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium leading-none" data-testid="text-user-name">
                  {userName}
                </span>
                <span className="text-[11px] text-muted-foreground capitalize mt-0.5">
                  {userRole}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="menu-item-profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-item-settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="menu-item-logout">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}