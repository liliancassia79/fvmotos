import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  loadOS, saveOS, nextStatus, statusLabel, statusOrder,
  formatBRL, relativeTime, whatsappLink, exportarCSV,
  type OrdemServico, type OSStatus,
} from "@/lib/os-storage";
import { abrirPDFOrdemServico, osMensagemWhatsapp } from "@/lib/os-pdf";
import { loadCatalogo, type ServicoItem } from "@/lib/catalog";
import { formasPagamento, type FormaPagamento } from "@/lib/pagamento";
import { useInstallPrompt } from "@/lib/install-pwa";
import { notificarMudancaStatus } from "@/lib/notificacoes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientesTab } from "@/components/dashboard/ClientesTab";
import { OrcamentosTab } from "@/components/dashboard/OrcamentosTab";
import { AgendamentosTab } from "@/components/dashboard/AgendamentosTab";
import { FaturamentoTab } from "@/components/dashboard/FaturamentoTab";
import { CatalogoTab } from "@/components/dashboard/CatalogoTab";
import { FotosTab } from "@/components/dashboard/FotosTab";
import { NotificacoesTab } from "@/components/dashboard/NotificacoesTab";
import { HistoricoTab } from "@/components/dashboard/HistoricoTab";
import logo from "@/assets/fv-motos-logo.png";


export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "FV Motos · Ordens de Serviço" },
      { name: "description", content: "Gerencie as O.S. da FV Motos Oficina Mecânica." },
    ],
  }),
});

const empty = { modelo: "", placa: "", cliente: "", celular: "", defeito: "", valor: "", observacoes: "", formaPagamento: "" as "" | FormaPagamento };

