import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  nextStatus, statusLabel, statusOrder,
  formatBRL, relativeTime, whatsappLink, exportarCSV,
  type OrdemServico, type OSStatus,
} from "@/lib/os-storage";
import { osDB, catDB, type ServicoDB } from "@/lib/db";
import { abrirPDFOrdemServico, osMensagemWhatsapp } from "@/lib/os-pdf";
import { formasPagamento, type FormaPagamento } from "@/lib/pagamento";
import { useInstallPrompt } from "@/lib/install-pwa";
import { ClientesTab } from "@/components/dashboard/ClientesTab";
import { OrcamentosTab } from "@/components/dashboard/OrcamentosTab";
import { AgendamentosTab } from "@/components/dashboard/AgendamentosTab";
import { FaturamentoTab } from "@/components/dashboard/FaturamentoTab";
import { CatalogoTab } from "@/components/dashboard/CatalogoTab";
import { DashboardTab } from "@/components/dashboard/DashboardTab";
import { FotosUpload } from "@/components/dashboard/FotosUpload";
import logo from "@/assets/fv-motos-logo.png";

export const Route = createFileRoute("/")({
  component: AppShell,
  head: () => ({
    meta: [
      { title: "FV Motos · Gestão da Oficina" },
      { name: "description", content: "Gerencie ordens de serviço, clientes, orçamentos e agenda da FV Motos." },
    ],
  }),
});

type View = "dashboard" | "os" | "clientes" | "orcamentos" | "agenda" | "faturamento" | "catalogo";

const menu: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "os", label: "Ordens de Serviço", icon: "🔧" },
  { id: "clientes", label: "Clientes", icon: "👤" },
  { id: "orcamentos", label: "Orçamentos", icon: "💬" },
  { id: "agenda", label: "Agenda", icon: "📅" },
  { id: "faturamento", label: "Faturamento", icon: "💰" },
  { id: "catalogo", label: "Catálogo", icon: "📋" },
];

