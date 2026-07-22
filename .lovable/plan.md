## Objetivo

1. Reaproveitar clientes cadastrados ao criar Ordens de Serviço e Orçamentos (sem redigitar nome/celular).
2. Corrigir o salvamento das fotos da moto.

---

## 1. Autocomplete de clientes em O.S. e Orçamentos

Hoje `ClientesTab` já salva `nome`, `celular`, `email`, `observacoes` no Firestore via `clientesDB`, mas os formulários de O.S. (`src/routes/index.tsx`) e Orçamento (`src/components/dashboard/OrcamentosTab.tsx`) pedem tudo de novo em campos livres.

**Mudanças (só UI/preenchimento, sem alterar schema):**

- Criar componente `src/components/dashboard/ClientePicker.tsx`:
  - Campo de texto "Cliente" com sugestões (datalist ou lista suspensa filtrada) alimentada por `clientesDB.subscribe`.
  - Ao selecionar um cliente da lista, preenche automaticamente `cliente` (nome) e `celular` no formulário pai via callback `onSelect(cliente)`.
  - Continua permitindo digitar um nome novo (não obriga escolher da lista).
  - Botão discreto "＋ salvar como novo cliente" que aparece quando o nome digitado não existe ainda em `clientesDB`; ao clicar chama `clientesDB.create({nome, celular})` para que da próxima vez apareça na sugestão.

- Integrar o `ClientePicker` em:
  - `src/routes/index.tsx` (form de Nova/Editar O.S.) — substitui os dois `Field` atuais de "Cliente" e "Celular" pelo picker + campo celular sincronizado.
  - `src/components/dashboard/OrcamentosTab.tsx` (form de Novo Orçamento) — mesma substituição.

- Comportamento: ao selecionar um cliente existente, os campos ficam preenchidos e editáveis (permite ajuste pontual sem alterar o cadastro original).

---

## 2. Corrigir salvamento de fotos da moto

Sintomas prováveis identificados em `src/lib/foto-storage.ts` + `src/components/dashboard/FotosUpload.tsx` + `src/routes/index.tsx`:

- Quando o upload ao Firebase Storage falha (regras, rede móvel instável), o código enfileira o arquivo no IndexedDB **mas devolve uma URL `blob:` local** que é salva no Firestore. Ao recarregar o app ou abrir em outro dispositivo, o `blob:` não existe mais e a foto some.
- Após reprocessar a fila (`processQueue`), a URL real do Storage nunca é escrita de volta na O.S. — só o arquivo sobe, o `fotos[]` da O.S. continua com o blob morto.
- Em uma O.S. nova (sem `editingId`), o `onChange` do `FotosUpload` só atualiza estado local; se o usuário sair da tela antes de clicar "Cadastrar O.S." nada é persistido (comportamento esperado, mas hoje não há aviso).

**Correções:**

- Em `src/lib/foto-storage.ts`:
  - Ao enfileirar upload offline, guardar também `osId` e um `placeholderId` (ex.: `pending:<uuid>`) no IndexedDB.
  - `uploadFotoMoto` retorna esse `placeholderId` (não mais `blob:`) e mantém um mapa `placeholderId → objectURL` em memória só para preview durante a sessão.
  - Novo `processQueue` (executado em `online` e no boot): após subir cada arquivo, obter o `downloadURL` real e chamar um callback (registrado pelo `db.ts`) para atualizar a O.S. correspondente trocando `pending:<uuid>` pela URL final via `osDB.update`.
  - Exportar helper `resolveFotoPreview(url)` que devolve o `objectURL` local quando `url` começa com `pending:` (para exibição enquanto sobe).

- Em `src/components/dashboard/FotosUpload.tsx`: usar `resolveFotoPreview` no `<img src>` e marcar visualmente fotos ainda em fila ("enviando…").

- Em `src/routes/index.tsx` (form de O.S.):
  - Ao criar O.S. nova com fotos pendentes, garantir que os placeholders sejam salvos junto no `osDB.create` (o retry depois substitui pela URL real).
  - Ao trocar `tempId` para o `id` real após create, associar as fotos pendentes ao novo id (atualizar registros da fila no IndexedDB).

- Verificar regras do Firebase Storage: se o console mostrar `storage/unauthorized`, avisar no `alert` do `FotosUpload` com mensagem clara ("Configure as regras do Storage para permitir upload") em vez de falhar silencioso.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/ClientePicker.tsx` | novo |
| `src/routes/index.tsx` | usar `ClientePicker` no form de O.S. |
| `src/components/dashboard/OrcamentosTab.tsx` | usar `ClientePicker` no form de orçamento |
| `src/lib/foto-storage.ts` | fila com placeholder + callback de troca da URL final |
| `src/components/dashboard/FotosUpload.tsx` | preview de foto pendente + mensagens de erro claras |
| `src/lib/db.ts` | registrar callback usado pelo `processQueue` para trocar `pending:` pela URL real |

Sem mudança de schema no Firestore. Sem mexer em faturamento, agenda, catálogo, sincronização com planilha.
