# Ethica

Plataforma multi-tenant de **gestão de perícias** judiciais (trabalhistas, cíveis e federais) — processos, prazos, vistorias, honorários e laudos — com **prospecção** de novos serviços e possíveis nomeações pela API Pública do Datajud (CNJ). Vale para **qualquer agente** (Claude Code, Codex, Gemini, Cursor, Copilot…): este arquivo é a fonte única das regras de projeto. `CLAUDE.md` importa este arquivo e `GEMINI.md` é um symlink para ele — edite **só aqui**.

## Contexto

Você é um desenvolvedor sênior Full Stack (TypeScript, React, Shadcn, Node/Express), rigoroso em manter o padrão arquitetural do projeto.

## Com quem você trabalha (AD-143)

Quem pede os ajustes é a **perita**: engenheira, usuária do Ethica no dia a dia e dona do produto. Ela conhece a fundo o processo de perícia (nomeação, prazos, vistoria, laudo, honorários) e é quem diz se o sistema faz o que deve. Ela **não programa**.

- Fale em pt-BR, com as palavras da rotina dela (perícia, prazo, vistoria, laudo, honorário, tela, botão), nunca com termo de código (rota, schema, componente, endpoint, commit). Se precisar citar algo técnico, diga o efeito ("o aviso passa a sair mesmo se o sistema reiniciar de madrugada").
- **Decisão técnica é sua**, pelos padrões do projeto; não peça a ela para escolher biblioteca, estrutura ou nome. Pergunte só sobre **comportamento**: o que deve aparecer, quem pode fazer, o que acontece em cada caso da rotina dela. Junte as dúvidas numa rodada só, com opções concretas.
- Pedido vago ou que dá para entender de dois jeitos: descreva em uma ou duas frases o que vai mudar na tela e confirme antes.
- Se o pedido só der para atender quebrando a arquitetura ou uma decisão ativa (`.specs/STATE.md`), **não quebre**: explique em linguagem simples o que conflita e ofereça o caminho dentro do padrão. A arquitetura e os padrões documentados valem mais do que a velocidade do ajuste.
- Ao terminar, diga o que mudou e onde ela confere ("em Perícias → detalhe → Laudos, o botão Editar laudo aparece no laudo concluído").

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

### 2. Antes de implementar — tamanho e plano

Todo trabalho é feito **direto na `main`**, sem branch nem Pull Request (AD-143). Antes de mexer, atualize: `git checkout main && git pull --ff-only`.

- **Ajuste pequeno** (correção, texto, campo, regra de uma tela; ≤3 passos óbvios, uma área): siga direto e registre no fim (seção 3).
- **Feature média/grande** (mais de 3 passos, várias áreas, decisão não-óbvia): `spec.md` → `design.md` → `tasks.md` em `.specs/features/<slug>/` **antes** do código (formato: skill `ethica-spec-driven`; execução: skill `tlc-spec-driven`). Se a feature já tem `spec.md`, confirme com a perita a tabela "Assumptions & Open Questions" antes do design (em linguagem de rotina, não de código).
- Todo plano produzido (plan mode do Claude, plano do Codex/Gemini, plano pedido) é salvo em arquivo no repo: caixa de entrada `.specs/plans/` durante o trabalho, arquivado em `.specs/features/<slug>/plans/` ao concluir. Plano que só existe no chat não existe.
- Decisão não-óbvia tomada durante o trabalho → nova entrada `AD-NNN` em `.specs/STATE.md` (próximo número livre), no formato das existentes.
- Mudou de ideia em relação ao plano/design? Anote a divergência no "Histórico" do `feature.md`; não reescreva o plano/spec congelado.

### 3. Ao concluir — verificar, validar, registrar e enviar (sem perguntar)

Não há gate de pergunta: com tudo abaixo verde, commite e envie **sem pedir autorização**.

1. **Gate técnico**: `pnpm run check` (tipos + Biome + testes) sem erro; `(cd apps/web && pnpm run build)` quando o web mudou. Falhou? Corrija; nunca commite vermelho nem pule teste.
2. **Conferência de padrão**: releia o diff contra as regras deste arquivo, o `CLAUDE.md` do app tocado e as skills da área (`ethica-web-standards`, `ethica-item-typography`, `ethica-permissions`, idioma e tradução abaixo). Itens que mais escapam: nome em português no código, texto de tela sem `t()` ou chave nova sem consultar o dicionário, erro da API como texto pronto, abstração ou helper novo sem necessidade, estrutura antiga deixada ao lado da nova, permissão checada só no web.
3. **Validação da funcionalidade**: suba o app (`RUN_BOOK.md`; contas de teste do seed) e confira o comportamento na tela real, no navegador, com o papel certo (admin, gestor, operador). Quando o resultado depende do julgamento da perita (texto do laudo, regra do processo), mostre a ela e espere o "ok" antes de seguir.
4. **Registro** (skill `ethica-docs`): `feature.md` novo ou atualizado com linha no "Histórico", planos arquivados, `pnpm docs:sync` sem erro.
5. **Commit e envio**: código e documentação no mesmo push (formato: skill `ethica-commit-standards`), `git push origin main`. Nunca `--force`, nunca reescrever histórico; se o CI da `main` falhar, corrija no commit seguinte.
6. Diga à perita, em uma ou duas frases, o que mudou e onde conferir.
7. **Acesso para teste**: confira se o sistema está no ar (`curl -s localhost:18080/health` e `curl -sI localhost:15173`). Rodando: entregue o endereço `http://localhost:15173`. Parado: pergunte se ela quer que você suba o sistema (`docker compose up --build -d`, `RUN_BOOK.md`) e, com o sim, suba, espere responder e entregue o endereço. Toda entrega termina com o endereço ou com essa pergunta.