function Dashboard() {
  const [items, setItems] = useState<OrdemServico[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<OSStatus | "todos">("todos");
  const [hidratado, setHidratado] = useState(false);
  const [catalogo, setCatalogo] = useState<ServicoItem[]>([]);
  const { install, installed, canInstall } = useInstallPrompt();


  useEffect(() => { setItems(loadOS()); setCatalogo(loadCatalogo()); setHidratado(true); }, []);
  useEffect(() => { if (hidratado) saveOS(items); }, [items, hidratado]);

  function aplicarServico(id: string) {
    const s = catalogo.find((x) => x.id === id);
    if (!s) return;
    setForm((f) => ({
      ...f,
      defeito: f.defeito ? `${f.defeito}\n${s.nome}` : s.nome,
      valor: ((Number(f.valor.replace(",", ".")) || 0) + s.preco).toFixed(2).replace(".", ","),
    }));
  }

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((i) => {
      if (filtroStatus !== "todos" && i.status !== filtroStatus) return false;
      if (!q) return true;
      return [i.modelo, i.placa, i.cliente, i.celular, i.defeito]
        .some((c) => c.toLowerCase().includes(q));
    });
  }, [items, busca, filtroStatus]);

  const grouped = useMemo(() => {
    const g: Record<OSStatus, OrdemServico[]> = { fila: [], consertando: [], pronta: [] };
    for (const it of filtered) g[it.status].push(it);
    return g;
  }, [filtered]);

  const stats = useMemo(() => ({
    fila: items.filter((i) => i.status === "fila").length,
    consertando: items.filter((i) => i.status === "consertando").length,
    pronta: items.filter((i) => i.status === "pronta").length,
    faturamento: items.filter((i) => i.status === "pronta").reduce((s, i) => s + (i.valor ?? 0), 0),
  }), [items]);

  function resetForm() { setForm(empty); setEditingId(null); }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.modelo || !form.placa || !form.cliente) return;
    const valor = form.valor ? Number(form.valor.replace(",", ".")) : undefined;
    const formaPagamento = form.formaPagamento || undefined;
    const { formaPagamento: _fp, ...rest } = form;

    if (editingId) {
      setItems((p) => p.map((it) => it.id === editingId
        ? { ...it, ...rest, valor, formaPagamento, atualizadoEm: Date.now() }
        : it));
    } else {
      setItems((p) => [{
        id: crypto.randomUUID(),
        ...rest, valor, formaPagamento,
        status: "fila",
        criadoEm: Date.now(),
      }, ...p]);
    }
    resetForm();
  }


  function editar(it: OrdemServico) {
    setEditingId(it.id);
    setForm({
      modelo: it.modelo, placa: it.placa, cliente: it.cliente,
      celular: it.celular, defeito: it.defeito,
      valor: it.valor != null ? it.valor.toFixed(2).replace(".", ",") : "",
      observacoes: it.observacoes ?? "",
      formaPagamento: it.formaPagamento ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  function advance(id: string) {
    setItems((p) => p.map((it) => {
      if (it.id !== id) return it;
      const novo = nextStatus(it.status);
      const atualizado = { ...it, status: novo, atualizadoEm: Date.now(), finalizadoEm: novo === "pronta" ? Date.now() : it.finalizadoEm };
      notificarMudancaStatus(atualizado);
      return atualizado;
    }));
  }

  function voltar(id: string) {
    setItems((p) => p.map((it) => {
      if (it.id !== id) return it;
      const i = statusOrder.indexOf(it.status);
      const novo = statusOrder[Math.max(0, i - 1)];
      const atualizado = { ...it, status: novo, atualizadoEm: Date.now() };
      notificarMudancaStatus(atualizado);
      return atualizado;
    }));
  }

  function remove(id: string) {
    if (!confirm("Remover esta O.S.?")) return;
    setItems((p) => p.filter((it) => it.id !== id));
    if (editingId === id) resetForm();
  }

  function limparEntregues() {
    const n = stats.pronta;
    if (!n) return;
    if (!confirm(`Arquivar ${n} O.S. entregue${n > 1 ? "s" : ""}?`)) return;
    setItems((p) => p.filter((i) => i.status !== "pronta"));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-primary bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={logo} alt="FV Motos" className="h-12 w-12 object-contain" />
            <div>
              <h1 className="text-lg font-display font-bold leading-none tracking-tight text-primary">FV MOTOS</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">Oficina Mecânica</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!installed && (
              <button onClick={install}
                className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:opacity-90"
                title={canInstall ? "Instalar como aplicativo" : "Como instalar"}>
                ↓ Instalar App
              </button>
            )}
            <button onClick={() => exportarCSV(items)} disabled={!items.length}
              className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-40">
              Exportar CSV
            </button>
            <button onClick={() => window.print()} disabled={!items.length}
              className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-40">
              Imprimir
            </button>
          </div>
        </div>
      </header>

      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Na Fila" value={stats.fila} accent="bg-status-queue" />
          <Stat label="Consertando" value={stats.consertando} accent="bg-status-fixing" />
          <Stat label="Prontas" value={stats.pronta} accent="bg-status-ready" />
          <Stat label="Faturamento (prontas)" value={formatBRL(stats.faturamento)} />
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <Tabs defaultValue="os" orientation="vertical" className="flex flex-col lg:flex-row gap-6">
          <TabsList className="lg:sticky lg:top-4 self-start flex lg:flex-col h-auto w-full lg:w-56 shrink-0 bg-card border border-border p-2 gap-1 overflow-x-auto lg:overflow-visible">
            <SideTab value="os">📋 Ordens de Serviço</SideTab>
            <SideTab value="fotos">📷 Fotos</SideTab>
            <SideTab value="notificacoes">🔔 Notificações</SideTab>
            <SideTab value="historico">🛵 Histórico</SideTab>
            <SideTab value="clientes">👤 Clientes</SideTab>
            <SideTab value="orcamentos">💬 Orçamentos</SideTab>
            <SideTab value="agenda">📅 Agenda</SideTab>
            <SideTab value="faturamento">💰 Faturamento</SideTab>
            <SideTab value="catalogo">🛠 Catálogo</SideTab>
          </TabsList>

          <div className="flex-1 min-w-0">
          <TabsContent value="os" className="grid gap-8 lg:grid-cols-[340px_1fr] mt-0">
            <section>
              <div className="lg:sticky lg:top-6 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{editingId ? "Editar O.S." : "Nova O.S."}</h2>
                  {editingId && (
                    <button onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">cancelar</button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingId ? "Atualize os dados da moto" : "Cadastre uma moto rapidamente"}
                </p>
                <form onSubmit={submit} className="mt-5 space-y-3">
                  <Field label="Modelo" value={form.modelo} onChange={(v) => setForm({ ...form, modelo: v })} placeholder="Honda CG 160" />
                  <Field label="Placa" value={form.placa} onChange={(v) => setForm({ ...form, placa: v.toUpperCase() })} placeholder="ABC1D23" />
                  <Field label="Cliente" value={form.cliente} onChange={(v) => setForm({ ...form, cliente: v })} placeholder="Nome completo" />
                  <Field label="Celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(11) 99999-0000" />
                  <Field label="Valor (R$)" value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} placeholder="350,00" />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
                    <select value={form.formaPagamento}
                      onChange={(e) => setForm({ ...form, formaPagamento: e.target.value as FormaPagamento | "" })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Selecione…</option>
                      {formasPagamento.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Serviço do catálogo</label>
                    <select onChange={(e) => { aplicarServico(e.target.value); e.target.value = ""; }}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <option value="">+ adicionar serviço…</option>
                      {catalogo.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome} — {formatBRL(s.preco)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Defeito / Serviços</label>
                    <textarea value={form.defeito} onChange={(e) => setForm({ ...form, defeito: e.target.value })}
                      placeholder="Descreva o problema" rows={3}
                      className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Observações internas</label>
                    <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                      placeholder="Peças usadas, notas..." rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <button type="submit" className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                    {editingId ? "Salvar alterações" : "Cadastrar O.S."}
                  </button>
                </form>
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por placa, cliente, modelo..."
                  className="flex-1 min-w-[200px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-1 rounded-md border border-border bg-card p-1">
                  {(["todos", ...statusOrder] as const).map((s) => (
                    <button key={s} onClick={() => setFiltroStatus(s)}
                      className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${filtroStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {s === "todos" ? "Todos" : statusLabel[s]}
                    </button>
                  ))}
                </div>
                {stats.pronta > 0 && (
                  <button onClick={limparEntregues}
                    className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
                    Arquivar entregues
                  </button>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {statusOrder.map((s) => (
                  <Column key={s} status={s} items={grouped[s]}
                    onAdvance={advance} onBack={voltar} onRemove={remove} onEdit={editar} />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="fotos" className="mt-0"><FotosTab /></TabsContent>
          <TabsContent value="notificacoes" className="mt-0"><NotificacoesTab /></TabsContent>
          <TabsContent value="historico" className="mt-0"><HistoricoTab /></TabsContent>
          <TabsContent value="clientes" className="mt-0"><ClientesTab /></TabsContent>
          <TabsContent value="orcamentos" className="mt-0"><OrcamentosTab /></TabsContent>
          <TabsContent value="agenda" className="mt-0"><AgendamentosTab /></TabsContent>
          <TabsContent value="faturamento" className="mt-0"><FaturamentoTab /></TabsContent>
          <TabsContent value="catalogo" className="mt-0"><CatalogoTab /></TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

function SideTab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="w-full justify-start lg:px-3 lg:py-2 text-xs lg:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      {children}
    </TabsTrigger>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        {accent && <span className={`inline-block h-2 w-2 rounded-full ${accent}`} />}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

const statusStyles: Record<OSStatus, string> = {
  fila: "bg-status-queue text-status-queue-foreground",
  consertando: "bg-status-fixing text-status-fixing-foreground",
  pronta: "bg-status-ready text-status-ready-foreground",
};

function Column({
  status, items, onAdvance, onBack, onRemove, onEdit,
}: {
  status: OSStatus;
  items: OrdemServico[];
  onAdvance: (id: string) => void;
  onBack: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (it: OrdemServico) => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusStyles[status]}`} />
          <h3 className="text-sm font-semibold">{statusLabel[status]}</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <div className="flex-1 space-y-3 min-h-32">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/70 text-center py-8 border border-dashed border-border rounded-lg">
            Vazio
          </p>
        )}
        {items.map((it) => (
          <Card key={it.id} it={it} status={status}
            onAdvance={onAdvance} onBack={onBack} onRemove={onRemove} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function Card({
  it, status, onAdvance, onBack, onRemove, onEdit,
}: {
  it: OrdemServico; status: OSStatus;
  onAdvance: (id: string) => void; onBack: (id: string) => void;
  onRemove: (id: string) => void; onEdit: (it: OrdemServico) => void;
}) {
  const [open, setOpen] = useState(false);

  const msgPronta = `Olá ${it.cliente}, sua moto ${it.modelo} (${it.placa}) está pronta para retirada${it.valor ? `. Valor: ${formatBRL(it.valor)}` : ""}.`;

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 text-left flex-1">
          <h4 className="font-display font-semibold text-sm truncate">{it.modelo}</h4>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">{it.placa}</p>
        </button>
        {it.valor != null && (
          <span className="shrink-0 text-xs font-medium tabular-nums">{formatBRL(it.valor)}</span>
        )}
      </div>

      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
        <span className="truncate">{it.cliente}</span>
        <span className="shrink-0 ml-2">{relativeTime(it.criadoEm)}</span>
      </div>

      {open && (
        <div className="mt-3 space-y-2 text-xs border-t border-border pt-3">
          {it.celular && <p><span className="text-muted-foreground">Tel:</span> {it.celular}</p>}
          {it.defeito && (
            <div>
              <p className="text-muted-foreground mb-1">Defeito:</p>
              <p className="bg-muted rounded-md p-2 leading-relaxed">{it.defeito}</p>
            </div>
          )}
          {it.observacoes && (
            <div>
              <p className="text-muted-foreground mb-1">Obs:</p>
              <p className="bg-muted rounded-md p-2 leading-relaxed">{it.observacoes}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button onClick={() => onAdvance(it.id)}
          className="flex-1 min-w-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
          {status === "pronta" ? "Reabrir" : "Avançar →"}
        </button>
        {status !== "fila" && (
          <button onClick={() => onBack(it.id)} title="Voltar status"
            className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">←</button>
        )}
        <button onClick={() => abrirPDFOrdemServico(it)} title="Gerar PDF da O.S."
          className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">PDF</button>
        {it.celular && (
          <a href={whatsappLink(it.celular, status === "pronta" ? msgPronta : osMensagemWhatsapp(it))}
            target="_blank" rel="noreferrer" title="Enviar via WhatsApp"
            className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">WhatsApp</a>
        )}
        <button onClick={() => onEdit(it)} title="Editar"
          className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">✎</button>
        <button onClick={() => onRemove(it.id)} title="Remover"
          className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted">×</button>
      </div>
    </article>
  );
}
