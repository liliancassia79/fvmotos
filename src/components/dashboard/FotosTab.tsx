import { useEffect, useState, type ChangeEvent } from "react";
import { loadOS, type OrdemServico } from "@/lib/os-storage";
import { loadFotos, saveFotos, fileToCompressedDataUrl, type Foto } from "@/lib/fotos-storage";
import { Panel, Empty } from "./ui-bits";

export function FotosTab() {
  const [oss, setOss] = useState<OrdemServico[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [osId, setOsId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Foto | null>(null);

  useEffect(() => {
    setOss(loadOS());
    setFotos(loadFotos());
    setHidratado(true);
  }, []);
  useEffect(() => { if (hidratado) saveFotos(fotos); }, [fotos, hidratado]);

  const osSelecionada = oss.find((o) => o.id === osId);
  const doOs = fotos.filter((f) => f.osId === osId);

  async function adicionar(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !osSelecionada) return;
    setBusy(true);
    try {
      const novas: Foto[] = [];
      for (const file of files) {
        const dataUrl = await fileToCompressedDataUrl(file);
        novas.push({
          id: crypto.randomUUID(),
          osId: osSelecionada.id,
          placa: osSelecionada.placa,
          dataUrl,
          criadoEm: Date.now(),
        });
      }
      setFotos((p) => [...novas, ...p]);
    } catch (err) {
      console.error(err);
      alert("Falha ao adicionar foto.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function removerFoto(id: string) {
    if (!confirm("Remover esta foto?")) return;
    setFotos((p) => p.filter((f) => f.id !== id));
  }

  function atualizarLegenda(id: string, legenda: string) {
    setFotos((p) => p.map((f) => (f.id === id ? { ...f, legenda } : f)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel title="Selecione a O.S.">
        <select
          value={osId}
          onChange={(e) => setOsId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— escolha uma O.S. —</option>
          {oss.map((o) => (
            <option key={o.id} value={o.id}>
              {o.placa} · {o.modelo} · {o.cliente}
            </option>
          ))}
        </select>

        {osSelecionada && (
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <div><b className="text-foreground">{osSelecionada.modelo}</b> — {osSelecionada.placa}</div>
            <div>Cliente: {osSelecionada.cliente}</div>
            <div>Fotos anexadas: <b className="text-foreground">{doOs.length}</b></div>
          </div>
        )}

        {osSelecionada && (
          <div className="mt-5 space-y-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Tirar foto (câmera)</span>
              <input
                type="file" accept="image/*" capture="environment" multiple
                onChange={adicionar} disabled={busy}
                className="mt-1 w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:font-medium"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Anexar da galeria</span>
              <input
                type="file" accept="image/*" multiple
                onChange={adicionar} disabled={busy}
                className="mt-1 w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:font-medium"
              />
            </label>
            {busy && <p className="text-xs text-muted-foreground">Processando…</p>}
          </div>
        )}
      </Panel>

      <div className="space-y-4">
        {!osSelecionada ? (
          <Empty>Selecione uma O.S. para tirar ou anexar fotos.</Empty>
        ) : doOs.length === 0 ? (
          <Empty>Nenhuma foto anexada a esta O.S. ainda.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {doOs.map((f) => (
              <figure key={f.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <button onClick={() => setPreview(f)} className="block w-full aspect-square overflow-hidden bg-muted">
                  <img src={f.dataUrl} alt={f.legenda ?? "Foto"} className="w-full h-full object-cover" />
                </button>
                <figcaption className="p-2 space-y-1">
                  <input
                    value={f.legenda ?? ""} onChange={(e) => atualizarLegenda(f.id, e.target.value)}
                    placeholder="Legenda (ex: motor, antes/depois)"
                    className="w-full rounded border border-input bg-background px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>{new Date(f.criadoEm).toLocaleDateString("pt-BR")}</span>
                    <button onClick={() => removerFoto(f.id)} className="hover:text-destructive">remover</button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={preview.dataUrl} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
