# Laudo automatizado — Tasks

**Design**: `.specs/features/laudos/design.md` · AD-123 a AD-127.

| # | Tarefa | Req | Verificação |
| --- | --- | --- | --- |
| T1 | Contratos: `laudo.schema.ts` (tipos, variáveis, allowlist, numeração, schemas) + mensagens novas | LAU-01..03, 06 | `pnpm vitest run packages/contracts` |
| T2 | Models `ModeloLaudo` e `Laudo` + `syncIndexes`; ownership `documentos` no teste estrutural e no `apps/api/CLAUDE.md` | LAU-01..03 | `tsc`, structural |
| T3 | Services donos: `prazoService.protocolarEntregaDoLaudo`, evento `pericia:deleted` + subscriber `documentos` | LAU-03 | unit/e2e |
| T4 | `laudo.html.ts`, `laudo.variaveis.ts`, `laudo.biblioteca.ts` (deps `sanitize-html`, `htmlparser2`, `docx`) | LAU-01, 05, 06 | unit |
| T5 | Modelos: repository, service, rotas (padrão somente leitura, clonar, seções) | LAU-01, 05 | e2e |
| T6 | Laudos: repository, service (criar, seção, concluir, excluir), rotas | LAU-02, 03, 06 | e2e |
| T7 | Exportação: `laudo.templates.ts` (PDF, `cabecalhoRodape` extraído do layout) e `laudo.docx.ts` | LAU-03 | unit + e2e |
| T8 | Seed: modelo do escritório e laudo em rascunho na demo | — | `seed:demo` |
| T9 | Web: `rich-text-editor`, `query/laudo.ts`, `/laudos` (hub, list, add, details, modelos), painel na perícia, navegação, traduções | LAU-01..03, 06 | `check` + build |
| T10 | Gate: `pnpm run check`, build do web, UAT (admin, gestor, operador; desktop e celular; abrir PDF e Word) | todos | `validation.md` |
