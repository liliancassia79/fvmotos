import { useEffect, useMemo, useState } from "react";
import { osDB } from "@/lib/db";
import { orcDB, type OrcamentoDB } from "@/lib/db";
import { formatBRL, statusLabel, type OrdemServico } from "@/lib/os-storage";
import { Empty } from "./ui-bits";

export function FaturamentoTab() {
  const [os, setOS] = useState<OrdemServico[]>([]);
  const [orcs, setOrcs] = useState<OrcamentoDB[]>([]);

  useEffect(() => {
    osDB.list().then(setOS);
    orcDB.list().then(setOrcs);
  }, []);

  const stats = useMemo(() => {
    const pagasOS = os.filter((o) => o.pago);
    const pagosOrc = orcs.filter((o) => o.pago);
    const faturadoOS = pagasOS.reduce((s, o) => s + (o.valor ?? 0), 0);
    const faturadoOrc = pagosOrc.reduce((s, o) => s + o.total, 0);
    const faturado = faturadoOS + faturadoOrc;
    const aberto =
      os.filter((o) => !o.pago).reduce((s, o) => s + (o.valor ?? 0), 0) +
      orcs.filter((o) => !o.pago && o.status !== "recusado").reduce((s, o) => s + o.total, 0);
    const aprovados = orcs.filter((o) => o.status === "aprovado" && !o.pago);
    const previsto = aprovados.reduce((s, o) => s + o.total, 0);
    const agora = new Date();
    const mes = agora.getMonth(), ano = agora.getFullYear();
    const noMes = (ts: number) => {
      const d = new Date(ts);
      return d.getMonth() === mes && d.getFullYear() === ano;
    };
    const mesAtual =
      pagasOS.filter((o) => noMes(o.finalizadoEm ?? o.atualizadoEm ?? o.criadoEm))
        .reduce((s, o) => s + (o.valor ?? 0), 0) +
      pagosOrc.filter((o) => noMes(o.criadoEm)).reduce((s, o) => s + o.total, 0);
    const totalPagos = pagasOS.length + pagosOrc.length;
    const ticketMedio = totalPagos ? faturado / totalPagos : 0;
    return { faturado, aberto, previsto, mesAtual, ticketMedio, prontas: pagasOS };
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
