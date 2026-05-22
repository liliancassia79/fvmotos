import { formatBRL, formatDate, statusLabel, type OrdemServico } from "./os-storage";
import { formaPagamentoLabel } from "./pagamento";
import logo from "@/assets/fv-motos-logo.png";

export function osMensagemWhatsapp(it: OrdemServico) {
  const linhas = [
    `*FV Motos · Ordem de Serviço*`,
    ``,
    `Cliente: ${it.cliente}`,
    `Moto: ${it.modelo} — ${it.placa}`,
    ``,
    `Serviço/Defeito:`,
    it.defeito || "—",
    ``,
    it.valor != null ? `*Valor: ${formatBRL(it.valor)}*` : "",
    it.formaPagamento ? `Pagamento: ${formaPagamentoLabel[it.formaPagamento]}` : "",
    `Status: ${statusLabel[it.status]}`,
    ``,
    `Aberta em ${formatDate(it.criadoEm)}`,
  ].filter(Boolean);
  return linhas.join("\n");
}


export function abrirPDFOrdemServico(it: OrdemServico) {
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>O.S. ${it.placa} — ${it.cliente}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#111;margin:0;padding:32px;background:#fff}
  .wrap{max-width:780px;margin:0 auto}
  header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #FBBF24;padding-bottom:16px;margin-bottom:24px}
  header img{width:72px;height:72px;object-fit:contain}
  h1{font-size:22px;margin:0;letter-spacing:-.02em}
  .sub{font-size:11px;letter-spacing:.18em;color:#FBBF24;text-transform:uppercase;font-weight:700;margin-top:4px}
  .meta{margin-left:auto;text-align:right;font-size:12px;color:#555}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin:24px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #eee}
  .row .l{color:#666}
  .box{background:#faf7ec;border:1px solid #f3e7b5;border-radius:8px;padding:14px;font-size:14px;white-space:pre-wrap;line-height:1.55}
  .total{margin-top:24px;background:#111;color:#FBBF24;padding:18px 22px;border-radius:10px;display:flex;justify-content:space-between;align-items:center}
  .total .label{font-size:12px;letter-spacing:.18em;text-transform:uppercase}
  .total .val{font-size:26px;font-weight:800;letter-spacing:-.02em}
  .sign{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px}
  .sign div{border-top:1px solid #333;padding-top:6px;text-align:center;font-size:12px;color:#666}
  footer{margin-top:32px;text-align:center;font-size:11px;color:#999}
  .pill{display:inline-block;background:#FBBF24;color:#111;font-weight:700;font-size:11px;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.08em}
  @media print {body{padding:0} .noprint{display:none}}
  .noprint{position:fixed;top:16px;right:16px;display:flex;gap:8px}
  .noprint button{background:#111;color:#FBBF24;border:0;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer}
</style></head><body>
<div class="noprint">
  <button onclick="window.print()">Imprimir / Salvar PDF</button>
  <button onclick="window.close()" style="background:#eee;color:#111">Fechar</button>
</div>
<div class="wrap">
  <header>
    <img src="${logo}" alt="FV Motos">
    <div>
      <h1>FV MOTOS</h1>
      <div class="sub">Oficina Mecânica</div>
    </div>
    <div class="meta">
      <div><strong>O.S. #${it.id.slice(0, 8).toUpperCase()}</strong></div>
      <div>${formatDate(it.criadoEm)}</div>
      <div style="margin-top:6px"><span class="pill">${statusLabel[it.status]}</span></div>
    </div>
  </header>

  <h2>Cliente</h2>
  <div class="grid">
    <div class="row"><span class="l">Nome</span><span>${escape(it.cliente)}</span></div>
    <div class="row"><span class="l">Celular</span><span>${escape(it.celular || "—")}</span></div>
  </div>

  <h2>Moto</h2>
  <div class="grid">
    <div class="row"><span class="l">Modelo</span><span>${escape(it.modelo)}</span></div>
    <div class="row"><span class="l">Placa</span><span><strong>${escape(it.placa)}</strong></span></div>
  </div>

  <h2>Defeito / Serviços</h2>
  <div class="box">${escape(it.defeito || "—")}</div>

  ${it.observacoes ? `<h2>Observações</h2><div class="box">${escape(it.observacoes)}</div>` : ""}

  <div class="total">
    <span class="label">Valor Total${it.formaPagamento ? ` · ${formaPagamentoLabel[it.formaPagamento]}` : ""}</span>
    <span class="val">${formatBRL(it.valor)}</span>
  </div>


  <div class="sign">
    <div>Cliente</div>
    <div>FV Motos</div>
  </div>

  <footer>FV Motos · Oficina Mecânica — Documento gerado em ${new Date().toLocaleString("pt-BR")}</footer>
</div>
<script>setTimeout(()=>window.print(),350)</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Permita pop-ups para gerar o PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
