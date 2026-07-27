import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumb({ items }: { items?: { label: string; to?: string }[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts =
    items ??
    pathname
      .split("/")
      .filter(Boolean)
      .map((seg, i, arr) => ({
        label: seg.charAt(0).toUpperCase() + seg.slice(1),
        to: "/" + arr.slice(0, i + 1).join("/"),
      }));

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {parts.map((p, i) => (
        <Fragment key={i}>
          <ChevronRight className="h-3 w-3 opacity-50" />
          {p.to && i < parts.length - 1 ? (
            <Link to={p.to} className="hover:text-foreground transition-colors">
              {p.label}
            </Link>
          ) : (
            <span className="text-foreground">{p.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
