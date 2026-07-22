## Diagnóstico

O botão "Enviar via WhatsApp" na aba Orçamentos não abre o WhatsApp no celular (e às vezes nem no desktop) por causa de um problema clássico de **popup bloqueado**.

No arquivo `src/components/dashboard/OrcamentosTab.tsx`, a função `enviarWhats` faz:

```ts
async function enviarWhats(o) {
  if (!o.celular) { alert("Cliente sem celular"); return; }
  await setStatus(o.id, "enviado");          // ← espera o Firestore responder
  window.open(whatsappLink(...), "_blank");  // ← só abre DEPOIS do await
}
```

Quando existe um `await` antes do `window.open`, o navegador perde o vínculo com o clique do usuário. Resultado:
- **Celular (Chrome/Safari)**: bloqueia a abertura silenciosamente — nada acontece.
- **Desktop**: às vezes mostra aviso de pop-up bloqueado.

Como a gravação no Firestore pode demorar (rede móvel fraca, offline), o clique "expira" antes do `window.open` rodar.

O mesmo padrão existe no envio de OS via WhatsApp (verificar `src/routes/index.tsx` `OSView`) e pode ter o mesmo defeito — vou revisar junto.

## Correção proposta

1. **`src/components/dashboard/OrcamentosTab.tsx`** — reordenar `enviarWhats`:
   - Abrir o `window.open` **imediatamente** (mesmo tick do clique), enquanto o gesto ainda é válido.
   - Chamar `setStatus(o.id, "enviado")` depois, sem `await` bloqueando (fire-and-forget com `.catch` para log).
   - Validar o celular antes: se ficar sem dígitos após limpar, avisar "Celular inválido" em vez de gerar um link `https://wa.me/?text=...` que o WhatsApp rejeita.

2. **`src/lib/os-storage.ts`** — endurecer `whatsappLink`:
   - Se `digits` estiver vazio, retornar string vazia (para o caller detectar e avisar).
   - Manter regex que remove o `+` e caracteres não numéricos.

3. **Revisar `src/routes/index.tsx`** (envio da OS pelo WhatsApp) e aplicar o mesmo padrão se estiver com `await` antes do `window.open`.

4. **Teste manual** no preview:
   - Criar orçamento com celular válido → clicar Enviar → confirmar que abre `wa.me/55...` numa nova aba com a mensagem.
   - Testar sem celular → deve mostrar "Cliente sem celular".
   - Testar com celular só com dígitos inválidos (ex.: `abc`) → deve mostrar "Celular inválido".

## Fora do escopo

- Não altero a mensagem gerada por `orcamentoMensagem`, layout da aba, nem a lógica de sincronização com a planilha.
