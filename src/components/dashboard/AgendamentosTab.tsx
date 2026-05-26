import { useEffect, useState, type FormEvent } from "react";
import { agDB, catDB, type AgendamentoDB, type ServicoDB } from "@/lib/db";
import { agendamentoMensagemConfirmacao, formatDataHora } from "@/lib/oficina-storage";
import { whatsappLink } from "@/lib/os-storage";
import { Field, Panel, Empty, Pill } from "./ui-bits";

const empty = { cliente: "", celular: "", servico: "", servicoOutro: "", data: "", observacoes: "" };

const servicosComuns = [
  "Troca de óleo",
  "Revisão geral",
  "Troca de pastilha de freio",
  "Troca de pneu",
  "Regulagem de freio",
  "Lavagem completa",
  "Troca de corrente e coroa",
  "Diagnóstico elétrico",
  "Injeção eletrônica",
];

export function AgendamentosTab() {
  const [items, setItems] = useState<AgendamentoDB[]>([]);
  const [catalogo, setCatalogo] = useState<ServicoDB[]>([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub1 = agDB.subscribe(setItems);
    const unsub2 = catDB.subscribe(setCatalogo);
    return () => { unsub1(); unsub2(); };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const servicoFinal = form.servico === "Outro" ? form.servicoOutro.trim() : form.servico;
    if (!form.cliente || !form.data || !servicoFinal) return;
    setBusy(true);
    try {
      await agDB.create({
        cliente: form.cliente, celular: form.celular,
        dataHora: new Date(form.data).toISOString(),
        servico: servicoFinal, observacoes: form.observacoes || undefined,
        confirmado: false,
      });
      setForm(empty); await reload();
    } catch (err) { alert((err as Error).message); }
    finally { setBusy(false); }
  }

  async function toggleConfirm(a: AgendamentoDB) { await agDB.setConfirmado(a.id, !a.confirmado); reload(); }
  async function remove(id: string) {
    if (!confirm("Remover agendamento?")) return;
    await agDB.remove(id); reload();
  }
  function enviarConfirmacao(a: AgendamentoDB) {
    if (!a.celular) { alert("Cliente sem celular"); return; }
    window.open(whatsappLink(a.celular, agendamentoMensagemConfirmacao(a)), "_blank");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel title="Novo Agendamento">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Cliente" value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} placeholder="Nome" />
          <Field label="Celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(11) 99999-0000" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Serviço</label>
            <select value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecione...</option>
              {catalogo.length > 0 && (
                <optgroup label="Do catálogo">
                  {catalogo.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </optgroup>
              )}
              <optgroup label="Serviços comuns">
                {servicosComuns.map((s) => <option key={s} value={s}>{s}</option>)}
              </optgroup>
              <option value="Outro">Outro (descrever)</option>
            </select>
            {form.servico === "Outro" && (
              <input value={form.servicoOutro}
                onChange={(e) => setForm({ ...form, servicoOutro: e.target.value })}
                placeholder="Descreva o serviço"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            )}
          </div>
          <Field label="Data e hora" type="datetime-local" value={form.data} onChange={(v) => setForm({ ...form, data: v })} />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "..." : "Agendar"}
          </button>
        </form>
      </Panel>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Agenda ({items.length})</h3>
        {items.length === 0 ? (
          <Empty>Nenhum agendamento</Empty>
        ) : (
          items.map((a) => (
            <article key={a.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-display font-semibold text-sm">{a.cliente}</h4>
                  <p className="text-xs text-muted-foreground">{a.servico}</p>
                  <p className="text-xs font-medium mt-1">{formatDataHora(a.dataHora)}</p>
                </div>
                <Pill tone={a.confirmado ? "ready" : "queue"}>{a.confirmado ? "Confirmado" : "Pendente"}</Pill>
              </div>
              {a.observacoes && <p className="text-xs text-muted-foreground mt-2 italic">{a.observacoes}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => enviarConfirmacao(a)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                  Pedir confirmação
                </button>
                <button onClick={() => toggleConfirm(a)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                  {a.confirmado ? "Marcar pendente" : "Confirmar"}
                </button>
                <button onClick={() => remove(a.id)} className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted">×</button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
