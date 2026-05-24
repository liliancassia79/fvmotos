import { useEffect, useState } from "react";
import { loadOS, formatBRL, statusLabel, type OrdemServico } from "@/lib/os-storage";

export function DashboardTab() {
  const [items, setItems] = useState<OrdemServico[]>([]);
  useEffect(() => { setItems(loadOS()); }, []);

  const fila = items.filter((i) => i.status === "fila");
  const consertando = items.filter((i) => i.status === "consertando");
  const pronta = items.filter((i) => i.status === "pronta");
  const faturamentoTotal = items.filter((i) => i.status === "pronta").reduce((s, i) => s + (i.valor ?? 0), 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const novasHoje = items.filter((i) => i.criadoEm >= hoje.getTime()).length;
  const ticketMedio = pronta.length ? faturamentoTotal / pronta.length : 0;

  const recentes = [...items].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold">Visão geral</h2>
        <p className="text-sm text-muted-foreground">Resumo da oficina em tempo real</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Big label="Na Fila" value={fila.length} hint="aguardando" />
        <Big label="Consertando" value={consertando.length} hint="em execução" />
        <Big label="Prontas" value={pronta.length} hint="para entrega" />
        <Big label="Novas hoje" value={novasHoje} hint="entradas" />
        <Big label="Faturamento" value={formatBRL(faturamentoTotal)} hint="ordens prontas" wide />
        <Big label="Ticket médio" value={formatBRL(ticketMedio)} hint="por O.S. pronta" wide />
        <Big label="Total O.S." value={items.length} hint="cadastradas" wide />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Últimas O.S.</h3>
        {recentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma O.S. ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentes.map((it) => (
              <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.modelo} · <span className="font-mono text-xs text-muted-foreground">{it.placa}</span></p>
                  <p className="text-xs text-muted-foreground truncate">{it.cliente}</p>
                </div>
                <span className="text-xs rounded-full px-2 py-1 bg-muted">{statusLabel[it.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Big({ label, value, hint, wide }: { label: string; value: number | string; hint?: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${wide ? "" : ""}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-primary">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
