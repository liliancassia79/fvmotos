import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  loadCatalogo, saveCatalogo, categoriaLabel,
  type ServicoItem, type ServicoCategoria,
} from "@/lib/catalog";
import { formatBRL } from "@/lib/os-storage";
import { Field, Panel, Empty } from "./ui-bits";

const categorias: ServicoCategoria[] = ["revisao", "pecas", "motor", "eletrica", "injecao", "acessorios"];

export function CatalogoTab() {
  const [items, setItems] = useState<ServicoItem[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState<ServicoCategoria>("revisao");

  useEffect(() => { setItems(loadCatalogo()); setHidratado(true); }, []);
  useEffect(() => { if (hidratado) saveCatalogo(items); }, [items, hidratado]);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!nome) return;
    setItems((p) => [...p, {
      id: crypto.randomUUID(), nome, categoria,
      preco: Number(preco.replace(",", ".")) || 0,
    }]);
    setNome(""); setPreco("");
  }

  function updatePreco(id: string, v: string) {
    const n = Number(v.replace(",", ".")) || 0;
    setItems((p) => p.map((s) => s.id === id ? { ...s, preco: n } : s));
  }

  function remove(id: string) {
    setItems((p) => p.filter((s) => s.id !== id));
  }

  const grupos = useMemo(() => {
    const g: Record<ServicoCategoria, ServicoItem[]> = {
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
          <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Adicionar ao catálogo
          </button>
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
                      <input value={s.preco.toString()} onChange={(e) => updatePreco(s.id, e.target.value)}
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-right outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums w-20 text-right">{formatBRL(s.preco)}</span>
                    <button onClick={() => remove(s.id)}
                      className="text-muted-foreground hover:text-destructive text-sm">×</button>
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
