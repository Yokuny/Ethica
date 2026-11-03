# Rotina do serviço — Specification

**Origem**: pedido da perita em 2026-11-03, depois da entrega de `partes-servico`, olhando um serviço cadastrado pelo PDF do processo em produção.

## Problem Statement

O PDF do processo completo repete o cabeçalho de cada documento e as partes entram várias vezes, com pequenas diferenças de escrita; o detalhe do serviço ainda mostra o bloco "Dados do laudo trabalhista"; o PDF usa a primeira nomeação e preenche o prazo do laudo sozinho. O serviço tem três classificações que se sobrepõem (etapa, fase detalhada e status do serviço). A importação de planilha só aceita o modelo do Ethica. A agenda de varas começa vazia em todo escritório.

## Out of Scope

| Feature | Reason |
| --- | --- |
| IA ou OCR para ler o PDF ou a planilha | AD-114 segue: regras sobre o texto. |
| Conferência da planilha linha a linha | A perita escolheu conferir só as colunas. |
| Varas cíveis e federais na base pronta | O pedido cita os 24 TRTs. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Partes do PDF | As do último cabeçalho do processo (último despacho); sem ele, as do primeiro (petição inicial) | "polos indicados na petição inicial ou no último despacho" | Yes |
| Partes repetidas no detalhe | Mesmo cadastro no mesmo polo aparece uma vez | "aparecendo repetidamente" | Yes |
| Nomeação | Data da última nomeação do texto | Perita | Yes |
| Prazo do laudo | O PDF não preenche; a perita digita | Perita | Yes |
| Status | Lista única de 11 status substitui etapa, fase e status do serviço; dados atuais convertidos | Perita aprovou a lista sugerida | Yes |
| Planilha | Qualquer CSV; tela de conferência das colunas (com ! no que não foi reconhecido); valor ilegível fica em branco; coluna sem campo vai para Observações | Perita | Yes |
| Varas dos TRTs | Base pronta para todo escritório (o escritório edita a sua cópia) | Perita, supersede parte da AD-151 | Yes |
| Nomes | "Diário de bordo" → "Histórico de auditoria"; "Varas" → "Varas e comarcas" | Perita | Yes |

## Requirements

- **RSV-01** Detalhe do serviço sem o grupo "Dados do laudo trabalhista"; partes sem repetição (mesmo cadastro, polo e tipo uma vez).
- **RSV-02** PDF: partes do último cabeçalho (ou do primeiro, sem último completo), nomeação = última data de nomeação, prazo do laudo não preenchido.
- **RSV-03** Status único do serviço: Nomeado – aguardando aceite · Proposta de honorários enviada · Honorários aceitos – aguardando data da perícia · Perícia agendada · Perícia realizada – laudo em elaboração · Laudo entregue · Esclarecimentos / impugnação · Aguardando pagamento · Concluído · Suspenso · Recusado / cancelado. Sai a fase detalhada e o status do serviço antigo; listagem, filtros, gráfico, serviços parados e conclusão do laudo usam o status único.
- **RSV-04** Importar planilha de qualquer modelo: leitura das colunas por nome (sinônimos, sem diferença de maiúscula e acento), separador `;` ou `,`, tela de conferência coluna → campo com ! no que não foi reconhecido; valores ilegíveis ficam em branco e as colunas sem campo (e os valores ilegíveis) vão para Observações.
- **RSV-05** Base de varas dos 24 TRTs (nome, cidade, UF, telefone, e-mail, endereço) carregada em todo escritório novo e nos existentes, sem duplicar o que o escritório já cadastrou.
- **RSV-06** Textos de tela: "Histórico de auditoria" e "Varas e comarcas".

## Design (inline)

- RSV-01: `case-details-view.tsx` perde o grupo `labor`; `case.repository` (leitura) deduplica `parties` por `partyId + side + type`, o que corrige os serviços já gravados.
- RSV-02: `extractParties` agrupa as linhas de rótulo em blocos de cabeçalho (sequência de linhas de polo/advogado) e usa o último bloco com os dois polos (ou o primeiro); a comparação usa `partyNameKey`. `extractNomination` pega todas as frases de nomeação e fica com a data mais recente; `extractDeadline` sai.
- RSV-03: `CASE_STATUS` vira a lista nova; saem `CASE_PHASES*`, `SERVICE_STATUS`, `CASE_STATES`, `caseState`, `phaseFitsInStatus`, `Case.phase`, `Case.serviceStatus` e o filtro `state`. Fechados = concluído e recusado; parados excluem também suspenso. Conversão dos dados antigos na subida da API (`migrateCaseStatus` em `packages/db`, idempotente). Nova AD supersede AD-133 (fase/situação) e o status da AD-158.
- RSV-04: `POST /expert-cases/import/csv/columns` devolve o cabeçalho com o campo sugerido; `POST /expert-cases/import/csv` recebe o arquivo + o mapeamento escolhido (`?mapping=` não: corpo JSON com o texto do arquivo e o mapa). Dicionário de sinônimos em `packages/contracts/src/schemas/import.schema.ts`.
- RSV-05: arquivo de dados `apps/api/src/modules/case/data/trt-court-divisions.json` montado a partir dos sites dos tribunais; `courtDivisionService.seedDefaults(tenantId)` insere o que falta (índice único já impede duplicata); chamado pelo evento de criação do escritório e, para os existentes, na subida da API (idempotente).
