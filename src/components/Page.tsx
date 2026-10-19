import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Page({ title, kicker, children, actions }: { title: string; kicker?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {kicker && <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">{kicker}</p>}
          <h1 className="text-4xl font-bold">{title}</h1>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-5", className)}>{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-bold", tone)}>{value}</p>
    </Card>
  );
}
