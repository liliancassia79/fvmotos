import { useEffect, useMemo, useState } from "react";
import { osDB, orcDB } from "@/lib/db";
import { formatBRL } from "@/lib/os-storage";
import { formaPagamentoLabel } from "@/lib/pagamento";
import { Empty } from "./ui-bits";

type Pagamento = {
  id: string;
  origem: "os" | "orcamento";
  cliente: string;
  descricao: string;
  valor: number;
  formaPagamento?: string;
  pagoEm: number;
};

export function FaturamentoTab() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [ordens, orcs] = await Promise.all([osDB.list(), orcDB.list()]);
        const lista: Pagamento[] = [];
        for (const o of ordens) {
          if (o.pago && (o.valor ?? 0) > 0) {
            lista.push({
              id: `os-${o.id}`,
              origem: "os",
              cliente: o.cliente,
              descricao: `O.S. ${o.modelo} · ${o.placa}`,
              valor: o.valor ?? 0,
              formaPagamento: o.formaPagamento,
              pagoEm: o.finalizadoEm ?? o.atualizadoEm ?? o.criadoEm,
            });
          }
        }
        for (const o of orcs) {
          if (o.pago && (o.total ?? 0) > 0) {
            lista.push({
              id: `orc-${o.id}`,
              origem: "orcamento",
              cliente: o.cliente,
              descricao: "Orçamento aprovado",
              valor: o.total ?? 0,
              formaPagamento: o.formaPagamento,
              pagoEm: o.criadoEm,
            });
          }
        }
        lista.sort((a, b) => b.pagoEm - a.pagoEm);
        if (alive) setPagamentos(lista);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const stats = useMemo(() => {
    const faturado = pagamentos.reduce((s, p) => s + p.valor, 0);
    const agora = new Date();
    const noMes = pagamentos.filter((p) => {
      const d = new Date(p.pagoEm);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    });
    const mesAtual = noMes.reduce((s, p) => s + p.valor, 0);
    const ticketMedio = pagamentos.length ? faturado / pagamentos.length : 0;
    return { faturado, mesAtual, ticketMedio };
  }, [pagamentos]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card label="Faturado total" value={formatBRL(stats.faturado)} />
        <Card label="Faturado no mês" value={formatBRL(stats.mesAtual)} highlight />
        <Card label="Ticket médio" value={formatBRL(stats.ticketMedio)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">
          Histórico de pagamentos{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({pagamentos.length} transaç{pagamentos.length === 1 ? "ão" : "ões"})
          </span>
        </h3>
        {loading ? (
          <Empty>Carregando…</Empty>
        ) : pagamentos.length === 0 ? (
          <Empty>Nenhum pagamento registrado ainda</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Cliente</th>
                  <th className="py-2 font-medium">Descrição</th>
                  <th className="py-2 font-medium">Origem</th>
                  <th className="py-2 font-medium">Pagamento</th>
                  <th className="py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 text-xs tabular-nums">
                      {new Date(p.pagoEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2">{p.cliente}</td>
                    <td className="py-2 text-muted-foreground">{p.descricao}</td>
                    <td className="py-2 text-xs">
                      <span className="rounded bg-muted px-2 py-0.5">
                        {p.origem === "os" ? "O.S." : "Orçamento"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {p.formaPagamento ? formaPagamentoLabel[p.formaPagamento as keyof typeof formaPagamentoLabel] ?? p.formaPagamento : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatBRL(p.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
