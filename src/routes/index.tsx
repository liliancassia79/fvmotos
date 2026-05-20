import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  loadOS,
  saveOS,
  nextStatus,
  statusLabel,
  statusOrder,
  type OrdemServico,
  type OSStatus,
} from "@/lib/os-storage";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Oficina · Ordens de Serviço" },
      { name: "description", content: "Gerencie as O.S. da sua oficina de motos." },
    ],
  }),
});

const empty = { modelo: "", placa: "", cliente: "", celular: "", defeito: "" };

function Dashboard() {
  const [items, setItems] = useState<OrdemServico[]>([]);
  const [form, setForm] = useState(empty);

  useEffect(() => setItems(loadOS()), []);
  useEffect(() => { if (items.length || localStorage.getItem("oficina-os-v1")) saveOS(items); }, [items]);

  const grouped = useMemo(() => {
    const g: Record<OSStatus, OrdemServico[]> = { fila: [], consertando: [], pronta: [] };
    for (const it of items) g[it.status].push(it);
    return g;
  }, [items]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.modelo || !form.placa || !form.cliente) return;
    const novo: OrdemServico = {
      id: crypto.randomUUID(),
      ...form,
      status: "fila",
      criadoEm: Date.now(),
    };
    setItems((p) => [novo, ...p]);
    setForm(empty);
  }

  function advance(id: string) {
    setItems((p) => p.map((it) => (it.id === id ? { ...it, status: nextStatus(it.status) } : it)));
  }

  function remove(id: string) {
    setItems((p) => p.filter((it) => it.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">
              O
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">Oficina</h1>
              <p className="text-xs text-muted-foreground mt-1">Painel de Ordens de Serviço</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground tabular-nums">
            {items.length} O.S. {items.length === 1 ? "ativa" : "ativas"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 grid gap-8 lg:grid-cols-[340px_1fr]">
        <section>
          <div className="sticky top-6 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Nova O.S.</h2>
            <p className="text-xs text-muted-foreground mt-1">Cadastre uma moto rapidamente</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Field label="Modelo" value={form.modelo} onChange={(v) => setForm({ ...form, modelo: v })} placeholder="Honda CG 160" />
              <Field label="Placa" value={form.placa} onChange={(v) => setForm({ ...form, placa: v.toUpperCase() })} placeholder="ABC1D23" />
              <Field label="Cliente" value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} placeholder="Nome completo" />
              <Field label="Celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(11) 99999-0000" />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Defeito</label>
                <textarea
                  value={form.defeito}
                  onChange={(e) => setForm({ ...form, defeito: e.target.value })}
                  placeholder="Descreva o problema"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Cadastrar O.S.
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {statusOrder.map((s) => (
            <Column key={s} status={s} items={grouped[s]} onAdvance={advance} onRemove={remove} />
          ))}
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

const statusStyles: Record<OSStatus, string> = {
  fila: "bg-status-queue text-status-queue-foreground",
  consertando: "bg-status-fixing text-status-fixing-foreground",
  pronta: "bg-status-ready text-status-ready-foreground",
};

function Column({
  status,
  items,
  onAdvance,
  onRemove,
}: {
  status: OSStatus;
  items: OrdemServico[];
  onAdvance: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusStyles[status]}`} />
          <h3 className="text-sm font-semibold">{statusLabel[status]}</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <div className="flex-1 space-y-3 min-h-32">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/70 text-center py-8 border border-dashed border-border rounded-lg">
            Vazio
          </p>
        )}
        {items.map((it) => (
          <article key={it.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-display font-semibold text-sm truncate">{it.modelo}</h4>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">{it.placa}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusStyles[status]}`}>
                {statusLabel[status].split(" ")[0]}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <p><span className="text-muted-foreground">Cliente:</span> {it.cliente}</p>
              {it.celular && <p><span className="text-muted-foreground">Tel:</span> {it.celular}</p>}
            </div>
            {it.defeito && (
              <p className="mt-3 text-xs text-foreground/80 bg-muted rounded-md p-2 leading-relaxed">
                {it.defeito}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onAdvance(it.id)}
                className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {status === "pronta" ? "Reabrir" : "Avançar →"}
              </button>
              <button
                onClick={() => onRemove(it.id)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Remover"
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
