---
feature: API num padrão único
slug: api-padrao-unico
descricao: Uma forma por camada no apps/api (router, controller, service, repository, schema, apoio), travada no teste estrutural
data: 2026-11-23
status: concluido
areas: [apps/api, tests, docs]
decisoes: [AD-284]
spec: [.specs/features/api-padrao-unico]
---

# API num padrão único

**Status**: concluido · **Atualizado**: 2026-11-23 · **Áreas**: `apps/api`, `tests`, `docs`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='api-padrao-unico'`.

## O que foi feito

- Análise da arquitetura da API com seis skills de análise (tamanho, lógica repetida, achatamento, acoplamento, domínios e roteiro), instaladas em `.claude/skills/`; resultado e decisões no plano arquivado.
- **Controller**: função exportada sem `try/catch` (o Express 5 encaminha a rejeição ao `errorHandler`); quem precisa de provider o recebe antes. Saíram os wrappers `json`/`removed`/`handler` e as fábricas de controller.
- **Erro**: "não encontrado" é `CustomError('not_found', 404)` lançado no service. Saíram as nove classes `XNotFoundError` e os seis `notFoundAs404`. Única exceção: o 409 da vistoria offline (`InspectionConflictError`, AD-128).
- **Convite** numa entidade só (`invite`): emitir, consultar e aceitar; `tenantInvite` deixou de existir e `platform` só provisiona o escritório. Routers sempre `createXRouter`.
- **Camadas**: só repository importa model (`auth.deps.ts` passa pelo `auth.repository`); repository não importa outro repository (`user.avatar.ts`); texto de PDF em `apps/api/src/providers/pdf-text.ts`; `push` ganhou service; `isMember` no lugar das quatro cópias de `canOperate`.
- **Nomes** em kebab-case em todo o `apps/api/src`.
- Documentação: tabela do padrão e grafo real em `apps/api/CLAUDE.md`; `apps/worker` e `packages/mail` no mapa do `AGENTS.md`.

## Por que

Pedido do usuário (2026-11-23): devolver o back-end a um padrão único de arquitetura. Decisões D1–D7 do plano aceitas como recomendadas. Não reintroduzir variante sem ler a AD-284.

## Como

- Padrão: `apps/api/CLAUDE.md`, seção "Padrão único das camadas".
- Trava: `tests/structural/module-boundary.structural.test.ts`, regras (f) a (j), cada uma com self-check por fixture.

## Como testar

```
pnpm vitest run --project structural tests/structural/module-boundary
pnpm run check
```

- Os e2e de cada módulo que esperam 404 (outro escritório, id inexistente) cobrem a troca do erro.

## Pendências

- Nenhuma. Fora do escopo por decisão: `apps/worker`, dividir arquivo grande por tamanho (`report.service.ts`, `import.service.ts`) e nomes de arquivo de `packages/contracts` e `apps/web`.

## Histórico

- 2026-11-23 — Validação local depois da entrega, com API e web no ar e login real (código no log da API e passkey num autenticador virtual do Chrome): como admin, 75 de 78 operações de criar, editar e excluir certas (as 3 restantes eram erro do roteiro: e-mail com acento recusado e parte sem rota de exclusão, por desenho); operador restrito barrado em 37 de 37 ações proibidas, sem conseguir se dar permissão; segundo escritório sem acesso aos dados do primeiro (17 tentativas, todas 404); injeção NoSQL, atribuição em massa, datas e valores impossíveis, JSON quebrado, corpo de 3 MB, XSS, CORS e enumeração de e-mail sem falha. Achados corrigidos (AD-285): honorário visível e gravável sem o Financeiro, e rota inexistente respondendo HTML com `X-Powered-By`. Também: o campo nome do convite começa vazio (aviso de componente controlado no console).
- 2026-11-23 — Entrega em sete commits (AD-284). Divergências do design: o convite de membro tem router próprio (`createTeamInviteRouter`, prefixo `/tenant`) em vez de montar o mesmo router em dois prefixos; o feed do calendário passou a lançar o 404 no service; `isManager`/`isOperator`, sem uso, deram lugar a `isMember`; o arquivo de apoio pode chamar função pura de service de outro módulo (`report.process.ts` usa `parseData` do `case`). Mudança visível: "não encontrado" de outro módulo que o controller não mapeava passa de 500 para 404.

## Referências

- Spec, design, tasks e plano de análise (congelados): `.specs/features/api-padrao-unico/`
