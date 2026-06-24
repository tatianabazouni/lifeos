import { LayoutDashboard, Clock, BookOpen, Palette, Target, Users, User, Sparkles, LogOut, Brain, Bell } from "lucide-react";

import { NavLink } from "@/components/NavLink";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth";
import { useEffect, useState } from "react";
import { gamificationApi } from "@/api/gamificationApi";
import { useNavigate } from "react-router-dom";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Memory Capsule", url: "/life-capsule", icon: Clock },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Vision Board", url: "/vision-board", icon: Palette },
  { title: "Goals", url: "/goals", icon: Target },

  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Connections", url: "/connections", icon: Users },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const user = authStore.getUser();
  const [xp, setXp] = useState(user?.xp || 0);
  const [level, setLevel] = useState(user?.level || 1);
  const [levelProgress, setLevelProgress] = useState(0);

  useEffect(() => {
    const load = async () => {
      const data = await gamificationApi.getSnapshot() as any;
      setXp(data.xp || 0);
      setLevel(data.level || 1);
      setLevelProgress(Number(data?.levelProgress?.progressPercent || 0));
    };
    void load();
  }, []);

  const progress = levelProgress;
  const handleSignOut = () => {
    authStore.logout();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-display text-lg font-bold">LifeOS</span>}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 border border-sidebar-border">
              <AvatarFallback className="bg-primary/10">{user?.name?.[0] || "E"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "Explorer"}</p>
              <p className="text-xs text-muted-foreground">Level {level}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{xp} XP</span>
              <span>Lvl {level}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
