# Padronização de nomes em inglês — Design

**Spec**: `.specs/features/english-naming/spec.md` · **Decisões**: AD-139 (alcance), AD-140 (glossário), AD-141 (banco), AD-142 (entrega).

## Abordagem

Renomear à mão ~1.500 identificadores, ~650 strings de código e ~240 arquivos seria lento e
inconsistente. A renomeação foi feita por um **codemod descartável** (fora do repo) sobre a AST
do TypeScript, guiado por um dicionário PT → EN, e revisada por `tsc`, Biome, testes e UAT.

1. **Identificadores** (`Identifier` da AST): cada nome é quebrado em palavras (camelCase,
   PascalCase, `UPPER_SNAKE`, `snake_case`, `kebab-case`), traduzido por frase (mais longa
   primeiro) e por palavra, e remontado no mesmo estilo. Adjetivo depois de substantivo em
   português troca de lugar (`prazosPendentes` → `pendingDeadlines`); `de/da/do` entre dois
   substantivos inverte a ordem (`linhasDaTabela` → `tableRows`).
2. **Strings**: só as que são nome de código — caminho de import, caminho de campo do Mongo
   (`'$parcelas.valorCents'`), lista de campos de `.select()`/`.populate()`, nome de evento
   (`'pericia:deleted'`), nome de model/ref, chave de query, parâmetro de URL. Texto de tela,
   e-mail, iCal, PDF/Word, e-mails de teste, marcadores `[...]` e arquivos com texto para o
   usuário (`documents.templates.ts`, `document.layout.ts`, `report.library.ts`,
   `report.templates.ts`, `feed.service.ts`, `deadlineReminder.service.ts`, `providers/mail/`,
   `documents.service.ts`, `translate.helper.ts`) ficam como estão.
3. **Arquivos e pastas**: cada segmento do caminho passa pela mesma tradução (`git mv`), então
   import e arquivo sempre batem.
4. **Fatias** (AD-142): cada nome é traduzido inteiro, de uma vez, na fatia do primeiro termo de
   domínio que contém (perícia → agenda → financeiro → laudos/documentos → prospecção →
   identity → termos comuns). Cada fatia compila e passa nos testes sozinha.
5. **À mão**: `data` → `date` nas movimentações e parcelas e `local` → `location` no
   compromisso e nas funções da vistoria (as duas palavras também são inglês e não podiam ir
   ao dicionário); colisões de nome apontadas pelo `tsc`; e os comentários (fatia 8), traduzidos
   bloco a bloco.

## Glossário (AD-140)

Convenções: data de calendário `YYYY-MM-DD` com sufixo `Date`, instante com `At`, dinheiro com
`Cents`; campo-ref maiúsculo com o nome do model. Valores gravados (AD-113) e rotas (AD-138)
não mudam.

| Português | Código | Exemplos |
| --- | --- | --- |
| perícia | `Case`; variável isolada `legalCase` (`case` é palavra reservada) | model `Case`, módulo `apps/api/src/modules/case/`, `caseId`, `CASE_STATUS`, `caseKeys` |
| número do processo | `processNumber` | |
| justiça · tribunal · vara · comarca | `courtType` · `court` · `division` · `district` | |
| papel na perícia · objeto · polo | `role` · `subject` · `side` | `plaintiff`/`defendant` |
| etapa · fase · situação | `status` · `phase` · `state` | `?state=` |
| nomeação · autuação · ajuizamento | `nominationDate` · `docketingDate` · `filingDate` | |
| admissão · demissão · função do reclamante · período imprescrito | `hireDate` · `terminationDate` · `claimantJob` · `nonPrescribedPeriodStart/End` | |
| local da perícia / do compromisso | `location` | |
| contratante | `client` | `parties[].client` |
| parte · advogado | `Party` · `lawyer` | `partyId` |
| prazo | `Deadline` | `dueDate`, `filedDate`, `reportDeadline` |
| movimentação | `movement` | `movements[].date` |
| compromisso | `Appointment` | módulo `agenda` |
| vistoria (registro) | `Inspection` | `attendees`, `comparators`, `jobs`, `agents[].present`, `ppe`, `capacity`, `media`, `caption`, `signature`, `version`, `data` |
| aviso de agendamento · aviso de prazo | `scheduleNotice` · `deadlineReminder` | `deadlineReminderEmail` |
| lançamento | `Transaction` | módulo `finance`, `kind`, `category`, `amountCents`, `settledDate` |
| parcela · recebimento | `installment` · `receipt` | `installments[].date` |
| honorário | `fee` | `proposedFeesCents`, `fixedFeesCents`, evento `case:fixed_fees` |
| laudo · parecer técnico | `Report` · `technical_opinion` | módulo `documents`, `REPORT_VARIABLES` |
| modelo de laudo · seção · nível | `Template` · `section` · `level` | `titleOnly`, `pageBreak`, `yesText`/`noText` |
| documentos · relatório financeiro | `documents` · `FinanceReport` | |
| oportunidade · prospecção | `Opportunity` · `prospecting` | `caseClass`, `subjects`, `courtUnit`, `lastMovement` |
| diário de bordo · atividade | `activity log` · `Activity` | `module`, `action`, `resource`, `recordId`, `label` |
| permissões | `permissions` | `hasPermission()` no contrato |
| cabeçalho · rodapé | `header` · `footer` | |
| blocos ocultos · registro profissional · formação | `hiddenBlocks` · `professionalRegistration` · `education` | |
| perícia parada | `stalled` | `listStalled`; no mapa do campo, parada = `stop` |
| observações · título · nome · tipo · descrição | `notes` · `title` · `name` · `type` · `description` | |

## Fica em português (AD-139)

- Texto de tela pelo `t()`; e-mail, iCal, PDF e Word montados no servidor.
- Marcadores do laudo e dos documentos (`[NUMERO_PROCESSO]`, `[NOME_PERITO]`…).
- Colunas e nomes de arquivo dos CSVs de importação e exportação (`CSV_IMPORT_COLUMNS`,
  `pericias.csv`); no código, a coluna é ligada ao campo inglês (`['vara', 'division']`).
- Campos da resposta do Datajud (`numeroProcesso`, `classe`, `assuntos`, `orgaoJulgador`,
  `movimentos`, `dataHora`) em `apps/api/src/providers/datajudClient.ts`, que traduz para o tipo
  `DatajudProcess` do Ethica.
- Valores que o usuário digita e o código reconhece (`perito`/`assistente` no CSV).

## Chaves do dicionário

As chaves já eram inglês (AD-113). As que ainda tinham termo em português seguiram o glossário
junto com quem as usa; duas colisões resolvidas: `tribunal` virou `court` e o antigo `court`
("Juízo") virou `court_header`; chaves duplicadas de mesmo texto (`campo`/`field`,
`vistoria`/`inspection`, `laudos`/`reports`) ficaram uma só.
