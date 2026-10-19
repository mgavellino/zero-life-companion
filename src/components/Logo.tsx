import mark from "@/assets/zero-mark.png";
import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary">
        <img src={mark} alt="Zero" width={816} height={816} className="size-7" />
      </span>
      {withText && <span className="font-display text-xl font-bold tracking-tight">zero</span>}
    </span>
  );
}
