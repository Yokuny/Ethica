---
name: ethica-mcp
description: MCPs do harness do Ethica — Context7 (documentação de bibliotecas) e shadcn (registry de componentes) — e o que dizer ao usuário quando um deles está ausente ou falhando: onde criar a API key e como inseri-la no VS Code (.vscode/mcp.json) e no Claude Code (.mcp.json). Use quando a demanda precisar do Context7 e as ferramentas do MCP não estiverem presentes, derem 401 ou erro de conexão. Trigger em "context7", "mcp", "api key", "chave de API", "401".
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

## Datajud (não é MCP)

A API Pública do Datajud é chamada pela própria API do app (`apps/api/src/providers/datajudClient.ts`), não pelo agente. A chave pública do CNJ vai em `DATAJUD_API_KEY` no `.env` (ver `RUN_BOOK.md`); sem ela a busca responde `datajud_not_configured`.
