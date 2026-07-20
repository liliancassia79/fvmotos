# fvmotos

Aplicação web para gestão da **FV Motos**, focada em operação comercial e administrativa (cadastro, vendas, atendimento e controle interno).

---

## 📌 Sobre o projeto

O fvmotos é uma interface frontend escrita em TypeScript/React que consome serviços (ex.: Supabase) para gerenciar os fluxos da loja. O repositório contém a aplicação cliente (Vite) e integrações/SQL em `supabase/`.

- Produção: https://fvmotos.vercel.app

### Stack
- Language(s): TypeScript (+ PL/pgSQL para scripts DB)
- Runtime / bundler: Vite (build) + React
- Notable libraries: @tanstack/react-query, @tanstack/react-router, @supabase/supabase-js, tailwindcss, zod

## 🧱 Estrutura do repositório

```text
fvmotos/
├─ src/            # código fonte (UI, rotas, inicialização)
├─ public/         # assets públicos
├─ supabase/       # scripts SQL / funções relacionadas ao Supabase
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ LICENSE         # licença do projeto (MIT)
└─ README.md
```

## ⚙️ Pré-requisitos

- Node.js (LTS recomendado)
- npm (ou outro gerenciador: pnpm/bun — escolha um e documente)
- Banco PostgreSQL (se executar integrações locais com Supabase)

## ▶️ Como executar localmente

```bash
# clonar
git clone https://github.com/liliancassia79/fvmotos.git
cd fvmotos

# instalar dependências (npm)
npm install

# rodar em desenvolvimento
npm run dev

# build e preview
npm run build
npm run preview
```

Observação: o `package.json` deste projeto fornece os scripts `dev`, `build`, `build:dev` e `preview` (use `npm run preview` para servir o build localmente). Não há scripts `test` ou `start` configurados por padrão — adicione-os se precisar de cobertura de testes ou de um servidor de produção diferente.

## 🔐 Variáveis de ambiente

Não versionar segredos. Crie um arquivo `.env` localmente ou configure variáveis no provedor de deploy (Vercel). Exemplo de `.env.example` mínimo:

```env
NODE_ENV=development
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<public-key>
DATABASE_URL=postgresql://usuario:senha@localhost:5432/fvmotos
```

Se houver chaves comprometidas no repositório, rotacione-as imediatamente (Supabase / Vercel) e remova os valores do histórico do Git.

## 🔧 Melhores práticas e observações

- Remover `.env` do histórico e adicionar `.env` ao `.gitignore`.
- Consolidar o gerenciador de pacotes (há `package-lock.json` e arquivos relacionados ao Bun no repositório atualmente).
- Considere adicionar CI (lint/build/test) e dependabot para segurança de dependências.

## 🤝 Contribuição

1. Abra uma branch com o prefixo `feature/` ou `fix/`.
2. Faça commits pequenos e descritivos.
3. Abra um Pull Request descrevendo a motivação.

## 📝 Licença

O código-fonte está licenciado sob a licença MIT — veja o arquivo `LICENSE` para o texto completo.

---

Feito com 💙 para a **FV Motos**.
