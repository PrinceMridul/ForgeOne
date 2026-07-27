import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, File as FileIcon } from "lucide-react";
import type { FileNode } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const langColor: Record<string, string> = {
  ts: "text-info",
  sql: "text-warning",
  json: "text-chart-2",
  md: "text-muted-foreground",
  toml: "text-chart-4",
};

export function RepositoryTree({
  node,
  depth = 0,
  onSelect,
  selected,
}: {
  node: FileNode;
  depth?: number;
  onSelect?: (path: string) => void;
  selected?: string;
}) {
  return (
    <TreeNode node={node} depth={depth} path={node.name} onSelect={onSelect} selected={selected} />
  );
}

function TreeNode({
  node,
  depth,
  path,
  onSelect,
  selected,
}: {
  node: FileNode;
  depth: number;
  path: string;
  onSelect?: (p: string) => void;
  selected?: string;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";
  const isActive = selected === path;

  return (
    <div>
      <button
        onClick={() => (isFolder ? setOpen((o) => !o) : onSelect?.(path))}
        className={cn(
          "w-full flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-accent/60 transition-colors",
          isActive && "bg-accent text-accent-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {isFolder ? (
          <>
            <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
            {open ? (
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-primary" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileIcon className={cn("h-3.5 w-3.5", node.language && langColor[node.language])} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && node.children && (
        <div>
          {node.children.map((c) => (
            <TreeNode
              key={c.name}
              node={c}
              depth={depth + 1}
              path={`${path}/${c.name}`}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
