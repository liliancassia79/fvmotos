import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, Phone, Wrench, CheckCircle2, Loader2, CalendarDays } from "lucide-react";

// Cole aqui a URL do seu Google Apps Script depois de publicado
const URL_PLANILHA =
  "https://script.google.com/macros/s/AKfycbxrEDzXPr4wHEL8g2O7Lagb7UsvuqFVu_LbYKN9pMjOCJ8DrzQ-y9_6z1xxSlwOrJ-w/exec";

interface FormData {
  nome: string;
  whatsapp: string;
  dataAgendamento: string;
  horario: string;
  servico: string;
}

const emptyForm: FormData = {
  nome: "",
  whatsapp: "",
  dataAgendamento: "",
  horario: "",
  servico: "",
};

const servicos = [
  "Troca de óleo",
  "Revisão geral",
  "Troca de pastilha de freio",
  "Troca de pneu",
  "Regulagem de freio",
  "Lavagem completa",
  "Troca de corrente e coroa",
  "Diagnóstico elétrico",
  "Injeção eletrônica",
  "Outro",
];

function mascaraTelefone(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return nums.length ? `(${nums}` : "";
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

export const Route = createFileRoute("/agendar")({
  component: AgendarPage,
  head: () => ({
    meta: [
      { title: "Agendar Serviço · FV Motos" },
      { name: "description", content: "Agende seu serviço na FV Motos de forma rápida e fácil." },
    ],
  }),
});

function AgendarPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === "whatsapp") {
      setForm((prev) => ({ ...prev, [name]: mascaraTelefone(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setSucesso(false);
    setErro(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    if (!form.nome.trim() || !form.whatsapp.trim() || !form.dataAgendamento || !form.horario || !form.servico) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    const whatsappLimpo = form.whatsapp.replace(/\D/g, "");
    if (whatsappLimpo.length < 10) {
      setErro("Informe um número de WhatsApp válido com DDD.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      whatsapp: form.whatsapp,
      dataAgendamento: form.dataAgendamento,
      horario: form.horario,
      servico: form.servico,
    };

    setEnviando(true);
    try {
      const res = await fetch(URL_PLANILHA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${res.statusText}`);
      }

      setSucesso(true);
      setForm(emptyForm);
    } catch (err) {
      setErro((err as Error).message || "Não foi possível enviar o agendamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <CalendarDays className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Agendar Serviço</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha o formulário abaixo e entraremos em contato pelo WhatsApp para confirmar.
          </p>
        </div>

        {/* Card do formulário */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          {sucesso && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-status-ready/10 border border-status-ready/20 p-4">
              <CheckCircle2 className="w-5 h-5 text-status-ready shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-status-ready-foreground">Agendamento realizado com sucesso!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Entraremos em contato pelo WhatsApp para confirmar seu horário.
                </p>
              </div>
            </div>
          )}

          {erro && (
            <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome Completo */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-muted-foreground" />
                Nome Completo
              </Label>
              <Input
                id="nome"
                name="nome"
                type="text"
                placeholder="Digite seu nome completo"
                value={form.nome}
                onChange={handleChange}
                disabled={enviando}
                className="bg-background"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="w-4 h-4 text-muted-foreground" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                placeholder="(11) 99999-0000"
                value={form.whatsapp}
                onChange={handleChange}
                disabled={enviando}
                className="bg-background"
                maxLength={16}
              />
            </div>

            {/* Data + Horário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="dataAgendamento" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Data do Agendamento
                </Label>
                <Input
                  id="dataAgendamento"
                  name="dataAgendamento"
                  type="date"
                  value={form.dataAgendamento}
                  onChange={handleChange}
                  disabled={enviando}
                  className="bg-background"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Horário
                </Label>
                <Input
                  id="horario"
                  name="horario"
                  type="time"
                  value={form.horario}
                  onChange={handleChange}
                  disabled={enviando}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Tipo de Serviço */}
            <div className="space-y-2">
              <Label htmlFor="servico" className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="w-4 h-4 text-muted-foreground" />
                Tipo de Serviço
              </Label>
              <select
                id="servico"
                name="servico"
                value={form.servico}
                onChange={handleChange}
                disabled={enviando}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Selecione o serviço...</option>
                {servicos.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão */}
            <Button type="submit" disabled={enviando} className="w-full h-11 text-sm font-semibold">
              {enviando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                "Confirmar Agendamento"
              )}
            </Button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-muted-foreground">FV Motos · Oficina de Motocicletas</p>
      </div>
    </div>
  );
}
