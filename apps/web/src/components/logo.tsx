import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
        <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="font-semibold tracking-tight text-[15px]">
          Forge<span className="gradient-text">One</span>
        </span>
      )}
    </div>
  );
}
