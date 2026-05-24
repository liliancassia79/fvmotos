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

  async function reload() { setItems(await clientesDB.list()); }
  useEffect(() => { reload(); }, []);

  function reset() { setForm(empty); setEditingId(null); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.nome) return;
    setBusy(true);
    try {
      if (editingId) await clientesDB.update(editingId, form);
      else await clientesDB.create(form);
      reset(); await reload();
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
    reload();
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
          <div className="grid gap-3 sm:grid-cols-2">
            {filtrados.map((c) => (
              <article key={c.id} className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-display font-semibold text-sm">{c.nome}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{c.celular}</p>
                {c.email && <p className="text-xs text-muted-foreground mt-1">{c.email}</p>}
                {c.observacoes && <p className="text-xs text-muted-foreground mt-2 italic">{c.observacoes}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.celular && (
                    <a href={whatsappLink(c.celular, `Olá ${c.nome}, aqui é da FV Motos.`)}
                      target="_blank" rel="noreferrer"
                      className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">WhatsApp</a>
                  )}
                  <button onClick={() => editar(c)} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">Editar</button>
                  <button onClick={() => remove(c.id)} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">Remover</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
