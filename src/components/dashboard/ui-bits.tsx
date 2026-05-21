import type { ReactNode } from "react";

export function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground/70 text-center py-8 border border-dashed border-border rounded-lg">
      {children}
    </p>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "queue" | "fixing" | "ready" | "destructive" }) {
  const styles: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    queue: "bg-status-queue text-status-queue-foreground",
    fixing: "bg-status-fixing text-status-fixing-foreground",
    ready: "bg-status-ready text-status-ready-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[tone]}`}>{children}</span>;
}
