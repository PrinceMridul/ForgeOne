import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  Activity,
  FolderGit2,
  FileCode2,
  TerminalSquare,
  Settings,
  Search,
  Bell,
  Command,
  ChevronDown,
  Plus,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { projects } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "D" },
  { to: "/agents", label: "Agents", icon: Bot, shortcut: "A" },
  { to: "/activity", label: "Activity", icon: Activity, shortcut: "T" },
  { to: "/repository", label: "Repository", icon: FolderGit2, shortcut: "R" },
  { to: "/code", label: "Code", icon: FileCode2, shortcut: "C" },
  { to: "/terminal", label: "Terminal", icon: TerminalSquare, shortcut: "`" },
  { to: "/settings", label: "Settings", icon: Settings, shortcut: "," },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <Logo />
        </div>

        <ProjectSwitcher />

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4 opacity-80" />
                <span className="flex-1">{item.label}</span>
                <kbd className="hidden group-hover:inline-flex items-center gap-0.5 rounded border border-border px-1 text-[10px] text-muted-foreground">
                  G {item.shortcut}
                </kbd>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[11px]">
                JS
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium">Jamie Stone</p>
              <p className="truncate text-[11px] text-muted-foreground">Pro workspace</p>
            </div>
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProjectSwitcher() {
  const [current] = projects;
  return (
    <div className="px-2 pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 text-left hover:bg-sidebar-accent transition-colors">
            <div className="h-6 w-6 rounded bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {current.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium">{current.name}</p>
              <p className="truncate text-[10px] text-muted-foreground flex items-center gap-1">
                <GitBranch className="h-2.5 w-2.5" /> {current.branch}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel>Switch project</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {projects.map((p) => (
            <DropdownMenuItem key={p.id} asChild>
              <Link
                to="/projects/$slug"
                params={{ slug: p.slug }}
                className="flex items-center gap-2"
              >
                <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
                  {p.name[0]}
                </div>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.language}</span>
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Plus className="h-3.5 w-3.5" /> New project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
      <div className="flex-1 max-w-md">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="w-full flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search or run command…</span>
          <kbd className="flex items-center gap-0.5 rounded border border-border px-1 text-[10px]">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>
      </div>
      <Button variant="ghost" size="sm" className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> New run
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      </Button>
    </header>
  );
}
