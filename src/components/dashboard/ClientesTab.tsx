import { useEffect, useState, type FormEvent } from "react";
import { clientesDB, type ClienteDB } from "@/lib/db";
import { whatsappLink } from "@/lib/os-storage";
import { Field, Panel, Empty } from "./ui-bits";

const empty = { nome: "", celular: "", email: "", observacoes: "" };

export function ClientesTab() {
  const [items, setItems] = useState<ClienteDB[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = clientesDB.subscribe(setItems);
    return () => unsub();
  }, []);

  function reset() { setForm(empty); setEditingId(null); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.nome) return;
    setBusy(true);
    try {
      if (editingId) await clientesDB.update(editingId, form);
      else await clientesDB.create(form);
      reset();
    } catch (err) { alert((err as Error).message); }
    finally { setBusy(false); }
  }

  function editar(c: ClienteDB) {
    setEditingId(c.id);
    setForm({ nome: c.nome, celular: c.celular, email: c.email ?? "", observacoes: c.observacoes ?? "" });
  }

  async function remove(id: string) {
    if (!confirm("Remover este cliente?")) return;
    await clientesDB.remove(id);
    if (editingId === id) reset();
  }

  const filtrados = items.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [c.nome, c.celular, c.email].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel title={editingId ? "Editar Cliente" : "Novo Cliente"}
        action={editingId ? <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">cancelar</button> : undefined}>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Nome completo" />
          <Field label="Celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(11) 99999-0000" />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="cliente@email.com" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "..." : (editingId ? "Salvar" : "Cadastrar cliente")}
          </button>
        </form>
      </Panel>

      <div className="space-y-4">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {filtrados.length === 0 ? (
          <Empty>Nenhum cliente cadastrado</Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nome</th>
                  <th className="px-3 py-2 text-left font-medium">Celular</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{c.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.celular || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.email || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        {c.celular && (
                          <a
                            href={whatsappLink(c.celular, `Olá ${c.nome}, aqui é da FV Motos.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
                          >
                            WhatsApp
                          </a>
                        )}
                        <button
                          onClick={() => editar(c)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Excluir
                        </button>
                      </div>
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
