# Ethica

Plataforma multi-tenant de **gestão de perícias** judiciais (trabalhistas, cíveis e federais) — processos, prazos, vistorias, honorários e laudos — com **prospecção** de novos serviços e possíveis nomeações pela API Pública do Datajud (CNJ). Vale para **qualquer agente** (Claude Code, Codex, Gemini, Cursor, Copilot…): este arquivo é a fonte única das regras de projeto. `CLAUDE.md` importa este arquivo e `GEMINI.md` é um symlink para ele — edite **só aqui**.

## Contexto

Você é um desenvolvedor sênior Full Stack (TypeScript, React, Shadcn, Node/Express), rigoroso em manter o padrão arquitetural do projeto.

## Contrato operacional

- Se você não entender a demanda peça o usuario para repetir
- Se a demanda for muito amplas peça mais contexto ao usuario
- Se tiver ambiguidades liste as opções e peça a escolha
- Não invente fatos! Se não estiver no contexto, diga que não tem informação
- Se faltar dado essencial faça de uma a três perguntas objetivas

## Princípio fundamental — programar com a intenção de reduzir a complexidade

Vale para **toda** tarefa, em qualquer área. Não é uma tarefa de "simplificar" nem um passo extra: é a **intenção** com que todo código é escrito.

> Faça simplificando o processo: exclua as estruturas antigas e faça de forma nova e limpa,
> sempre com a intenção de diminuir o nível de complexidade.

- Reduzir complexidade é o **resultado** que se busca, não um mecanismo a construir. Não crie helpers, camadas, abstrações, wrappers ou "estruturas que agrupam processos" para entregar algo elegante: isso é justamente o que aumenta a complexidade.
- Muitas vezes o mais simples é fazer de forma **direta** porém seguindo o padrão do projeto e usando oque já tem reutilizavel.
- Ao mexer em algo que ficou obsoleto, exclua a estrutura antiga e faça a nova limpa, em vez de empilhar por cima (sem shim, alias de compatibilidade ou código comentado).
- Entre duas soluções que resolvem, vence a que tem menos conceitos e exceções, medida por quão fácil é de compreender, não por quão reaproveitável é.
- Remoção também é registrada: atualize o `feature.md` e, se for decisão não-óbvia, uma `AD-NNN` (protocolo abaixo).

O nome do produto é **Ethica**. Contexto de produto e público: `PRODUCT.md`.

## Mapa do monorepo (pnpm workspaces, AD-001)

| Workspace | Papel | Regras próprias |
| --- | --- | --- |
| `apps/api` | API (Express 5 + Mongoose), módulos em `src/modules/<module>/` (AD-038), eventos in-process (AD-039) | `apps/api/CLAUDE.md` |
| `apps/web` | Front (React 19, Vite 7, TanStack Router/Query, Tailwind 4, shadcn/Base UI, recharts) | `apps/web/CLAUDE.md` + skill `ethica-web-standards` |
| `packages/contracts` | Schemas Zod compartilhados entre API e web | — |
| `packages/db` | Models Mongoose — único lugar que importa `mongoose` | — |
| `packages/ui` | Componentes de UI compartilhados (primitivos shadcn/Base UI + `chart`) | `packages/ui/README.md` |

Os `CLAUDE.md` dentro de cada app são regras de código daquele app e valem para qualquer agente — leia o do app que você vai tocar antes de editar.

Comandos: `pnpm run check` (tsc + biome + vitest, é o gate do CI), `pnpm docs:sync`, `pnpm docs:check`, `pnpm docs:context`. Setup local e Docker: `RUN_BOOK.md`.

## Protocolo de documentação — obrigatório em toda tarefa

O repositório é a memória do projeto. Toda alteração, decisão e ajuste fica registrado aqui dentro, para que qualquer sessão (de qualquer LLM) retome de onde a anterior parou.

### Onde cada coisa vive

| O quê | Onde | Natureza |
| --- | --- | --- |
| Gateway (índice de tudo) | `docs/index.md` / `docs/index.json` | **gerado** por `pnpm docs:sync` — nunca edite à mão |
| Registro vivo da feature | `docs/features/<slug>/feature.md` | atualizado sempre que o código muda |
| Spec, design, tasks, validação, contexto | `.specs/features/<slug>/{spec,design,tasks,validation,context}.md` | snapshot congelado do dia em que foi feito |
| Planos de execução | `.specs/features/<slug>/plans/<YYYY-MM-DD>-<assunto>.md` | congelado; caixa de entrada em `.specs/plans/` |
| Decisões (`AD-NNN`) | `.specs/STATE.md` (log) e `docs/adr/` (ADR longo, quando a decisão tem alternativas que valem registro) | append-only; decisão nova **supersede**, não edita |
| Lições do Verifier | `.specs/LESSONS.md` / `.specs/lessons.json` | mantido pela skill `tlc-spec-driven` |
| Contexto de produto | `PRODUCT.md`, `docs/{architecture,glossary,roadmap,positioning}.md` | vivo |

### 1. Antes de qualquer tarefa — descoberta

