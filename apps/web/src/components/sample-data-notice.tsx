import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marks a surface whose contents are illustrative rather than measured.
 *
 * ForgeOne's live console, artifact explorer and repository views are driven
 * entirely by real run data. A few workspace screens are static compositions
 * that were never wired to the backend. Showing invented figures next to a
 * genuinely live console makes the real numbers harder to trust, so those
 * screens say plainly what they are instead of implying they are measured.
 */
export function SampleDataNotice({ detail, className }: { detail: string; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2",
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Sample data.</span> {detail}
      </p>
    </div>
  );
}
