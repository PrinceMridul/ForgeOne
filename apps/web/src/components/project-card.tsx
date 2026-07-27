import { Link } from "@tanstack/react-router";
import { GitBranch, Bot, Circle, Star, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/mock-data";

const langColor: Record<string, string> = {
  TypeScript: "text-info",
  Rust: "text-warning",
  Go: "text-primary",
  Python: "text-chart-2",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/projects/$slug"
      params={{ slug: project.slug }}
      className="group surface block p-5 shadow-card transition-all hover:border-primary/40 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            {project.name[0]}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{project.name}</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <GitBranch className="h-2.5 w-2.5" /> {project.branch}
            </p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
      </div>

      <p className="mt-3 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
        {project.description}
      </p>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Delivery</span>
          <span className="tabular-nums">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-1" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span
            className={`flex items-center gap-1 ${langColor[project.language] ?? "text-foreground"}`}
          >
            <Circle className="h-2 w-2 fill-current" /> {project.language}
          </span>
          <span className="flex items-center gap-1">
            <Bot className="h-3 w-3" /> {project.agents}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" /> {project.stars}
          </span>
        </div>
        <StatusBadge status={project.status} />
      </div>
    </Link>
  );
}
