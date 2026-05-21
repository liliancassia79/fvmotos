import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  loadOrcamentos, saveOrcamentos, orcamentoTotal, orcamentoMensagem,
  orcamentoStatusLabel,
  type Orcamento, type OrcamentoItem, type OrcamentoStatus,
} from "@/lib/oficina-storage";
import { formatBRL, whatsappLink } from "@/lib/os-storage";
import { loadCatalogo, categoriaLabel, type ServicoItem } from "@/lib/catalog";
import { Field, Panel, Empty, Pill } from "./ui-bits";

export function OrcamentosTab() {
  const [items, setItems] = useState<Orcamento[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [catalogo, setCatalogo] = useState<ServicoItem[]>([]);
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");
  const [moto, setMoto] = useState("");
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<OrcamentoItem[]>([]);
  const [novoDesc, setNovoDesc] = useState("");
  const [novoValor, setNovoValor] = useState("");

  useEffect(() => {
    setItems(loadOrcamentos());
    setCatalogo(loadCatalogo());
    setHidratado(true);
  }, []);
  useEffect(() => { if (hidratado) saveOrcamentos(items); }, [items, hidratado]);

  const grupos = useMemo(() => {
    const g: Record<string, ServicoItem[]> = {};
    for (const s of catalogo) (g[s.categoria] ||= []).push(s);
    return g;
  }, [catalogo]);

  function adicionarDoCatalogo(s: ServicoItem) {
    setItens((p) => [...p, { descricao: s.nome, valor: s.preco }]);
  }
  function adicionarManual() {
    if (!novoDesc) return;
    const valor = Number(novoValor.replace(",", ".")) || 0;
    setItens((p) => [...p, { descricao: novoDesc, valor }]);
    setNovoDesc(""); setNovoValor("");
  }
  function removerItem(idx: number) {
    setItens((p) => p.filter((_, i) => i !== idx));
  }
  function reset() {
    setCliente(""); setCelular(""); setMoto(""); setObs(""); setItens([]);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!cliente || !itens.length) return;
    const novo: Orcamento = {
      id: crypto.randomUUID(),
      cliente, celular, moto, observacoes: obs, itens,
      status: "rascunho", criadoEm: Date.now(),
    };
    setItems((p) => [novo, ...p]);
    reset();
  }

  function setStatus(id: string, status: OrcamentoStatus) {
    setItems((p) => p.map((o) => o.id === id ? { ...o, status } : o));
  }

  function remove(id: string) {
    if (!confirm("Remover orçamento?")) return;
    setItems((p) => p.filter((o) => o.id !== id));
  }

  function enviarWhats(o: Orcamento) {
    if (!o.celular) { alert("Cliente sem celular"); return; }
    setStatus(o.id, "enviado");
    window.open(whatsappLink(o.celular, orcamentoMensagem(o)), "_blank");
  }

  const total = itens.reduce((s, i) => s + (i.valor || 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Panel title="Novo Orçamento">
        <form onSubmit={salvar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente" value={cliente} onChange={setCliente} placeholder="Nome" />
            <Field label="Celular" value={celular} onChange={setCelular} placeholder="(11) 99999-0000" />
          </div>
          <Field label="Moto" value={moto} onChange={setMoto} placeholder="Honda CG 160 - ABC1D23" />

          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Adicionar do catálogo</p>
            <div className="max-h-44 overflow-auto space-y-2">
              {Object.entries(grupos).map(([cat, lista]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    {categoriaLabel[cat as keyof typeof categoriaLabel]}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {lista.map((s) => (
                      <button key={s.id} type="button" onClick={() => adicionarDoCatalogo(s)}
                        className="rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted">
                        + {s.nome} <span className="text-muted-foreground">{formatBRL(s.preco)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Item personalizado</p>
            <div className="flex gap-2">
              <input value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)}
                placeholder="Descrição"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <input value={novoValor} onChange={(e) => setNovoValor(e.target.value)}
                placeholder="0,00"
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={adicionarManual}
                className="rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-muted">+</button>
            </div>
          </div>

          {itens.length > 0 && (
            <div className="rounded-md border border-border p-3 space-y-1">
              {itens.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="truncate">{i.descricao}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium tabular-nums">{formatBRL(i.valor)}</span>
                    <button type="button" onClick={() => removerItem(idx)} className="text-muted-foreground hover:text-destructive">×</button>
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-semibold">
                <span>Total</span><span className="tabular-nums">{formatBRL(total)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Salvar Orçamento
          </button>
        </form>
      </Panel>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Orçamentos ({items.length})</h3>
        {items.length === 0 ? (
          <Empty>Nenhum orçamento criado</Empty>
        ) : (
          items.map((o) => {
            const tone: Record<OrcamentoStatus, "muted" | "queue" | "ready" | "destructive"> = {
              rascunho: "muted", enviado: "queue", aprovado: "ready", recusado: "destructive",
            };
            return (
              <article key={o.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display font-semibold text-sm">{o.cliente}</h4>
                    {o.moto && <p className="text-xs text-muted-foreground">{o.moto}</p>}
                  </div>
                  <Pill tone={tone[o.status]}>{orcamentoStatusLabel[o.status]}</Pill>
                </div>
                <ul className="mt-2 text-xs space-y-0.5">
                  {o.itens.map((i, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span className="truncate">• {i.descricao}</span>
                      <span className="tabular-nums text-muted-foreground">{formatBRL(i.valor)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span><span className="tabular-nums">{formatBRL(orcamentoTotal(o))}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => enviarWhats(o)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                    Enviar via WhatsApp
                  </button>
                  {o.status !== "aprovado" && (
                    <button onClick={() => setStatus(o.id, "aprovado")}
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">Aprovar</button>
                  )}
                  {o.status !== "recusado" && (
                    <button onClick={() => setStatus(o.id, "recusado")}
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">Recusar</button>
                  )}
                  <button onClick={() => remove(o.id)}
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
