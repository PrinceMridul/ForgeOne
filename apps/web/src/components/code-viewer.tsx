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

const COLOR = {
  comment: "oklch(0.55 0.02 258)",
  string: "oklch(0.72 0.17 155)",
  keyword: "oklch(0.72 0.19 258)",
  number: "oklch(0.78 0.17 75)",
} as const;

/**
 * One alternation covering every token kind, matched in a single pass.
 *
 * Group 1 comment · 2 string · 3 its quote char · 4 number · 5 keyword.
 */
const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|((['"`])(?:\\.|(?!\3)[^\\])*\3)|(\b\d+(?:\.\d+)?\b)|\b(import|from|export|const|let|var|function|return|if|else|await|async|new|class|extends|type|interface|enum|as|of|in)\b/g;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Highlight a line in a single pass over the original text.
 *
 * This used to run four sequential `.replace()` calls. Each pass re-scanned
 * the markup the previous ones had injected, so the quotes and digits inside
 * `style="color:oklch(0.72 0.19 258)"` were themselves matched and wrapped —
 * leaking colour values into the rendered source. Matching once against the
 * untouched line and escaping each token as it is emitted makes that
 * impossible.
 */
function highlight(line: string): string {
  let out = "";
  let last = 0;

  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(line)) !== null) {
    const [full, comment, str, , num, keyword] = match;

    // Zero-length matches would spin forever.
    if (full.length === 0) {
      TOKEN.lastIndex++;
      continue;
    }

    out += esc(line.slice(last, match.index));

    const color = comment
      ? COLOR.comment
      : str
        ? COLOR.string
        : num
          ? COLOR.number
          : keyword
            ? COLOR.keyword
            : null;

    out += color ? `<span style="color:${color}">${esc(full)}</span>` : esc(full);
    last = match.index + full.length;
  }

  return out + esc(line.slice(last));
}
