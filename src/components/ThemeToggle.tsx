import { Sun, Moon, Sunset, Stars } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Light", icon: Sun, description: "Bright & clean" },
  { value: "dark", label: "Dark", icon: Moon, description: "Professional dark" },
  { value: "evening", label: "Evening", icon: Sunset, description: "Warm amber tones" },
  { value: "night", label: "Night", icon: Stars, description: "Deep midnight" },
] as const;

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  
  const currentTheme = themes.find(t => t.value === theme) || themes[1];
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "h-8 w-8" : "w-full justify-start gap-3"
          )}
        >
          <CurrentIcon className="h-4 w-4" />
          {!collapsed && <span className="text-sm">{currentTheme.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={collapsed ? "center" : "start"} 
        className="w-56 bg-popover border-border z-50"
        sideOffset={8}
      >
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                theme === t.value && "bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
