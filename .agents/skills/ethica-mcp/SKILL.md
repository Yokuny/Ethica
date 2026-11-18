---
name: ethica-mcp
description: MCPs do harness do Ethica — Context7 (documentação de bibliotecas), shadcn (registry de componentes) e Asaas (documentação e chamadas à API de pagamentos) — e o que dizer ao usuário quando um deles está ausente ou falhando: onde criar a API key e como inseri-la no VS Code (.vscode/mcp.json) e no Claude Code (.mcp.json). Use quando a demanda precisar do Context7 ou do Asaas e as ferramentas do MCP não estiverem presentes, derem 401 ou erro de conexão. Trigger em "context7", "asaas", "mcp", "api key", "chave de API", "401".
---

# MCPs do harness

A regra de quando usar e quando parar está em `AGENTS.md` (Regras gerais). Aqui fica só como orientar o usuário a conectar.

Os servidores estão em `.vscode/mcp.json` (VS Code) e `.mcp.json` (Claude Code). A key nunca fica versionada: no VS Code vem de um prompt (`inputs`, guardado no cofre do VS Code), no Claude Code de uma variável de ambiente.

## Context7

Sem conexão, diga ao usuário para criar a API key em https://context7.com/dashboard?tab=overview&apiKeyAction=create e inseri-la para poder continuar:

- **VS Code**: iniciar o servidor `context7` e colar a key no prompt `context7-api-key`.
- **Claude Code**: `export CONTEXT7_API_KEY=<key>` no `~/.zshrc` e reiniciar a sessão.

## shadcn

Só no Claude Code (`npx shadcn@latest mcp`), sem key. Serve para buscar e adicionar componentes ao `packages/ui` (`packages/ui/components.json`).

## Asaas

Sem o MCP presente, diga ao usuário para criar a chave em https://www.asaas.com/customerApiAccessToken/index (Integrações > Chaves de API; só administrador; a chave aparece uma única vez) e configurá-la para poder continuar:

- **VS Code**: iniciar o servidor `asaas` e colar a chave no prompt `asaas-api-key`.
- **Claude Code**: `export ASAAS_API_KEY='<chave>'` no `~/.zshrc`, com **aspas simples** (a chave começa com `$`), e reiniciar a sessão.

A chave vai no header `access_token`, sem `Bearer`. As ferramentas de documentação (`search`, `search-endpoints`, `get-endpoint`) respondem sem chave; a falta dela aparece como 401 `invalid_access_token` no `execute-request`.

Chave de produção começa com `$aact_prod_` (base `https://api.asaas.com/v3`); de sandbox, com `$aact_hmlg_` (base `https://api-sandbox.asaas.com/v3`). Cada uma só funciona no próprio ambiente.

## Datajud (não é MCP)

A API Pública do Datajud é chamada pela própria API do app (`apps/api/src/providers/datajudClient.ts`), não pelo agente. A chave pública do CNJ vai em `DATAJUD_API_KEY` no `.env` (ver `RUN_BOOK.md`); sem ela a busca responde `datajud_not_configured`.
