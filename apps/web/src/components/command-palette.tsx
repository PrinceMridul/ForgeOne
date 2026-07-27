import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Bot,
  Activity,
  FolderGit2,
  FileCode2,
  TerminalSquare,
  Settings,
  Home,
  Plus,
  GitBranch,
} from "lucide-react";
import { projects } from "@/lib/mock-data";

/**
 * Global ⌘K command palette. Available on every route.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (e.key === "/" && (e.target as HTMLElement)?.tagName === "INPUT") return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, agents, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/")}>
            <Home /> Landing<CommandShortcut>G H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard /> Dashboard<CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/agents")}>
            <Bot /> Multi-Agent Console<CommandShortcut>G A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/activity")}>
            <Activity /> Activity Timeline
          </CommandItem>
          <CommandItem onSelect={() => go("/repository")}>
            <FolderGit2 /> Repository Explorer
          </CommandItem>
          <CommandItem onSelect={() => go("/code")}>
            <FileCode2 /> Code Preview
          </CommandItem>
          <CommandItem onSelect={() => go("/terminal")}>
            <TerminalSquare /> Terminal
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings /> Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projects">
          {projects.slice(0, 5).map((p) => (
            <CommandItem key={p.id} onSelect={() => go(`/projects/${p.slug}`)}>
              <GitBranch /> {p.name}
              <span className="ml-auto text-xs text-muted-foreground">{p.branch}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => setOpen(false)}>
            <Plus /> New project<CommandShortcut>⌘ N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => setOpen(false)}>
            <Bot /> Dispatch new run<CommandShortcut>⌘ R</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
