# fvmotos

Aplicação web para gestão da **FV Motos**, com foco em operação comercial e administrativa.

---

## 📌 Sobre o projeto

O **fvmotos** é um sistema desenvolvido com **TypeScript** para centralizar processos da loja, incluindo cadastro, atendimento e controle interno.

O projeto está publicado em:

- **Produção:** https://fvmotos.vercel.app

## 🚀 Tecnologias

- **TypeScript**
- **PL/pgSQL**
- **Outras linguagens/arquivos de suporte**

## 🧱 Estrutura esperada do projeto

Como referência, a estrutura costuma seguir um padrão como:

```bash
fvmotos/
├─ src/
├─ public/
├─ package.json
├─ tsconfig.json
└─ README.md
```

> Se quiser, posso atualizar esta seção com a estrutura exata dos diretórios/arquivos.

## ⚙️ Pré-requisitos

- Node.js (LTS recomendado)
- npm (ou yarn/pnpm)
- Banco PostgreSQL (se usado localmente)

## ▶️ Como executar localmente

```bash
# clonar
git clone https://github.com/liliancassia79/fvmotos.git

# entrar na pasta
cd fvmotos

# instalar dependências
npm install

# rodar em desenvolvimento
npm run dev
```

## 🧪 Testes

```bash
npm test
```

## 📦 Build

```bash
npm run build
npm start
```

## 🔐 Variáveis de ambiente

Crie um arquivo `.env` com as configurações do projeto, por exemplo:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/fvmotos
```

> Não versionar segredos reais.

## 🤝 Contribuição

1. Crie uma branch para sua feature
2. Faça commits descritivos
3. Abra um Pull Request

## 📝 Licença

Defina aqui a licença do projeto (ex.: MIT).

---

Feito com 💙 para a **FV Motos**.
