import { useRef, useState } from "react";
import { uploadFotoMoto, removerFotoMoto } from "@/lib/foto-storage";

export function FotosUpload({
  fotos, osId, onChange,
}: { fotos: string[]; osId: string; onChange: (fotos: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadFotoMoto(f, osId);
        urls.push(url);
      }
      onChange([...(fotos || []), ...urls]);
    } catch (e) {
      alert("Falha ao enviar foto: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remover(url: string) {
    if (!confirm("Remover foto?")) return;
    try { await removerFotoMoto(url); } catch {}
    onChange((fotos || []).filter((f) => f !== url));
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">Fotos da moto</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {(fotos || []).map((url) => (
          <div key={url} className="relative group">
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="moto" className="h-20 w-20 rounded-md object-cover border border-border" />
            </a>
            <button type="button" onClick={() => remover(url)}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100">×</button>
          </div>
        ))}
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()}
          className="h-20 w-20 rounded-md border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50">
          {busy ? "..." : "📷 Câmera"}
        </button>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
          className="h-20 w-20 rounded-md border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50">
          {busy ? "..." : "🖼 Galeria"}
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        <input ref={inputRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
}
