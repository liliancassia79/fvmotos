import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listOS } from "@/lib/airtable.functions";

export const Route = createFileRoute("/os")({
  head: () => ({ meta: [{ title: "Ordens de Serviço · FV Motos" }] }),
  component: OSList,
});

const statusTone: Record<string, string> = {
  Aberta: "bg-blue-100 text-blue-800",
  "Em andamento": "bg-yellow-100 text-yellow-800",
  Finalizada: "bg-green-100 text-green-800",
  Cancelada: "bg-red-100 text-red-800",
};

const fmtBRL = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

function OSList() {
  const navigate = useNavigate();
  const fetchOS = useServerFn(listOS);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["os-list"], queryFn: () => fetchOS() });

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <Link
            to="/nova-os"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + Nova OS
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma OS cadastrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nº OS</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Placa</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Valor Total</th>
                  <th className="px-3 py-2 text-left font-medium">Data Entrada</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate({ to: "/os/$id", params: { id: o.id } })}
                    className="cursor-pointer border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-mono">{o.numero ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[o.status ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                        {o.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{o.placa ?? "—"}</td>
                    <td className="px-3 py-2">{o.clienteNome ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(o.valorTotal)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(o.dataEntrada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
