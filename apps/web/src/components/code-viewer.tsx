import { cn } from "@/lib/utils";
import { Copy, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * CodeViewer — lightweight syntax-highlighted display (Monaco Editor placeholder).
 * Uses very small hand-rolled highlight; good enough for demo previews.
 */
export function CodeViewer({
  code,
  filename,
  language = "ts",
  className,
}: {
  code: string;
  filename?: string;
  language?: string;
  className?: string;
}) {
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className={cn("surface overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-card/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode2 className="h-3.5 w-3.5" />
          <span className="font-mono">{filename ?? "untitled"}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{language}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Copied to clipboard");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="text-[12.5px] leading-6 font-mono">
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-accent/30">
              <span className="inline-block w-10 shrink-0 text-right pr-3 text-muted-foreground/60 select-none">
                {i + 1}
              </span>
              <span className="flex-1 pr-4" dangerouslySetInnerHTML={{ __html: highlight(line) }} />
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

const keywords =
  /\b(import|from|export|const|let|var|function|return|if|else|await|async|new|class|extends|type|interface|enum|as|of|in)\b/g;
const strings = /(['"`])((?:\\.|(?!\1).)*)\1/g;
const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;
const numbers = /\b(\d+)\b/g;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(line: string) {
  let s = esc(line);
  s = s.replace(comments, '<span style="color:oklch(0.55 0.02 258)">$1</span>');
  s = s.replace(strings, '<span style="color:oklch(0.72 0.17 155)">$1$2$1</span>');
  s = s.replace(keywords, '<span style="color:oklch(0.72 0.19 258)">$1</span>');
  s = s.replace(numbers, '<span style="color:oklch(0.78 0.17 75)">$1</span>');
  return s;
}