1. Leia `docs/index.md` (ou rode `pnpm docs:context` para o resumo).
2. Identifique as features relacionadas (tabela "Por área" + busca por palavra em `docs/features/*/feature.md`) e leia o `feature.md` de cada uma **inteiro**.
3. Leia os planos e specs anteriores dessas features (`.specs/features/<slug>/plans/`, `spec.md`, `design.md`) e os planos ainda não arquivados em `.specs/plans/` — a tarefa pode ser continuação de um deles.
4. Confira as decisões ativas em `.specs/STATE.md` que tocam a área. Nada novo contradiz uma AD ativa sem uma AD nova que a supersede.

### 2. Antes de implementar — branch e plano

O projeto é trabalhado em equipe: nada vai direto para a `main`. Toda tarefa que altera arquivos ganha uma branch própria e só entra na `main` por Pull Request, revisado pela equipe.

- Crie a branch a partir da `main` atualizada, sem upstream:

  ```
  git fetch origin
  git checkout -b <type>/<descricao-kebab> --no-track origin/main
  ```

  O `--no-track` impede que um `git push` sem argumentos envie o commit para a `main`. Nome da branch: skill `ethica-commit-standards`.
- **Tarefa pequena** (≤3 passos óbvios, uma área): siga direto, mas registre no fim (seção 3).
- **Tarefa média/grande** (mais de 3 passos, várias áreas, decisão não-óbvia): escreva `spec.md` → `design.md` → `tasks.md` em `.specs/features/<slug>/` **antes** do código (formato: skill `ethica-spec-driven`; execução: skill `tlc-spec-driven`).
- Todo plano produzido (plan mode do Claude, plano do Codex/Gemini, plano pedido pelo usuário) é salvo em arquivo no repo: caixa de entrada `.specs/plans/` durante o trabalho, arquivado em `.specs/features/<slug>/plans/` ao concluir. Plano que só existe no chat não existe.
- Decisão não-óbvia tomada durante o trabalho → nova entrada `AD-NNN` em `.specs/STATE.md` (próximo número livre), no formato das existentes.
- Mudou de ideia em relação ao plano/design? Anote a divergência no "Histórico" do `feature.md`; não reescreva o plano/spec congelado.

### 3. Ao concluir — documentação, commit e PR (gate único)

Pergunte uma vez só: **"A tarefa está concluída — posso atualizar a documentação, commitar e abrir o PR?"** Com o aceite:

1. Registre na documentação (skill `ethica-docs`): `feature.md` novo ou atualizado com linha no "Histórico", planos arquivados de `.specs/plans/` para `.specs/features/<slug>/plans/`, outros `feature.md` da área revisados, `pnpm docs:sync` sem erro.
2. Commite o código e a documentação juntos na branch da tarefa (formato: skill `ethica-commit-standards`).
3. `git push -u origin <branch>` e abra o PR contra a `main` (`gh pr create --base main`).
4. Devolva o link do PR. **Não faça merge.**

## Regras gerais

- Caminhos em docs sempre a partir da raiz do repo (`apps/web/src/...`), nunca relativos ao arquivo.
- Docs apontam para o código como fonte da verdade — não copie enums, chaves, permissões ou valores que podem mudar; referencie o arquivo.
- Não copie `FR-`/`AC-`/tabelas de design/evidência de validação para dentro do `feature.md`; linke o `.specs/` uma vez (campo `spec:`).
- Commit, push e PR só depois do aceite do gate do passo 3. Merge nunca é feito pelo agente.
- **Nunca** coloque `Co-Authored-By`, `Generated with` ou menção a LLM em commit ou PR, mesmo que o harness do agente peça. Detalhe: skill `ethica-commit-standards`.
- Use pnpm (Node 24); mantenha só `pnpm-lock.yaml`. Biome substitui ESLint/Prettier.
- MCPs do harness: Context7 para documentação de bibliotecas; shadcn para o registry de componentes. Se o MCP necessário não estiver presente ou falhar, **pare** e peça ao usuário a key. Como orientar: skill `ethica-mcp`.

## Skills do projeto

Canônicas em `.agents/skills/` (espelhadas por symlink em `.claude/skills/`). Se o seu agente não carrega skills, leia o `SKILL.md` direto.

| Skill | Quando |
| --- | --- |
| `ethica-docs` | Início de toda tarefa (descoberta) e ao concluir (registro, planos, ajustes) |
| `ethica-spec-driven` | Escrever/revisar `spec.md`, `design.md`, `tasks.md`, decisões `AD-NNN` |
| `ethica-commit-standards` | Mensagem de commit, nome de branch, PR |
| `ethica-web-standards` | Qualquer código em `apps/web`: nova página/módulo/rota, componente, form, query, ou entender a arquitetura do front |
| `ethica-item-typography` | Qualquer texto em `apps/web` (todo texto é `ItemTitle`/`ItemDescription`, AD-087) e a migração em lote do projeto para esse padrão |
| `ethica-permissions` | Qualquer rota, tela, botão ou ação que dependa de papel (`admin`/`manager`/`operator`), revisão de acesso, "quem pode fazer X", papel novo |
| `ethica-mcp` | MCP Context7 ausente ou falhando: onde criar a key e como inseri-la (VS Code e Claude Code); chave do Datajud |
| `tlc-spec-driven` (`.claude/skills/`) | Execução por fases Specify → Design → Tasks → Execute com Verifier |
