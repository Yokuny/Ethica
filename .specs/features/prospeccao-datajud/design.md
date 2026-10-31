# Busca de processos no Datajud — Design

## Context

AD-105 já define o provider server-side, chave de ambiente, rate limit, busca sob demanda e persistência somente por seleção. A implementação atual oferece termo e nome do órgão julgador, mas não os critérios numéricos presentes nos exemplos do CNJ. A página de oportunidades já lista e administra resultados salvos.

## Design

- Acrescentar filtros opcionais a `DatajudSearch`: `numeroProcesso`, `classeCodigo` e `orgaoJulgadorCodigo`.
- Normalizar o número CNJ para dígitos e aceitar somente 20 dígitos quando preenchido.
- Montar os filtros como cláusulas `match` dentro do `bool.must` existente. Os filtros textuais atuais permanecem disponíveis e são combinados por AND.
- Nos tribunais TRT, mostrar um multi-select de assuntos processuais (`assuntos.nome`) com Insalubridade, Periculosidade e Acidente de trabalho selecionados por padrão. Os termos selecionados ficam em um `bool.should` com `minimum_should_match: 1`; o grupo integra o `bool.must` junto dos outros filtros. Em tribunais não trabalhistas, o filtro não aparece nem é enviado.
- Descrever na tela o campo Datajud consultado por cada tipo de filtro e a lógica AND/OR da combinação.
- Manter `@timestamp` e `search_after`; o hook continua enviando o mesmo objeto de filtros junto ao cursor.
- Permitir até 30 segundos para a resposta do Datajud: a chamada real ao TJDFT levou mais de 15 segundos e o limite anterior a convertia em indisponibilidade.
- Acrescentar os três campos ao formulário existente de busca. A página de oportunidades não precisa de uma segunda chamada ao Datajud: ela já apresenta os registros explicitamente salvos, com link para a busca.
- Ao salvar, enviar apenas os campos permitidos pelo contrato de oportunidade; metadados auxiliares retornados pela API do Datajud não fazem parte do payload persistido.

## Components

| Component | Responsibility |
| --- | --- |
| `packages/contracts/src/schemas/prospeccao.schema.ts` | Validar os novos filtros compartilhados e a lista de assuntos técnicos. |
| `apps/api/src/providers/datajudClient.ts` | Traduzir filtros para Query DSL e normalizar o número CNJ. |
| `apps/web/src/routes/_private/prospeccao/busca/` | Expor os filtros na tela e manter seus valores nas chamadas paginadas. |
| `apps/web/src/routes/_private/prospeccao/oportunidades/` | Continuar exibindo somente oportunidades salvas, prontas para análise/conversão. |

## Data Flow

```text
BuscaForm → DatajudSearch contract → POST /prospeccao/datajud/search
          → provider (tribunal + filtros + search_after) → resultados
          → seleção explícita → Oportunidade → página oportunidades
```

## Failure Handling

Validação inválida segue a validação existente da API. Ausência de chave, indisponibilidade, duplicidade, autorização e rate limit mantêm os comportamentos existentes (AD-105).

## Constraints

- A chave Datajud permanece exclusivamente no ambiente do servidor.
- Resultados de busca não são persistidos automaticamente.
- Query DSL usa apenas endpoints `/api_publica_<tribunal>/_search`.
