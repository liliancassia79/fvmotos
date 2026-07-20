## Diagnóstico confirmado

- O app já usa `onSnapshot` nas telas principais, inclusive no Catálogo.
- O problema provável do celular está em dois pontos do código atual:
  1. O Firebase usa `enableIndexedDbPersistence(db, { forceOwnership: true })`. Esse modo pode derrubar/invalidar persistência no celular quando há aba/app instalado aberto, causando falhas de cache/offline.
  2. O Catálogo (`servicos_catalogo`) grava serviços sem `criadoEm`/`atualizadoEm` e sem feedback visual robusto; se a gravação ficar pendente/offline ou falhar, o usuário não vê claramente o estado.
- O preview atual não tem service worker/cache ativo, mas celulares que instalaram versão antiga podem continuar presos em cache até abrir a versão publicada atualizada.

## Plano de correção

1. **Trocar a configuração offline do Firebase**
   - Substituir `getFirestore + enableIndexedDbPersistence(forceOwnership)` pelo padrão moderno com `initializeFirestore` e cache persistente local.
   - Remover `forceOwnership`, porque ele é agressivo demais para uso em celular/PWA.

2. **Padronizar o Catálogo de Serviços**
   - Fazer `catDB.subscribe` ordenar com query estável.
   - Adicionar `criadoEm: serverTimestamp()` e `atualizadoEm: serverTimestamp()` ao criar serviços.
   - Adicionar `atualizadoEm: serverTimestamp()` ao editar preço/categoria/nome.
   - Manter `onSnapshot`, `create`, `update` e `remove` sem quebrar os componentes atuais.

3. **Melhorar feedback da tela de Catálogo**
   - Mostrar mensagem clara quando salvar, atualizar ou remover serviço falhar.
   - Evitar que o usuário ache que salvou quando deu erro.
   - Manter atualização automática pelo `onSnapshot`.

4. **Verificar se ainda há uso de `getDocs/list/reload` nas telas offline**
   - Já encontrei que não há `getDocs` ativo nas telas principais, mas vou manter essa checagem na correção para não reintroduzir busca forçada pela rede.

5. **Publicar/atualizar depois da correção**
   - Para celular, a correção só chega no app instalado/site publicado depois de atualizar a publicação.
   - Quem instalou como app pode precisar fechar e reabrir ou reinstalar se estiver preso em cache antigo.