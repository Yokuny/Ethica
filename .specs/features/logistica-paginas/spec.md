# Logística em páginas por intenção e termo de vistoria assinado — Specification

**Origem**: pedido do usuário em 2026-11-20. Prefixo de requisito: `LOG`.

## Problem Statement

A Logística (`/field`) junta numa tela só o mapa, o planejamento da rota (partida, ordem, custo, lugares no trajeto, aviso às partes) e a lista dos compromissos com o resultado e o registro da vistoria, trocados por um seletor Mapa/Lista. O registro da vistoria (`/field/inspection`) só se acha a partir dessa lista. O período é fixo (Dia, Semana, Mês, Ano), sem escolher um intervalo. No registro, as assinaturas ficam soltas em cada presente e não há documento para as partes assinarem.

## Goals

- [ ] Cada intenção da Logística em uma página própria: ver o mapa, planejar a rota, acompanhar os serviços agendados.
- [ ] Intervalo de datas escolhido no calendário, com anterior/próximo, nas três páginas.
- [ ] Termo da vistoria em PDF com tudo o que foi colhido e as assinaturas, com pré-visualização.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Ponto de partida por endereço digitado e rota por OSRM próprio | Já especificado em `rotas-vistoria` (AD-150); a página de rota continua com a localização do aparelho e o OSRM público. |
| Gerar o PDF sem conexão | O PDF é montado no servidor (AD-119); sem conexão o botão fica indisponível. |
| Assinatura digital com certificado (ICP-Brasil) | A assinatura é desenhada na tela, como hoje (AD-129). |

## Já existe (não refazer)

| Item | Onde |
| --- | --- |
| Mapa, paradas, ordem por proximidade, conflito, rota OSRM, custo e lugares | `apps/web/src/routes/_private/field/@components/` |
| Período da API (`from`/`to`, até 366 dias) e cópia no aparelho por período | `apps/api/src/modules/agenda/inspection.*`, `apps/web/src/query/inspection.ts` |
| Registro, assinatura na tela e fila de mídias sem conexão | `apps/web/src/routes/_private/field/inspection/`, `apps/web/src/lib/offline/` |
| Montagem de PDF e pré-visualização | `apps/api/src/modules/documents/document.layout.ts`, `apps/web/src/components/pdf-preview-dialog.tsx` |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que o intervalo mostra | Todos os compromissos do intervalo, em qualquer tamanho (sai a regra "fora do dia, só vistorias" da AD-208) | Uma regra só nas três páginas; o tipo aparece no selo | No |
| Intervalo padrão | Hoje; anterior/próximo andam o tamanho do intervalo | Como o Dia de hoje | No |
| "Detalhes do serviço" na lista | Cada item leva ao registro da vistoria ("Realizar vistoria") e tem link para o serviço (`Case`) | "Serviço" é o `Case` no glossário; a realização é o registro | No |
| Observações internas no PDF | **Ficam fora**: o contrato e a tela dizem que são internas e nunca saem | Um termo assinado pelas partes não pode expor nota interna | No |
| Fotos e áudio no PDF | Fotos com legenda entram; áudio entra só como quantidade | Áudio não se imprime | No |
| Assinatura no PDF | Cada presente com a assinatura colhida ou uma linha em branco para assinar no papel, e a linha do perito | "Campo de assinatura" pedido | No |

## Requirements

### LOG-01 Hub da Logística
WHEN a perita abre `/field` THEN o sistema SHALL mostrar os três destinos: Mapa, Planejamento de rota e Vistorias agendadas.

### LOG-02 Intervalo de datas
WHEN a perita escolhe um intervalo no calendário THEN as páginas SHALL mostrar os compromissos desse intervalo; anterior/próximo SHALL andar o tamanho do intervalo e o botão do meio SHALL voltar para hoje. O intervalo vai na URL (`from`, `to`).

### LOG-03 Mapa
WHEN a perita abre `/field/map` THEN o sistema SHALL mostrar o mapa com as paradas do intervalo e, abaixo, a lista do que está no mapa (data e hora, título, serviço, local, situação). WHEN a página abre com `focus` THEN o mapa SHALL centrar nessa parada.

### LOG-04 Planejamento de rota
WHEN a perita abre `/field/route` THEN o sistema SHALL oferecer partir da localização, localizar endereços, reordenar, ver conflito de horário, a rota pelas ruas, a volta, o aviso às partes, o custo de deslocamento e o apoio no trajeto.

### LOG-05 Vistorias agendadas
WHEN a perita abre `/field/inspections` THEN o sistema SHALL listar os compromissos do intervalo com Google Maps/Waze, o resultado com um toque, "Ver no mapa" (abre `/field/map` no dia com a parada em foco), o link para o serviço e "Realizar vistoria" (abre `/field/inspections/details?id=`).

### LOG-06 Assinaturas na aba Observações
WHEN a perita abre a aba Observações do registro THEN o sistema SHALL listar todos os presentes com o estado da assinatura e colher a de quem falta; a coleta sai da aba Presentes.

### LOG-07 Termo da vistoria em PDF
WHEN a perita pede o PDF THEN o sistema SHALL montar no servidor o termo com o compromisso, o serviço, presentes, paradigmas, funções, agentes, documentos, fotos com legenda e as assinaturas (imagem ou linha em branco), sem as observações internas, e mostrar a pré-visualização com o download. WHEN há alteração ou mídia ainda não enviada ou não há conexão THEN o botão SHALL ficar indisponível com o motivo.