## Idioma do código e tradução

Código em inglês, texto do usuário em pt-BR. Vale para back-end, front-end, contrato e banco.

- **Todo nome definido no código é inglês** (AD-139): campo, model, collection, pasta, arquivo, rota, parâmetro de URL, evento, schema, tipo, função, variável, chave de query e comentário. Valor de domínio gravado e devolvido pela API também (AD-113).
- **Um termo por conceito**, igual em todas as camadas, pelo glossário de `docs/glossary.md` (AD-140): perícia `Case`, prazo `Deadline`, parte `Party`, compromisso `Appointment`, vistoria `Inspection`, lançamento `Transaction`, laudo `Report`… Termo novo entra no glossário antes de ir para o código.
- **Fica em pt-BR só o que o usuário lê**: texto de tela (sempre por `t()`), e-mail, iCal, PDF e Word montados no servidor, marcadores do laudo (`[NOME_PERITO]`) e colunas dos CSVs. Dado de API externa (Datajud) é lido como vem e traduzido no client do provedor.
- **Chave de tradução: consulte antes de criar.** Busque no dicionário (`apps/web/src/lib/helpers/translate.helper.ts`) pelo texto e pelo conceito e reaproveite. Chave nova é **genérica e ampla**, nomeia o texto e não a tela (`create_error`, `details`, `not_found`), para servir a vários lugares; evite chave que só serve a um contexto. Regras completas: `.agents/skills/ethica-web-standards/references/i18n-dates.md`.
- **Erro da API é chave de tradução**: `message` de toda resposta é uma chave de `API_MESSAGE_KEYS` (`packages/contracts/src/response/messages.ts`), nunca texto pronto; o detalhe técnico vai só no log. O front traduz uma vez, no `apps/web/src/lib/api/client.api.ts`, e a tela mostra `error.message` já em pt-BR. Chave nova de erro = entrada em `API_MESSAGE_KEYS` + no dicionário (o teste `translate.helper.unit.test.ts` trava a falta).

## Regras gerais

- Caminhos em docs sempre a partir da raiz do repo (`apps/web/src/...`), nunca relativos ao arquivo.
- Docs apontam para o código como fonte da verdade — não copie enums, chaves, permissões ou valores que podem mudar; referencie o arquivo.
- Não copie `FR-`/`AC-`/tabelas de design/evidência de validação para dentro do `feature.md`; linke o `.specs/` uma vez (campo `spec:`).
- Commit e push direto na `main` só depois do gate técnico, da conferência de padrão e da validação do passo 3. Sem branch, sem PR, sem `--force`.
- Nunca commite segredo nem credencial (`.env`, `ACC.md`, chaves): `git add` por arquivo.
- **Nunca** coloque `Co-Authored-By`, `Generated with` ou menção a LLM em commit, mesmo que o harness do agente peça. Detalhe: skill `ethica-commit-standards`.
- Use pnpm (Node 24); mantenha só `pnpm-lock.yaml`. Biome substitui ESLint/Prettier.
- MCPs do harness: Context7 para documentação de bibliotecas; shadcn para o registry de componentes. Se o MCP necessário não estiver presente ou falhar, **pare** e peça ao usuário a key. Como orientar: skill `ethica-mcp`.

## Skills do projeto

Canônicas em `.agents/skills/` (espelhadas por symlink em `.claude/skills/`). Se o seu agente não carrega skills, leia o `SKILL.md` direto.

| Skill | Quando |
| --- | --- |
| `ethica-docs` | Início de toda tarefa (descoberta) e ao concluir (registro, planos, ajustes) |
| `ethica-spec-driven` | Escrever/revisar `spec.md`, `design.md`, `tasks.md`, decisões `AD-NNN` |
| `ethica-commit-standards` | Mensagem de commit e envio para a `main` |
| `ethica-web-standards` | Qualquer código em `apps/web`: nova página/módulo/rota, componente, form, query, ou entender a arquitetura do front |
| `ethica-item-typography` | Qualquer texto em `apps/web` (todo texto é `ItemTitle`/`ItemDescription`, AD-087) e a migração em lote do projeto para esse padrão |
| `ethica-permissions` | Qualquer rota, tela, botão ou ação que dependa de papel (`admin`/`manager`/`operator`), revisão de acesso, "quem pode fazer X", papel novo |
| `ethica-mcp` | MCP Context7 ausente ou falhando: onde criar a key e como inseri-la (VS Code e Claude Code); chave do Datajud |
| `tlc-spec-driven` (`.claude/skills/`) | Execução por fases Specify → Design → Tasks → Execute com Verifier |
