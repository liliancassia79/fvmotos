import { useEffect, useState } from "react";
import {
  loadNotifPrefs, saveNotifPrefs, loadNotifLog,
  type NotifPrefs, type NotifLog,
} from "@/lib/notificacoes";
import { statusLabel, statusOrder, formatDate, whatsappLink } from "@/lib/os-storage";
import { Panel, Empty, Pill } from "./ui-bits";

export function NotificacoesTab() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [log, setLog] = useState<NotifLog[]>([]);

  useEffect(() => {
    setPrefs(loadNotifPrefs());
    setLog(loadNotifLog());
  }, []);

  useEffect(() => { if (prefs) saveNotifPrefs(prefs); }, [prefs]);

  function setTpl(s: keyof NotifPrefs["templates"], v: string) {
    if (!prefs) return;
    setPrefs({ ...prefs, templates: { ...prefs.templates, [s]: v } });
  }

  if (!prefs) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Panel
          title="Notificação automática"
          action={
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox" checked={prefs.autoNotificar}
                onChange={(e) => setPrefs({ ...prefs, autoNotificar: e.target.checked })}
                className="h-4 w-4 accent-[color:var(--primary)]"
              />
              <span>{prefs.autoNotificar ? "Ativada" : "Desativada"}</span>
            </label>
          }
        >
          <p className="text-xs text-muted-foreground mb-4">
            Quando o status de uma O.S. mudar, o WhatsApp do cliente abre automaticamente com a mensagem abaixo.
            Use as variáveis <code className="text-foreground">{`{cliente}`}</code>,{" "}
            <code className="text-foreground">{`{modelo}`}</code>,{" "}
            <code className="text-foreground">{`{placa}`}</code>.
          </p>

          <div className="space-y-4">
            {statusOrder.map((s) => (
              <div key={s}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Mensagem ao mudar para <b className="text-foreground">{statusLabel[s]}</b>
                  </label>
                  <Pill tone={s === "fila" ? "queue" : s === "consertando" ? "fixing" : "ready"}>
                    {statusLabel[s]}
                  </Pill>
                </div>
                <textarea
                  rows={3} value={prefs.templates[s]}
                  onChange={(e) => setTpl(s, e.target.value)}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title={`Histórico (${log.length})`}>
        {log.length === 0 ? (
          <Empty>Nenhuma notificação enviada ainda.</Empty>
        ) : (
          <ul className="space-y-3 max-h-[520px] overflow-auto">
            {log.map((l) => (
              <li key={l.id} className="rounded-md border border-border p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{l.cliente}</span>
                  <Pill tone={l.status === "fila" ? "queue" : l.status === "consertando" ? "fixing" : "ready"}>
                    {statusLabel[l.status]}
                  </Pill>
                </div>
                <p className="text-muted-foreground">{l.placa} · {formatDate(l.enviadoEm)}</p>
                <p className="text-foreground/80 line-clamp-3">{l.mensagem}</p>
                <a href={whatsappLink("", l.mensagem)} target="_blank" rel="noreferrer"
                  className="inline-block text-primary hover:underline">reenviar →</a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
