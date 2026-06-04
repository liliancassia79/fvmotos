import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { listMotos, createOS } from "@/lib/airtable.functions";

export const Route = createFileRoute("/nova-os")({
  head: () => ({ meta: [{ title: "Nova OS · FV Motos" }] }),
  component: NovaOS,
});

function NovaOS() {
  const navigate = useNavigate();
  const fetchMotos = useServerFn(listMotos);
  const submitOS = useServerFn(createOS);

  const { data: motos = [], isLoading } = useQuery({ queryKey: ["motos"], queryFn: () => fetchMotos() });

  const [motoId, setMotoId] = useState("");
  const [defeito, setDefeito] = useState("");
  const [km, setKm] = useState<string>("");
  const [valor, setValor] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!motoId) return;
    const m = motos.find((x) => x.id === motoId);
    if (m && m.kmAtual != null) setKm(String(m.kmAtual));
  }, [motoId, motos]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!motoId || !defeito.trim()) {
      toast.error("Selecione a moto e descreva o defeito");
      return;
    }
    setBusy(true);
    try {
      await submitOS({
        data: {
          motoId,
          defeito: defeito.trim(),
          kmAtual: Number(km) || 0,
          valorMaoObra: Number(String(valor).replace(",", ".")) || 0,
        },
      });
      toast.success("OS criada com sucesso");
      navigate({ to: "/os" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
          <Link to="/os" className="text-sm text-muted-foreground hover:text-foreground">Ver OS →</Link>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Moto</label>
            <select
              value={motoId}
              onChange={(e) => setMotoId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{isLoading ? "Carregando..." : "Selecione a moto"}</option>
              {motos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.placa || "Sem placa"} - {m.modelo || "Sem modelo"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Defeito Relatado *</label>
            <textarea
              value={defeito}
              onChange={(e) => setDefeito(e.target.value)}
              required
              rows={3}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Descreva o defeito relatado pelo cliente"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">KM Atual</label>
            <input
              type="number"
              min={0}
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Valor Mão de Obra (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="0,00"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Criando..." : "Criar OS"}
          </button>
        </form>
      </div>
    </main>
  );
}
