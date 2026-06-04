import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOS } from "@/lib/airtable.functions";

export const Route = createFileRoute("/os/$id")({
  head: () => ({ meta: [{ title: "Detalhe da OS · FV Motos" }] }),
  component: OSDetail,
});

const fmtBRL = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

function OSDetail() {
  const { id } = Route.useParams();
  const fetchOS = useServerFn(getOS);
  const { data: os, isLoading, error } = useQuery({
    queryKey: ["os", id],
    queryFn: () => fetchOS({ data: { id } }),
  });

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/os" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>
        ) : error ? (
          <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>
        ) : !os ? (
          <p className="mt-6 text-sm text-muted-foreground">OS não encontrada.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-baseline justify-between">
              <h1 className="text-2xl font-bold">OS #{os.numero ?? "—"}</h1>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{os.status ?? "—"}</span>
            </div>

            <div className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
              <Info label="Placa" value={os.placa ?? "—"} />
              <Info label="Cliente" value={os.clienteNome ?? "—"} />
              <Info label="Data de Entrada" value={fmtDate(os.dataEntrada)} />
              <Info label="Valor Mão de Obra" value={fmtBRL(os.valorMaoObra)} />
              <Info label="Valor Total" value={fmtBRL(os.valorTotal)} />
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Defeito Relatado</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{os.defeito ?? "—"}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
