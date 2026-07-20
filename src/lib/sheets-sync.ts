import { syncSheetRow } from "./sheets.functions";

function fire(sheet: string, id: string, action: "upsert" | "delete", values?: (string | number | null)[]) {
  syncSheetRow({ data: { sheet, id, action, values } }).catch((e) => {
    console.warn("[sheets-sync]", sheet, action, e?.message ?? e);
  });
}

const fmtDate = (ms?: number) => (ms ? new Date(ms).toLocaleString("pt-BR") : "");

export const sheetsSync = {
  cliente: {
    upsert(c: { id: string; nome: string; celular?: string; email?: string; observacoes?: string; criadoEm?: number }) {
      fire("Clientes", c.id, "upsert", [c.nome, c.celular ?? "", c.email ?? "", c.observacoes ?? "", fmtDate(c.criadoEm)]);
    },
    remove(id: string) { fire("Clientes", id, "delete"); },
  },
  os: {
    upsert(o: { id: string; modelo?: string; placa?: string; cliente?: string; celular?: string; defeito?: string; valor?: number; formaPagamento?: string; status?: string; pago?: boolean; criadoEm?: number; finalizadoEm?: number }) {
      fire("Ordens de Servico", o.id, "upsert", [
        o.modelo ?? "", o.placa ?? "", o.cliente ?? "", o.celular ?? "",
        o.defeito ?? "", o.valor ?? "", o.formaPagamento ?? "",
        o.status ?? "", o.pago ? "Sim" : "Não",
        fmtDate(o.criadoEm), fmtDate(o.finalizadoEm),
      ]);
    },
    remove(id: string) { fire("Ordens de Servico", id, "delete"); },
  },
  orc: {
    upsert(o: { id: string; cliente: string; celular?: string; total: number; formaPagamento?: string; status: string; pago?: boolean; observacoes?: string; itens?: { descricao: string; valor: number }[]; criadoEm?: number }) {
      const itens = (o.itens ?? []).map((i) => `${i.descricao} (R$ ${i.valor})`).join(" | ");
      fire("Orcamentos", o.id, "upsert", [
        o.cliente, o.celular ?? "", itens, o.total, o.formaPagamento ?? "",
        o.status, o.pago ? "Sim" : "Não", o.observacoes ?? "", fmtDate(o.criadoEm),
      ]);
    },
    remove(id: string) { fire("Orcamentos", id, "delete"); },
  },
  ag: {
    upsert(a: { id: string; cliente: string; celular?: string; dataHora: string; servico: string; observacoes?: string; confirmado?: boolean; criadoEm?: number }) {
      fire("Agendamentos", a.id, "upsert", [
        a.cliente, a.celular ?? "", a.dataHora, a.servico,
        a.observacoes ?? "", a.confirmado ? "Sim" : "Não", fmtDate(a.criadoEm),
      ]);
    },
    remove(id: string) { fire("Agendamentos", id, "delete"); },
  },
};
