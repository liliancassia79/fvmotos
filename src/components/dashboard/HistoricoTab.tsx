import { useEffect, useMemo, useState } from "react";
import {
  loadOS, statusLabel, formatBRL, formatDate,
  type OrdemServico, type OSStatus,
} from "@/lib/os-storage";
import { loadFotos, type Foto } from "@/lib/fotos-storage";
import { Panel, Empty, Pill } from "./ui-bits";

interface PlacaInfo {
  placa: string;
  modelo: string;
  cliente: string;
  oss: OrdemServico[];
  totalGasto: number;
  ultimaVisita: number;
}

const toneFor = (s: OSStatus): "queue" | "fixing" | "ready" =>
  s === "fila" ? "queue" : s === "consertando" ? "fixing" : "ready";

export function HistoricoTab() {
  const [oss, setOss] = useState<OrdemServico[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [busca, setBusca] = useState("");
  const [placaSel, setPlacaSel] = useState<string>("");

  useEffect(() => {
    setOss(loadOS());
    setFotos(loadFotos());
  }, []);

  const placas = useMemo<PlacaInfo[]>(() => {
    const map = new Map<string, PlacaInfo>();
    for (const o of oss) {
      const k = o.placa.trim().toUpperCase();
      if (!k) continue;
      const cur = map.get(k);
      if (cur) {
        cur.oss.push(o);
        cur.totalGasto += o.valor ?? 0;
        cur.ultimaVisita = Math.max(cur.ultimaVisita, o.criadoEm);
      } else {
        map.set(k, {
          placa: k, modelo: o.modelo, cliente: o.cliente,
          oss: [o], totalGasto: o.valor ?? 0, ultimaVisita: o.criadoEm,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.ultimaVisita - a.ultimaVisita);
  }, [oss]);

  const filtradas = placas.filter((p) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [p.placa, p.modelo, p.cliente].some((v) => v.toLowerCase().includes(q));
  });

  const sel = placas.find((p) => p.placa === placaSel);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar placa, modelo, cliente..."
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {filtradas.length === 0 ? (
          <Empty>Nenhuma moto cadastrada</Empty>
        ) : (
          <ul className="space-y-2 max-h-[600px] overflow-auto pr-1">
            {filtradas.map((p) => (
              <li key={p.placa}>
                <button
                  onClick={() => setPlacaSel(p.placa)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    placaSel === p.placa
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{p.placa}</span>
                    <span className="text-[10px] text-muted-foreground">{p.oss.length} O.S.</span>
                  </div>
                  <div className="text-xs mt-0.5">{p.modelo}</div>
                  <div className="text-[11px] text-muted-foreground">{p.cliente}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!sel ? (
        <Empty>Selecione uma moto para ver o prontuário</Empty>
      ) : (
        <Prontuario info={sel} fotos={fotos.filter((f) => f.placa.toUpperCase() === sel.placa)} />
      )}
    </div>
  );
}

function Prontuario({ info, fotos }: { info: PlacaInfo; fotos: Foto[] }) {
  const ordenadas = [...info.oss].sort((a, b) => b.criadoEm - a.criadoEm);
  return (
    <div className="space-y-5">
      <Panel title={`${info.modelo} · ${info.placa}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Stat label="Cliente" value={info.cliente} />
          <Stat label="Total de O.S." value={String(info.oss.length)} />
          <Stat label="Total gasto" value={formatBRL(info.totalGasto)} />
          <Stat label="Última visita" value={formatDate(info.ultimaVisita)} />
        </div>
      </Panel>

      <Panel title="Linha do tempo">
        <ol className="space-y-3">
          {ordenadas.map((o) => (
            <li key={o.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{formatDate(o.criadoEm)}</span>
                <Pill tone={toneFor(o.status)}>{statusLabel[o.status]}</Pill>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{o.defeito || "—"}</p>
              {o.observacoes && (
                <p className="mt-2 text-xs text-muted-foreground italic whitespace-pre-wrap">{o.observacoes}</p>
              )}
              {o.valor != null && (
                <p className="mt-2 text-xs font-medium">Valor: {formatBRL(o.valor)}</p>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title={`Fotos da moto (${fotos.length})`}>
        {fotos.length === 0 ? (
          <Empty>Sem fotos anexadas a esta moto.</Empty>
        ) : (
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
            {fotos.map((f) => (
              <a key={f.id} href={f.dataUrl} target="_blank" rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-md border border-border bg-muted">
                <img src={f.dataUrl} alt={f.legenda ?? ""} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}
