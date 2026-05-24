import { useState, type FormEvent } from "react";
import { useSession, signIn, signUp } from "@/hooks/use-session";
import logo from "@/assets/fv-motos-logo.png";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    );
  }
  if (session) return <>{children}</>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, pass);
        if (error) setMsg(error.message);
      } else {
        const { error } = await signUp(email, pass);
        if (error) setMsg(error.message);
        else setMsg("Conta criada! Verifique seu email para confirmar e depois faça login.");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={logo} alt="FV Motos" className="h-14 w-14 object-contain" />
          <div>
            <h1 className="font-display font-bold text-xl">FV MOTOS</h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Oficina Mecânica</p>
          </div>
        </div>
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold">{mode === "login" ? "Entrar" : "Criar conta"}</h2>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Senha</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {msg && <p className="text-xs text-muted-foreground bg-muted rounded p-2">{msg}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {busy ? "..." : (mode === "login" ? "Entrar" : "Criar conta")}
          </button>
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground">
            {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
