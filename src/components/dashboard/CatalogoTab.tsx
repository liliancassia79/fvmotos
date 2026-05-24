import { useEffect, useMemo, useState, type FormEvent } from "react";
import { catDB, categoriaLabel, type ServicoDB, type ServicoCategoria } from "@/lib/db";
import { formatBRL } from "@/lib/os-storage";
import { Field, Panel, Empty } from "./ui-bits";

const categorias: ServicoCategoria[] = ["revisao", "pecas", "motor", "eletrica", "injecao", "acessorios"];

const SEED: Omit<ServicoDB, "id">[] = [
  { nome: "Revisão Básica", categoria: "revisao", preco: 150 },
  { nome: "Revisão Premium", categoria: "revisao", preco: 350 },
  { nome: "Troca de Lonas de Freio", categoria: "pecas", preco: 120 },
  { nome: "Troca de Pastilhas", categoria: "pecas", preco: 90 },
  { nome: "Kit de Transmissão (relação)", categoria: "pecas", preco: 280 },
  { nome: "Retífica de Motor", categoria: "motor", preco: 1200 },
  { nome: "Revisão de Motor", categoria: "motor", preco: 450 },
  { nome: "Diagnóstico Elétrico / Bateria", categoria: "eletrica", preco: 80 },
  { nome: "Scanner de Injeção Eletrônica", categoria: "injecao", preco: 120 },
  { nome: "Limpeza de Bicos Injetores", categoria: "injecao", preco: 160 },
  { nome: "Instalação de Acessórios", categoria: "acessorios", preco: 70 },
];

export function CatalogoTab() {
  const [items, setItems] = useState<ServicoDB[]>([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState<ServicoCategoria>("revisao");
  const [busy, setBusy] = useState(false);

  async function reload() { setItems(await catDB.list()); }
  useEffect(() => { reload(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!nome) return;
    setBusy(true);
    try {
      await catDB.create({ nome, categoria, preco: Number(preco.replace(",", ".")) || 0 });
      setNome(""); setPreco(""); await reload();
    } catch (err) { alert((err as Error).message); }
    finally { setBusy(false); }
  }

  async function updatePreco(id: string, v: string) {
    const n = Number(v.replace(",", ".")) || 0;
    setItems((p) => p.map((s) => s.id === id ? { ...s, preco: n } : s));
    await catDB.update(id, { preco: n });
  }

  async function remove(id: string) {
    await catDB.remove(id); reload();
  }

  async function seedPadrao() {
    if (!confirm("Adicionar serviços padrão ao catálogo?")) return;
    for (const s of SEED) await catDB.create(s);
    reload();
  }

  const grupos = useMemo(() => {
    const g: Record<ServicoCategoria, ServicoDB[]> = {
      revisao: [], pecas: [], motor: [], eletrica: [], injecao: [], acessorios: [],
    };
    for (const s of items) g[s.categoria].push(s);
    return g;
  }, [items]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel title="Adicionar Serviço">
        <form onSubmit={add} className="space-y-3">
          <Field label="Nome" value={nome} onChange={setNome} placeholder="Ex: Troca de óleo" />
          <Field label="Preço (R$)" value={preco} onChange={setPreco} placeholder="120,00" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as ServicoCategoria)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              {categorias.map((c) => <option key={c} value={c}>{categoriaLabel[c]}</option>)}
            </select>
          </div>
          <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "..." : "Adicionar ao catálogo"}
          </button>
          {items.length === 0 && (
            <button type="button" onClick={seedPadrao}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-muted">
              Carregar serviços padrão
            </button>
          )}
        </form>
      </Panel>

      <div className="space-y-5">
        {categorias.map((cat) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold mb-2">{categoriaLabel[cat]}</h3>
            {grupos[cat].length === 0 ? (
              <Empty>Sem serviços nesta categoria</Empty>
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {grupos[cat].map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 text-sm truncate">{s.nome}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <input defaultValue={s.preco.toString()} onBlur={(e) => updatePreco(s.id, e.target.value)}
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-right outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums w-20 text-right">{formatBRL(s.preco)}</span>
                    <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive text-sm">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
