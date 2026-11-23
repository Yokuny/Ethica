# Spec — API num padrão único

Origem: `.specs/features/api-padrao-unico/plans/2026-11-23-api-padrao-unico.md` (análise com as skills de arquitetura). Decisões D1–D7 aceitas pelo usuário em 2026-11-23 (AD-284).

## Problem

O `apps/api` segue os módulos contidos da AD-038, mas dentro deles cada camada tem mais de uma forma: quatro jeitos de escrever controller, dois de sinalizar "não encontrado", um router fora do molde, arquivos de apoio sem regra, acesso a model fora do repository e nomes de arquivo em kebab-case e camelCase. Quem chega a um módulo precisa aprender a variante dele.

## Goal

Uma forma por camada em todo o `apps/api`, escrita no `apps/api/CLAUDE.md` e travada no teste estrutural, chegando lá por **remoção** de variantes (sem helper, wrapper ou camada nova). Nenhum comportamento visível muda, exceto um "não encontrado" de outro módulo que hoje cai em 500 e passa a 404.

## Requirements

| ID | Requisito |
| --- | --- |
| APU-01 | Controller é função exportada sem `try/catch`; o que precisa de provider o recebe antes (`(storage) => async (req, res) => …`). Sem fábrica `createXController` nem wrapper de resposta. Exceção única: o 409 da vistoria offline (AD-128), que devolve a versão do servidor |
| APU-02 | "Não encontrado" é `CustomError('<chave>', 404)` lançado no service. Nenhuma classe `XNotFoundError`, nenhum mapeamento no controller |
| APU-03 | Router é sempre `createXRouter(deps)`; um router por prefixo montado no `app.ts` |
| APU-04 | Convite de membro do escritório pertence à entidade `invite` (router, controller e service); `platform` deixa de carregar `inviteTeamMember` |
| APU-05 | Só repository importa model do `@ethica/db` por valor; repository importa só o próprio schema e o `@ethica/db` |
| APU-06 | Arquivo de apoio se chama `<entidade>.<papel>.ts`, tem só funções puras (sem banco, sem HTTP) e é importado só por service, controller ou outro arquivo de apoio do mesmo módulo |
| APU-07 | Extração de texto de PDF vive em `apps/api/src/providers/pdf-text.ts` |
| APU-08 | Todo arquivo de `apps/api/src` em kebab-case |
| APU-09 | Teste estrutural falha se APU-01, 02, 05, 06 ou 08 for quebrado (com self-check por fixture) |
| APU-10 | Documentação viva (`apps/api/CLAUDE.md`, `AGENTS.md`) descreve o padrão e o grafo real |

## Assumptions & Open Questions

| Ponto | Resposta |
| --- | --- |
| Decisões D1–D7 | aceitas com a recomendação (2026-11-23) |
| Mudança visível | só 500 → 404 em "não encontrado" de outro módulo que o controller não mapeava |
| `apps/worker` | fora do escopo |
