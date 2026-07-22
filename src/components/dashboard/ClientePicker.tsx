import { useEffect, useMemo, useRef, useState } from "react";
import { clientesDB, type ClienteDB } from "@/lib/db";

interface Props {
  nome: string;
  celular: string;
  onChange: (v: { nome: string; celular: string }) => void;
  labelNome?: string;
  labelCelular?: string;
}

export function ClientePicker({ nome, celular, onChange, labelNome = "Cliente", labelCelular = "Celular" }: Props) {
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => clientesDB.subscribe(setClientes), []);

  useEffect(() => {
    function onDoc(e: Event) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const sugestoes = useMemo(() => {
    const q = nome.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(q) || (c.celular ?? "").includes(q))
      .slice(0, 8);
  }, [clientes, nome]);

  const jaExiste = useMemo(() => {
    const q = nome.trim().toLowerCase();
    if (!q) return true;
    return clientes.some((c) => c.nome.trim().toLowerCase() === q);
  }, [clientes, nome]);

  function pick(c: ClienteDB) {
    onChange({ nome: c.nome, celular: c.celular ?? "" });
    setOpen(false);
  }

  async function salvarNovo() {
    if (!nome.trim() || saving) return;
    setSaving(true);
    try {
      await clientesDB.create({ nome: nome.trim(), celular: celular.trim() });
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="relative" ref={wrapRef}>
        <label className="text-xs font-medium text-muted-foreground">{labelNome}</label>
        <input
          value={nome}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { onChange({ nome: e.target.value, celular }); setOpen(true); }}
          placeholder="Nome completo"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          autoComplete="off"
        />
        {open && sugestoes.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
            {sugestoes.map((c) => (
              <li key={c.id}>
                <button type="button"
                  onPointerDown={(e) => { e.preventDefault(); pick(c); }}
                  onClick={() => pick(c)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted">
                  <div className="font-medium truncate">{c.nome}</div>
                  {c.celular && <div className="text-xs text-muted-foreground">{c.celular}</div>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!jaExiste && nome.trim() && (
          <button type="button" onClick={salvarNovo} disabled={saving}
            className="mt-1 text-[11px] text-primary hover:underline disabled:opacity-50">
            {saving ? "salvando..." : "＋ salvar como novo cliente"}
          </button>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">{labelCelular}</label>
        <input
          value={celular}
          onChange={(e) => onChange({ nome, celular: e.target.value })}
          placeholder="(11) 99999-0000"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
