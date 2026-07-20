## Plano para fazer o app abrir e funcionar no celular

1. **Remover o que ainda depende do backend antigo**
   - O app foi migrado para Firebase, mas ainda há middleware/imports antigos de autenticação/backend no `src/start.ts`.
   - Vou remover essa dependência para evitar falhas na abertura, principalmente em build/publicação/celular.

2. **Tornar a abertura independente do Google Sheets**
   - Hoje o app roda um `backfillSheets()` automaticamente ao abrir e essa função usa `getDocs`, que força leitura de rede.
   - Em rede móvel fraca ou modo avião isso pode causar erro/instabilidade.
   - Vou tirar esse backfill automático da inicialização e manter a planilha apenas como sincronização em segundo plano quando houver internet.

3. **Corrigir o modo offline real do Firebase**
   - Ajustar as leituras restantes que ainda usam `getDoc/getDocs` depois de salvar/editar para não bloquear o app quando estiver offline.
   - Onde precisar sincronizar planilha, usar os dados locais já disponíveis ou tratar como tarefa de fundo, sem travar salvamento.

4. **Melhorar salvamento de serviços no Catálogo**
   - Garantir que criar/editar/remover serviço no catálogo não dependa da resposta imediata da internet.
   - Exibir erro claro só se o Firebase realmente rejeitar a gravação.
   - Manter atualização automática por `onSnapshot`.

5. **Manter o PWA sem cache antigo agressivo**
   - Conferir que o service worker atual continua como limpeza/kill-switch, sem cachear app antigo.
   - Manter instalação pelo manifesto, mas sem deixar o celular preso numa versão velha.

6. **Verificação final**
   - Testar abertura da tela inicial.
   - Testar criar serviço no Catálogo.
   - Testar comportamento offline/simulado para confirmar que o app não quebra quando a rede cai.