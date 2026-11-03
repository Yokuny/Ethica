---
feature: Partes do serviço
slug: partes-servico
descricao: Partes com advogados no serviço, sem repetição, com CREA e contatos do PDF; data da perícia opcional; laudo com qualquer modelo
data: 2026-11-03
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-164, AD-165]
spec: [.specs/features/partes-servico]
branches: [main]
---

# Partes do serviço

**Status**: concluido · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='partes-servico'`.

## O que foi feito

- **Partes no cadastro do serviço**: cada parte (reclamante/reclamada na justiça do trabalho, autor/réu nas outras) com CPF/CNPJ e, dentro dela, "Adicionar advogado" (nome e OAB). Trocar o polo da parte leva os advogados junto.
- Sai o bloco **"Dados do laudo trabalhista"** do cadastro e da edição do serviço; o local da perícia digitado no cadastro vira o local do serviço.
- **Data e hora da perícia** não são mais obrigatórias: em branco, o serviço salva sem compromisso; com data, a hora é pedida.
- **Iniciar laudo pelo serviço**: a lista de modelos mostra todos os cadastrados (laudo e parecer); o documento segue o tipo do modelo escolhido.
- **Seção Partes**: o mesmo nome não se repete (o Ethica reaproveita o cadastro sem diferença de maiúscula, acento ou espaço); botão **"Juntar repetidos"** (admin) junta os antigos; campo **CREA**; a coluna "Registro" mostra CPF/CNPJ, OAB e CREA, e a de contato, e-mail e telefone.
- **PDF do processo** lê CPF/CNPJ, OAB, CREA, e-mail e telefone ao lado do nome e completa o cadastro da parte sem apagar o que já existe.

## Por que

Pedido da perita (2026-11-03). Escolhas dela: advogados dentro da parte que representam, juntar os nomes repetidos num cadastro só, CREA no cadastro e leitura dos contatos pelo PDF. A base de varas dos TRTs ela cadastra depois, pelos sites dos tribunais (AD-151 segue).

Não desfazer sem ler: quem o advogado representa é dado pela **ordem** das partes no serviço (advogado logo depois da parte do mesmo polo), sem campo novo (AD-164); homônimos com documentos diferentes nunca são juntados (AD-164); o tipo do laudo vem do modelo, não mais da atuação (AD-165).

## Como

### `apps/api`

- `apps/api/src/modules/case/party.service.ts` — `resolveParty` acha por documento (CPF/CNPJ, OAB, CREA) e, sem achar, pelo nome normalizado sem documento conflitante; completa os campos que faltam; `mergeDuplicates`. `POST /parties/merge-duplicates` (admin) em `party.router.ts`.
- `apps/api/src/modules/case/case.repository.ts` — `replaceParty` move as perícias do cadastro juntado.
- `apps/api/src/modules/case/import.service.ts` — `contacts` (CREA, e-mail, telefone) na leitura das partes.
- `apps/api/src/modules/case/case.service.ts` — compromisso só com data e hora; `location` da perícia vira o local do serviço.
- `apps/api/src/modules/documents/report.service.ts` — `createReport` aceita qualquer modelo e usa o tipo dele.

### `apps/web`

- `apps/web/src/routes/_private/expert-cases/@components/case-parties-fields.tsx` — partes agrupadas com advogados; `labor-case-fields.tsx` removido.
- `apps/web/src/routes/_private/expert-reports/@components/template-select.tsx` — sem tipo, lista todos os modelos.
- `apps/web/src/routes/_private/parties/` — CREA no formulário, coluna "Registro" e "Juntar repetidos"; `apps/web/src/components/party-labels.ts` (`partyIdentification`).

### `packages`

- `packages/contracts/src/schemas/party.schema.ts` — `creaSchema`, `normalizeCrea`, `partyNameKey`; a parte do serviço aceita `crea`, `email`, `phone`. `case.schema.ts` — `caseInspectionSchema` com data/hora opcionais.
- `packages/db/src/models/party.model.ts` — `crea` e `nameKey` (calculado ao gravar, com índice). Sem migração: "Juntar repetidos" acerta os cadastros antigos.

## Como testar

```
pnpm vitest run apps/api/src/modules/case apps/api/src/modules/documents packages/contracts
pnpm run check && (cd apps/web && pnpm run build)
```

- Serviços → Novo: adicionar parte, "Adicionar advogado", salvar sem data da perícia. Partes → "Juntar repetidos" (admin). Serviço → Laudos → Iniciar laudo → escolher um modelo de qualquer tipo.

## Pendências

- [ ] Conferência visual das telas no navegador (não feita nesta entrega).
- [ ] A leitura de contatos no PDF só olha a mesma linha do nome; contato em linha separada não é lido.
- [ ] Base de varas dos 24 TRTs: a perita cadastra depois (AD-151).

## Histórico

- 2026-11-03 — Implementado PSV-01 a PSV-06 (AD-164, AD-165). Divergência da spec: sem achar pelo documento, a parte também é reaproveitada pelo nome quando o cadastro existente não tem outro documento (antes, documento novo criava outro cadastro).
- 2026-11-03 — Spec criada (`.specs/features/partes-servico/spec.md`).
