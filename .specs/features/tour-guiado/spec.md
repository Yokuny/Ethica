# Tour guiado — spec

**Data**: 2026-11-18 · **Pedido**: perita ("breve tutorial de uso do sistema para novos usuários apresentando as
principais funcionalidades"; formato escolhido: tour guiado com destaques, conteúdo por papel)

## Problema

O Ethica já tem muitas seções (Serviços, Prazos e Alertas, Agenda, Campo, Laudos, Financeiro, Escritório…). Quem
entra pela primeira vez, depois da passkey e do pagamento, cai no Início sem saber por onde começar nem onde fica
cada parte do trabalho.

## Requisitos

- **TOU-01** No primeiro acesso à área logada, o tour abre sozinho: uma sequência curta de balões, cada um
  destacando um item do menu lateral com título e uma frase do que aquela seção resolve.
- **TOU-02** Os passos seguem as permissões da pessoa (matriz por membro, AD-137): só aparece passo de seção que
  aparece no menu dela. O admin vê também o passo de configurações (escritório e equipe).
- **TOU-03** Cada balão tem Voltar, Próximo (Concluir no último) e Pular, e mostra o andamento ("3 de 8").
- **TOU-04** Concluir ou pular grava que a pessoa já viu o tour; ele não abre de novo sozinho, em nenhum aparelho.
- **TOU-05** "Ver tour" no menu do usuário reabre o tour a qualquer momento.
- **TOU-06** No celular (menu lateral fechado na gaveta), os mesmos passos aparecem em balões centralizados, sem
  destaque.
- **TOU-07** O tour não troca de página: só aponta para o menu, que existe em qualquer tela.

## Passos (texto de tela)

| # | Destaque | Aparece para | Título | Texto |
| --- | --- | --- | --- | --- |
| 1 | — (centro) | todos | Boas-vindas ao Ethica | Em um minuto, veja onde fica cada parte do seu trabalho. Você pode pular e rever depois no seu menu. |
| 2 | Serviços | `expert_cases` | Serviços | Cadastre perícias, assistências e serviços do escritório. Comece pelo PDF da nomeação: o Ethica preenche processo, partes e prazos. |
| 3 | Prazos e Alertas | `expert_cases` | Prazos e Alertas | Todos os prazos dos seus serviços em ordem de urgência, para nenhum passar. |
| 4 | Agenda | `agenda` | Agenda | Vistorias, audiências, prazos e recebimentos num calendário só, que você pode assinar no celular. |
| 5 | Campo | `agenda` | Campo | No celular, a rota do dia e o registro da vistoria com fotos, áudio e assinatura, mesmo sem internet. |
| 6 | Laudos | `expert_reports` | Laudos | Monte o laudo a partir de modelos com os dados do processo e exporte em PDF ou Word. |
| 7 | Financeiro | `finance` | Financeiro | Honorários a receber, recebimentos parciais e despesas de cada serviço. |
| 8 | Grupo Configurações | admin | Seu escritório | Coloque logo e dados profissionais nos documentos e convide a equipe, escolhendo o que cada pessoa pode ver e fazer. |
| 9 | Menu do usuário | todos | Sua conta | Sua conta e seus aparelhos ficam aqui, junto com "Ver tour". Para ir a qualquer tela, use "Ir para" (⌘K). |

Admin vê 9 passos; operador sem financeiro, 7.

## Design (inline)

- **Sem biblioteca nova** (AD-233): o balão é o `Popover` de `packages/ui`, ancorado no item do menu pela prop
  `anchor` do `Positioner` do Base UI (passa a ser exposta por `PopoverContent`). Texto em
  `ItemTitle`/`ItemDescription` (AD-087), botões do `@ethica/ui` e `t()`, tema claro/escuro de graça. O destaque é um
  `div` fixo sobre o retângulo do item (anel + escurecimento ao redor). Como os alvos são só o menu, que não rola com a
  página, não há espera por elemento nem reposicionamento além do `resize`.
- **Alvos**: atributo `data-tour` no item do menu (`NavigationLink`, valor = rota), no grupo Configurações e no menu
  do usuário (`apps/web/src/routes/_private/@components/workspace-navigation.tsx`, `apps/web/src/components/user-menu.tsx`).
  Alvo ausente (gaveta fechada no celular) → balão centralizado sem destaque (TOU-06).
- **Passos**: lista fixa em `apps/web/src/routes/_private/@consts/tour-steps.ts`; o filtro usa
  `useHomePage().sections` (a mesma fonte do menu) e `isAdminSession`, sem mapa papel→passos à parte (TOU-02).
- **Estado**: a preferência `onboardingDismissed` que a API já guarda por pessoa (`GET`/`PATCH /me/preferences`,
  `apps/api/src/modules/identity/preferences.schema.ts`) é a única fonte: `false` → tour aberto; Concluir/Pular →
  `true`; "Ver tour" → `false`. Nenhuma mudança de API, contrato ou banco; só o comentário do schema, que ainda fala
  do guia de primeiros passos antigo.
- **Onde monta**: no shell (`apps/web/src/routes/_private/route.tsx`), para valer em qualquer rota do primeiro
  acesso e não disparar dentro do teste do Início.
- **Usuários existentes**: todos estão com `false`, então veem o tour uma vez depois do deploy.

## Fora do escopo

- Tour dentro das telas (campos do cadastro, editor do laudo), vídeo, checklist de primeiros passos.
- Passos de Partes, Varas, Relatórios, Dashboard e Prospecção (o tour é breve; ficam visíveis no menu).

## Decisões com a perita

| Pergunta | Resposta |
| --- | --- |
| Formato | Tour guiado com destaques |
| Para quem | Por papel (segue as permissões) |
| Lista e texto dos passos | seguir com a lista acima e ajustar depois de testar; reset pelo "Ver tour" |
| Celular sem destaque (balões centralizados) | sim |
| Quem já usa vê o tour uma vez após o deploy | indiferente: o sistema ainda não foi lançado |