function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { install, installed, canInstall } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-40 h-screen w-60 shrink-0 border-r border-border bg-card flex flex-col transition-transform`}>
        <div className="px-4 py-5 border-b border-border flex flex-col items-center gap-2">
          <img src={logo} alt="FV Motos" className="h-32 w-32 object-contain drop-shadow-lg" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Gestão da Oficina</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menu.map((m) => (
            <button key={m.id} onClick={() => { setView(m.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                view === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              <span className="text-base">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          {!installed && (
            <button onClick={install}
              className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:opacity-90"
              title={canInstall ? "Instalar como aplicativo" : "Como instalar"}>
              ↓ Instalar App
            </button>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <button aria-label="Fechar menu" onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60" />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-2">
          <button onClick={() => setMobileOpen(true)} className="rounded-md border border-border px-3 py-1.5 text-sm">☰ Menu</button>
          <img src={logo} alt="FV Motos" className="h-10 w-10 object-contain" />
          {!installed && (
            <button onClick={install}
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90"
              title={canInstall ? "Instalar como aplicativo" : "Como instalar"}>
              ↓ Instalar
            </button>
          )}
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
          {view === "dashboard" && <DashboardTab />}
          {view === "os" && <OSView />}
          {view === "clientes" && <ClientesTab />}
          {view === "orcamentos" && <OrcamentosTab />}
          {view === "agenda" && <AgendamentosTab />}
          {view === "faturamento" && <FaturamentoTab />}
          {view === "catalogo" && <CatalogoTab />}
        </main>
      </div>
    </div>
  );
}

const empty = { modelo: "", placa: "", cliente: "", celular: "", defeito: "", valor: "", observacoes: "", formaPagamento: "" as "" | FormaPagamento, fotos: [] as string[], pago: false };

function OSView() {
  const [items, setItems] = useState<OrdemServico[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempId, setTempId] = useState(() => crypto.randomUUID());
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<OSStatus | "todos">("todos");
  const [catalogo, setCatalogo] = useState<ServicoDB[]>([]);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try { setItems(await osDB.list()); } catch (e) { console.error(e); }
  }
  useEffect(() => {
    refresh();
    catDB.list().then(setCatalogo).catch(console.error);
  }, []);

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
      return [i.modelo, i.placa, i.cliente, i.celular, i.defeito].some((c) => (c ?? "").toLowerCase().includes(q));
    });
  }, [items, busca, filtroStatus]);

  const grouped = useMemo(() => {
    const g: Record<OSStatus, OrdemServico[]> = { fila: [], consertando: [], pronta: [] };
    for (const it of filtered) g[it.status].push(it);
    return g;
  }, [filtered]);

  function resetForm() { setForm(empty); setEditingId(null); setTempId(crypto.randomUUID()); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.modelo || !form.placa || !form.cliente) return;
    const valor = form.valor ? Number(form.valor.replace(",", ".")) : undefined;
    const formaPagamento = form.formaPagamento || undefined;
    const { formaPagamento: _fp, ...rest } = form;
    setSaving(true);
    try {
      if (editingId) {
        await osDB.update(editingId, { ...rest, valor, formaPagamento, atualizadoEm: Date.now() });
      } else {
        await osDB.create({ ...rest, valor, formaPagamento, status: "fila" });
      }
      resetForm();
      await refresh();
    } catch (e) { console.error(e); alert("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  function editar(it: OrdemServico) {
    setEditingId(it.id);
    setForm({
      modelo: it.modelo, placa: it.placa, cliente: it.cliente,
      celular: it.celular, defeito: it.defeito,
      valor: it.valor != null ? it.valor.toFixed(2).replace(".", ",") : "",
      observacoes: it.observacoes ?? "",
      formaPagamento: it.formaPagamento ?? "",
      fotos: it.fotos ?? [],
      pago: !!it.pago,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function advance(id: string) {
    const it = items.find((x) => x.id === id); if (!it) return;
    const novo = nextStatus(it.status);
    await osDB.update(id, { status: novo, atualizadoEm: Date.now(), finalizadoEm: novo === "pronta" ? Date.now() : it.finalizadoEm });
    refresh();
  }

  async function voltar(id: string) {
    const it = items.find((x) => x.id === id); if (!it) return;
    const i = statusOrder.indexOf(it.status);
    const novo = statusOrder[Math.max(0, i - 1)];
    await osDB.update(id, { status: novo, atualizadoEm: Date.now() });
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover esta O.S.?")) return;
    await osDB.remove(id);
    if (editingId === id) resetForm();
    refresh();
  }


  const fotosId = editingId ?? tempId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold">Ordens de Serviço</h2>
          <p className="text-sm text-muted-foreground">Cadastre e acompanhe o fluxo de reparos</p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section>
          <div className="lg:sticky lg:top-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{editingId ? "Editar O.S." : "Nova O.S."}</h3>
              {editingId && (
                <button onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">cancelar</button>
              )}
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3">
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
              <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                <input type="checkbox" checked={form.pago}
                  onChange={(e) => setForm({ ...form, pago: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
                <span>Cliente já pagou</span>
              </label>
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

              <FotosUpload
                fotos={form.fotos}
                osId={fotosId}
                onChange={async (fotos) => {
                  setForm((f) => ({ ...f, fotos }));
                  if (editingId) {
                    await osDB.update(editingId, { fotos, atualizadoEm: Date.now() });
                    refresh();
                  }
                }}
              />

              <button type="submit" disabled={saving} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar O.S."}
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por placa, cliente, modelo..."
              className="flex-1 min-w-[200px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-1 rounded-md border border-border bg-card p-1">
              {(["todos", ...statusOrder] as const).map((s) => (
                <button key={s} onClick={() => setFiltroStatus(s)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${filtroStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {s === "todos" ? "Todos" : statusLabel[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {statusOrder.map((s) => (
              <Column key={s} status={s} items={grouped[s]}
                onAdvance={advance} onBack={voltar} onRemove={remove} onEdit={editar}
                onTogglePago={async (id, pago) => {
                  const os = items.find((x) => x.id === id);
                  const patch: any = { pago, atualizadoEm: Date.now() };
                  if (pago && os && (os.valor == null || isNaN(os.valor))) {
                    const v = window.prompt("Informe o valor pago (R$):", "");
                    if (v == null) return;
                    const n = Number(String(v).replace(",", "."));
                    if (isNaN(n) || n < 0) { alert("Valor inválido"); return; }
                    patch.valor = n;
                  }
                  await osDB.update(id, patch); refresh();
                }} />

            ))}
          </div>
        </section>
      </div>
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
  status, items, onAdvance, onBack, onRemove, onEdit, onTogglePago,
}: {
  status: OSStatus; items: OrdemServico[];
  onAdvance: (id: string) => void; onBack: (id: string) => void;
  onRemove: (id: string) => void; onEdit: (it: OrdemServico) => void;
  onTogglePago: (id: string, pago: boolean) => void;
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
          <p className="text-xs text-muted-foreground/70 text-center py-8 border border-dashed border-border rounded-lg">Vazio</p>
        )}
        {items.map((it) => (
          <Card key={it.id} it={it} status={status}
            onAdvance={onAdvance} onBack={onBack} onRemove={onRemove} onEdit={onEdit} onTogglePago={onTogglePago} />
        ))}
      </div>
    </div>
  );
}

function Card({
  it, status, onAdvance, onBack, onRemove, onEdit, onTogglePago,
}: {
  it: OrdemServico; status: OSStatus;
  onAdvance: (id: string) => void; onBack: (id: string) => void;
  onRemove: (id: string) => void; onEdit: (it: OrdemServico) => void;
  onTogglePago: (id: string, pago: boolean) => void;
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
          <span className={`shrink-0 text-xs font-medium tabular-nums ${it.pago ? "text-emerald-600" : ""}`}>{formatBRL(it.valor)}</span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${it.pago ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"}`}>
          {it.pago ? "● Pago" : "○ Não pago"}
        </span>
      </div>

      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
        <span className="truncate">{it.cliente}</span>
        <span className="shrink-0 ml-2">{relativeTime(it.criadoEm)}</span>
      </div>

      {it.fotos && it.fotos.length > 0 && (
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {it.fotos.slice(0, 4).map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={url} alt="" className="h-12 w-12 rounded object-cover border border-border" />
            </a>
          ))}
          {it.fotos.length > 4 && (
            <span className="shrink-0 h-12 w-12 rounded border border-border bg-muted flex items-center justify-center text-xs">+{it.fotos.length - 4}</span>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2 text-xs border-t border-border pt-3">
          {it.celular && <p><span className="text-muted-foreground">Tel:</span> {it.celular}</p>}
          {it.defeito && (
            <div>
              <p className="text-muted-foreground mb-1">Defeito:</p>
              <p className="bg-muted rounded-md p-2 leading-relaxed whitespace-pre-line">{it.defeito}</p>
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
        <button onClick={() => onTogglePago(it.id, !it.pago)} title={it.pago ? "Marcar como não pago" : "Marcar como pago"}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${it.pago ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20" : "border-border hover:bg-muted"}`}>
          {it.pago ? "✓ Pago" : "Pagar"}
        </button>
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
