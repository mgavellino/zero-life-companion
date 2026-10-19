import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Page({ title, kicker, children, actions }: { title: string; kicker?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">{kicker}</p>}
          <h1 className="break-words text-2xl font-bold sm:text-3xl lg:text-4xl">{title}</h1>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-w-0 rounded-lg border bg-card p-4 sm:p-5", className)}>{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 break-words font-display text-xl font-bold lg:text-3xl", tone)}>{value}</p>
    </Card>
  );
}
