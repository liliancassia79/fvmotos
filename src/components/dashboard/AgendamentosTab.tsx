import { useEffect, useState, type FormEvent } from "react";
import {
  loadAgendamentos, saveAgendamentos, agendamentoStatusLabel,
  agendamentoMensagemConfirmacao, formatDataHora,
  type Agendamento, type AgendamentoStatus,
} from "@/lib/oficina-storage";
import { whatsappLink } from "@/lib/os-storage";
import { loadCatalogo, type ServicoItem } from "@/lib/catalog";
import { Field, Panel, Empty, Pill } from "./ui-bits";

const empty = { cliente: "", celular: "", moto: "", servico: "", data: "", observacoes: "" };

export function AgendamentosTab() {
  const [items, setItems] = useState<Agendamento[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [catalogo, setCatalogo] = useState<ServicoItem[]>([]);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setItems(loadAgendamentos());
    setCatalogo(loadCatalogo());
    setHidratado(true);
  }, []);
  useEffect(() => { if (hidratado) saveAgendamentos(items); }, [items, hidratado]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.cliente || !form.data || !form.servico) return;
    setItems((p) => [{
      id: crypto.randomUUID(),
      ...form,
      status: "pendente" as AgendamentoStatus,
      criadoEm: Date.now(),
    }, ...p]);
    setForm(empty);
  }

  function setStatus(id: string, status: AgendamentoStatus) {
    setItems((p) => p.map((a) => a.id === id ? { ...a, status } : a));
  }

  function remove(id: string) {
    if (!confirm("Remover agendamento?")) return;
    setItems((p) => p.filter((a) => a.id !== id));
  }

  function enviarConfirmacao(a: Agendamento) {
    if (!a.celular) { alert("Cliente sem celular"); return; }
    window.open(whatsappLink(a.celular, agendamentoMensagemConfirmacao(a)), "_blank");
  }

  const ordenado = [...items].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel title="Novo Agendamento">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Cliente" value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} placeholder="Nome" />
          <Field label="Celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(11) 99999-0000" />
          <Field label="Moto" value={form.moto} onChange={(v) => setForm({ ...form, moto: v })} placeholder="Honda CG 160" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Serviço</label>
            <select value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecione...</option>
              {catalogo.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              <option value="Outro">Outro</option>
            </select>
          </div>
          <Field label="Data e hora" type="datetime-local" value={form.data} onChange={(v) => setForm({ ...form, data: v })} />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Agendar
          </button>
        </form>
      </Panel>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Agenda ({items.length})</h3>
        {ordenado.length === 0 ? (
          <Empty>Nenhum agendamento</Empty>
        ) : (
          ordenado.map((a) => {
            const tone: Record<AgendamentoStatus, "muted" | "queue" | "ready" | "destructive"> = {
              pendente: "queue", confirmado: "ready", concluido: "muted", cancelado: "destructive",
            };
            return (
              <article key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-display font-semibold text-sm">{a.cliente}</h4>
                    <p className="text-xs text-muted-foreground">{a.servico}{a.moto ? ` · ${a.moto}` : ""}</p>
                    <p className="text-xs font-medium mt-1">{formatDataHora(a.data)}</p>
                  </div>
                  <Pill tone={tone[a.status]}>{agendamentoStatusLabel[a.status]}</Pill>
                </div>
                {a.observacoes && <p className="text-xs text-muted-foreground mt-2 italic">{a.observacoes}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => enviarConfirmacao(a)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                    Pedir confirmação
                  </button>
                  {a.status !== "confirmado" && (
                    <button onClick={() => setStatus(a.id, "confirmado")}
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">Confirmar</button>
                  )}
                  {a.status !== "concluido" && (
                    <button onClick={() => setStatus(a.id, "concluido")}
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">Concluir</button>
                  )}
                  {a.status !== "cancelado" && (
                    <button onClick={() => setStatus(a.id, "cancelado")}
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">Cancelar</button>
                  )}
                  <button onClick={() => remove(a.id)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted">×</button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
