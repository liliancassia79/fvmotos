import { useEffect, useState, type FormEvent } from "react";
import { loadClientes, saveClientes, type Cliente } from "@/lib/oficina-storage";
import { whatsappLink } from "@/lib/os-storage";
import { Field, Panel, Empty } from "./ui-bits";

const empty = { nome: "", celular: "", email: "", motos: "", observacoes: "" };

export function ClientesTab() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => { setItems(loadClientes()); setHidratado(true); }, []);
  useEffect(() => { if (hidratado) saveClientes(items); }, [items, hidratado]);

  function reset() { setForm(empty); setEditingId(null); }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.celular) return;
    if (editingId) {
      setItems((p) => p.map((c) => c.id === editingId ? { ...c, ...form } : c));
    } else {
      setItems((p) => [{ id: crypto.randomUUID(), ...form, criadoEm: Date.now() }, ...p]);
    }
    reset();
  }

  function editar(c: Cliente) {
    setEditingId(c.id);
    setForm({
      nome: c.nome, celular: c.celular,
      email: c.email ?? "", motos: c.motos ?? "", observacoes: c.observacoes ?? "",
    });
  }

  function remove(id: string) {
    if (!confirm("Remover este cliente?")) return;
    setItems((p) => p.filter((c) => c.id !== id));
    if (editingId === id) reset();
  }

  const filtrados = items.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [c.nome, c.celular, c.email, c.motos].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel
        title={editingId ? "Editar Cliente" : "Novo Cliente"}
        action={editingId ? <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">cancelar</button> : undefined}
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Nome completo" />
          <Field label="Celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(11) 99999-0000" />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="cliente@email.com" />
          <Field label="Motos do cliente" value={form.motos} onChange={(v) => setForm({ ...form, motos: v })} placeholder="Honda CG 160 / ABC1D23" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            {editingId ? "Salvar" : "Cadastrar cliente"}
          </button>
        </form>
      </Panel>

      <div className="space-y-4">
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {filtrados.length === 0 ? (
          <Empty>Nenhum cliente cadastrado</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtrados.map((c) => (
              <article key={c.id} className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-display font-semibold text-sm">{c.nome}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{c.celular}</p>
                {c.motos && <p className="text-xs mt-2">{c.motos}</p>}
                {c.email && <p className="text-xs text-muted-foreground mt-1">{c.email}</p>}
                {c.observacoes && <p className="text-xs text-muted-foreground mt-2 italic">{c.observacoes}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.celular && (
                    <a href={whatsappLink(c.celular, `Olá ${c.nome}, aqui é da FV Motos.`)}
                      target="_blank" rel="noreferrer"
                      className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">WhatsApp</a>
                  )}
                  <button onClick={() => editar(c)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">Editar</button>
                  <button onClick={() => remove(c.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">Remover</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
