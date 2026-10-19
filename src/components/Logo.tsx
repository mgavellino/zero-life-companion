import { cn } from "@/lib/utils";

/** The Zero mark: an open ring with a single signal dot — "nothing wasted". */
export function ZeroRing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-8", className)} aria-hidden="true">
      <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="88 200" transform="rotate(-50 24 24)" className="text-foreground" />
      <circle cx="35.5" cy="11.5" r="4.5" className="fill-signal" />
    </svg>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ZeroRing className="size-8" />
      {withText && <span className="font-display text-xl font-semibold lowercase tracking-tight">zero</span>}
    </span>
  );
}
