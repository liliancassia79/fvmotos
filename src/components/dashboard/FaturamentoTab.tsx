import { useEffect, useMemo, useState } from "react";
import { loadOS, formatBRL, statusLabel, type OrdemServico } from "@/lib/os-storage";
import { loadOrcamentos, orcamentoTotal, type Orcamento } from "@/lib/oficina-storage";
import { Empty } from "./ui-bits";

export function FaturamentoTab() {
  const [os, setOS] = useState<OrdemServico[]>([]);
  const [orcs, setOrcs] = useState<Orcamento[]>([]);

  useEffect(() => {
    setOS(loadOS());
    setOrcs(loadOrcamentos());
  }, []);

  const stats = useMemo(() => {
    const prontas = os.filter((o) => o.status === "pronta");
    const faturado = prontas.reduce((s, o) => s + (o.valor ?? 0), 0);
    const aberto = os.filter((o) => o.status !== "pronta").reduce((s, o) => s + (o.valor ?? 0), 0);
    const aprovados = orcs.filter((o) => o.status === "aprovado");
    const previsto = aprovados.reduce((s, o) => s + orcamentoTotal(o), 0);

    const agora = new Date();
    const mes = agora.getMonth(), ano = agora.getFullYear();
    const mesAtual = prontas.filter((o) => {
      const d = new Date(o.finalizadoEm ?? o.criadoEm);
      return d.getMonth() === mes && d.getFullYear() === ano;
    }).reduce((s, o) => s + (o.valor ?? 0), 0);

    const ticketMedio = prontas.length ? faturado / prontas.length : 0;

    return { faturado, aberto, previsto, mesAtual, ticketMedio, prontas };
  }, [os, orcs]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Card label="Faturado total" value={formatBRL(stats.faturado)} />
        <Card label="Faturado no mês" value={formatBRL(stats.mesAtual)} highlight />
        <Card label="Em aberto" value={formatBRL(stats.aberto)} />
        <Card label="Previsto (orçamentos aprovados)" value={formatBRL(stats.previsto)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Ticket médio: <span className="tabular-nums">{formatBRL(stats.ticketMedio)}</span></h3>
        {stats.prontas.length === 0 ? (
          <Empty>Nenhuma O.S. finalizada ainda</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Cliente</th>
                <th className="py-2 font-medium">Moto</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {stats.prontas.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2">{o.cliente}</td>
                  <td className="py-2 text-muted-foreground">{o.modelo} · {o.placa}</td>
                  <td className="py-2 text-xs">{statusLabel[o.status]}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{formatBRL(o.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${highlight ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
