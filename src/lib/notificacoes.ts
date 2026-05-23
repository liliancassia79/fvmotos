import { whatsappLink, statusLabel, type OrdemServico, type OSStatus } from "./os-storage";

export interface NotifPrefs {
  autoNotificar: boolean;
  // mensagens por status (template — {cliente} {modelo} {placa})
  templates: Record<OSStatus, string>;
}

export interface NotifLog {
  id: string;
  osId: string;
  cliente: string;
  placa: string;
  status: OSStatus;
  mensagem: string;
  enviadoEm: number;
}

const KEY_PREFS = "oficina-notif-prefs-v1";
const KEY_LOG = "oficina-notif-log-v1";

const TEMPLATES_PADRAO: Record<OSStatus, string> = {
  fila: "Olá {cliente}! Recebemos sua moto {modelo} ({placa}) na FV Motos. Você está na fila e avisaremos quando começarmos o serviço.",
  consertando: "Olá {cliente}! Sua moto {modelo} ({placa}) já está em manutenção na FV Motos. Avisaremos assim que estiver pronta.",
  pronta: "Olá {cliente}! Sua moto {modelo} ({placa}) está PRONTA para retirada na FV Motos. Aguardamos sua visita!",
};

export function loadNotifPrefs(): NotifPrefs {
  if (typeof window === "undefined") return { autoNotificar: false, templates: TEMPLATES_PADRAO };
  try {
    const raw = localStorage.getItem(KEY_PREFS);
    if (!raw) return { autoNotificar: false, templates: TEMPLATES_PADRAO };
    const p = JSON.parse(raw) as Partial<NotifPrefs>;
    return {
      autoNotificar: !!p.autoNotificar,
      templates: { ...TEMPLATES_PADRAO, ...(p.templates ?? {}) },
    };
  } catch {
    return { autoNotificar: false, templates: TEMPLATES_PADRAO };
  }
}

export function saveNotifPrefs(p: NotifPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PREFS, JSON.stringify(p));
}

export function loadNotifLog(): NotifLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_LOG);
    return raw ? (JSON.parse(raw) as NotifLog[]) : [];
  } catch {
    return [];
  }
}

export function saveNotifLog(l: NotifLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_LOG, JSON.stringify(l.slice(0, 200)));
}

export function renderTemplate(tpl: string, it: OrdemServico) {
  return tpl
    .replaceAll("{cliente}", it.cliente)
    .replaceAll("{modelo}", it.modelo)
    .replaceAll("{placa}", it.placa)
    .replaceAll("{status}", statusLabel[it.status]);
}

/**
 * Dispara a notificação automática (abre WhatsApp em nova aba) e registra no log.
 * Chamado quando o status muda. Retorna true se enviou.
 */
export function notificarMudancaStatus(it: OrdemServico): boolean {
  const prefs = loadNotifPrefs();
  if (!prefs.autoNotificar || !it.celular) return false;
  const tpl = prefs.templates[it.status];
  if (!tpl) return false;
  const mensagem = renderTemplate(tpl, it);
  const url = whatsappLink(it.celular, mensagem);
  window.open(url, "_blank", "noopener,noreferrer");
  const log = loadNotifLog();
  log.unshift({
    id: crypto.randomUUID(),
    osId: it.id, cliente: it.cliente, placa: it.placa, status: it.status,
    mensagem, enviadoEm: Date.now(),
  });
  saveNotifLog(log);
  return true;
}
