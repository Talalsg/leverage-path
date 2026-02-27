import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Briefcase, 
  Users, 
  Lightbulb, 
  Compass,
  UserCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertsPanel } from '@/components/AlertsPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, shortcut: 'D' },
  { title: 'Deal Flow', url: '/deals', icon: Target, shortcut: 'F' },
  { title: 'Portfolio', url: '/portfolio', icon: Briefcase, shortcut: 'P' },
  { title: 'Ecosystem', url: '/ecosystem', icon: Users, shortcut: 'E' },
  { title: 'Insights', url: '/insights', icon: Lightbulb, shortcut: 'I' },
  { title: 'Strategy', url: '/strategy', icon: Compass, shortcut: 'S' },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const item = navItems.find(n => n.shortcut === key);
      if (item) {
        e.preventDefault();
        navigate(item.url);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
  return (
    <Sidebar 
      className={cn(
        "border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">The Leverage Engine</span>
              <span className="text-xs text-sidebar-foreground/50">2026 — Positioning</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-2 mb-2">
              Command Center
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === '/'}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                          "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                        )}
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground"
                      >
                        <item.icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="font-medium">{item.title}</span>
                            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/50 border border-sidebar-border/50">{item.shortcut}</kbd>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        <ThemeToggle collapsed={collapsed} />
        <div className="flex items-center justify-between">
          {!collapsed && user && (
            <p className="text-xs text-sidebar-foreground/50 truncate flex-1">{user.email}</p>
          )}
          <AlertsPanel />
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
          className={cn(
            "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "justify-center px-0"
          )}
        >
          <UserCircle className="h-5 w-5" />
          {!collapsed && <span>Profile</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
