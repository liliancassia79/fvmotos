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

Este projeto está licenciado sob a licença MIT.

```text
MIT License

Copyright (c) 2026 liliancassia79

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

Feito com 💙 para a **FV Motos**.
