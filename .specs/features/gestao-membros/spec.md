# Gestão de membros pelo admin — Specification

**Origem**: pendência de `docs/features/gestao-escritorio/feature.md` ("Trocar papel e desativar membro continuam sem rota, só no banco") e pedido do usuário em 2026-11-01 ("crie o CRUD apenas para o admin"). Prefixo de requisito: `MEM`.

## Problem Statement

O admin do escritório convida membros (`/users/add`), lista a equipe (`/users`) e ajusta a matriz de permissões de cada um (AD-137). Mas não consegue **trocar o perfil** de um membro (Gestor ↔ Operador), **corrigir o nome**, **desativar** quem saiu do escritório nem **reativar** quem voltou: hoje isso só se faz direto no banco. Um ex-funcionário continua com acesso até alguém mexer no Mongo.

## Goals

- [ ] O admin cria, vê, edita, desativa e reativa membros pela tela, sem tocar no banco.
- [ ] Membro desativado perde o acesso na hora, e o histórico dele (diário, responsável por perícias) continua legível.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Excluir membro de vez do banco | O nome aparece no diário de bordo (AD-134) e como responsável; apagar quebraria o histórico. "Remover" é desativar. |
| Mais de um admin ou transferir o admin | Ver pergunta em aberto. |
| Gestor ou operador gerenciando membros | Pedido: só o admin (AD-137 já reserva usuários ao admin). |
| Membro editar o próprio e-mail | E-mail é o login; troca de e-mail tem fluxo próprio de verificação. |

---

## Já existe (não refazer)

| Item | O que já há | Lacuna |
| --- | --- | --- |
| Criar | Convite com perfil e matriz (`/users/add`, `POST /tenant/invites`, `apps/api/src/modules/identity/tenantInvite.*`) | — |
| Listar | `GET /auth/users` e `/users/directory` (só admin); a lista mostra perfil e "inativo" (`apps/web/src/routes/_private/_admin/users/@components/users-list.tsx`) | Ações de editar, desativar e reativar. |
| Permissões | `PATCH /auth/users/:id/permissions` e o diálogo `permissions-dialog.tsx` (AD-137) | — |
| Bloqueio do inativo | `User.active`; a sessão de usuário inativo já é recusada (`invalid_session`, `apps/api/src/middlewares/authentication.middleware.ts`) | Tela e rota para mudar `active`. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Editar | Admin troca nome e perfil (Gestor ↔ Operador); trocar o perfil pergunta se a matriz volta ao preset do perfil novo ou mantém a atual | O perfil só define o preset (AD-137); manter a matriz ajustada evita perder trabalho | No |
| Desativar | "Desativar" com confirmação: `active: false`, encerra as sessões abertas do membro e o tira do aviso diário; nada é apagado (AD-148) | Ex-funcionário perde acesso na hora e o histórico continua | No |
| Reativar | "Reativar" volta `active: true` com o perfil e a matriz que tinha | Quem volta não precisa de convite novo | No |
| Responsável por perícias e compromissos | Membro desativado continua aparecendo como responsável nos registros antigos, com o selo "inativo", e some das listas de escolha de responsável | Reatribuir é decisão da perita, não automática | No |
| O próprio admin | O admin não desativa a si mesmo nem troca o próprio perfil | Evita o escritório sem admin | No |
| Convites pendentes | A lista mostra convites ainda não aceitos com "Cancelar convite" e "Reenviar" | Faz parte do "C" do CRUD; confirmar se é necessário | No |
| Registro | Editar, desativar, reativar e cancelar convite entram no diário de bordo (AD-134) com o nome do membro como rótulo | Resolve também a pendência "entradas de ajuste de permissões sem rótulo legível" | No |

---

## User Stories

### P1: Editar membro ⭐ MVP — MEM-01

**User Story**: Como admin, quero corrigir o nome e trocar o perfil de um membro, para refletir a função dele no escritório.

**Acceptance Criteria**:

1. WHEN o admin abre "Editar" num membro THEN the system SHALL mostrar nome, e-mail (só leitura) e perfil.
2. WHEN o admin troca o perfil THEN the system SHALL perguntar se aplica o preset do perfil novo à matriz ou mantém a atual.
3. WHEN o admin salva THEN the system SHALL gravar e refletir na próxima requisição do membro (permissões resolvidas do banco a cada requisição, AD-137).
4. WHEN quem não é admin chama a rota THEN the system SHALL responder 403.
5. WHEN o admin tenta trocar o próprio perfil THEN the system SHALL recusar.

**Independent Test**: admin troca o operador para gestor aplicando o preset; o membro passa a ver o financeiro.

### P1: Desativar e reativar membro — MEM-02

**User Story**: Como admin, quero tirar o acesso de quem saiu do escritório e devolver se voltar, sem perder o histórico.

**Acceptance Criteria**:

1. WHEN o admin confirma "Desativar" THEN the system SHALL marcar o membro inativo e encerrar as sessões dele imediatamente.
2. WHEN o membro desativado tenta entrar ou usar uma sessão antiga THEN the system SHALL recusar.
3. WHEN o membro está inativo THEN the system SHALL mantê-lo nos registros antigos com o selo "inativo" e fora das listas de escolha de responsável e do aviso diário.
4. WHEN o admin confirma "Reativar" THEN the system SHALL devolver o acesso com o perfil e a matriz que ele tinha.
5. WHEN o admin tenta desativar a si mesmo THEN the system SHALL recusar.

**Independent Test**: desativar o operador do seed com ele logado em outra janela; a próxima ação dele volta ao login; reativar e entrar de novo.

### P2: Convites pendentes — MEM-03

**User Story**: Como admin, quero ver quem foi convidado e ainda não entrou, para cancelar ou reenviar o convite.

**Acceptance Criteria**:

1. WHEN há convite não aceito THEN the system SHALL listá-lo em Usuários com e-mail, perfil e data.
2. WHEN o admin cancela THEN the system SHALL invalidar o link do convite.
3. WHEN o admin reenvia THEN the system SHALL mandar o e-mail de novo com um link válido.

**Independent Test**: convidar, cancelar, abrir o link antigo (inválido); convidar de novo e reenviar.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MEM-01 | P1: Editar membro | Specify | Pending |
| MEM-02 | P1: Desativar e reativar membro | Specify | Pending |
| MEM-03 | P2: Convites pendentes | Specify | Pending |

## Success Criteria

- [ ] Nenhuma mudança de membro precisa de acesso ao banco.
- [ ] Ex-membro desativado perde acesso em segundos e o diário continua mostrando o nome dele.

## Pontos de atenção para o design

- Módulo `identity`; guarda `isAdmin` como as rotas de usuários atuais (skill `ethica-permissions`).
- Encerrar sessões: conferir em `apps/api/src/modules/identity/auth.*` como a sessão é guardada e revogada.
- Telas em `apps/web/src/routes/_private/_admin/users/`, edição por `Dialog` (AD-070), confirmação com `ConfirmDialog` (`apps/web/src/components/confirm-dialog.tsx`).
