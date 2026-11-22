# Automação Datajud — Context (pagamento no tribunal)

Pedido do usuário em 2026-11-22: "estudar qual é o status que indica apenas a liberação (intenção) de pagamento e o pagamento feito realmente". Fontes: a Tabela Processual Unificada de movimentos do CNJ (`https://dpj.cnj.jus.br/sgt/api/v1.0/movimentos.csv`, baixada em 2026-11-22), boletins de atualização das TPUs e processos reais do Datajud (TRT24 e TRF3, fixtures nesta pasta).

## Dois caminhos de dinheiro no processo

| Caminho | Quando | Movimentos (código TPU) |
| --- | --- | --- |
| **Alvará** (dinheiro já depositado em juízo: depósito da empresa, acordo, honorários depositados) | Justiça do Trabalho e estadual, na maior parte dos honorários periciais pagos pela parte | **12548** "Expedição de alvará de levantamento" (despacho do juiz: **determina** a expedição) → **60** "Expedição de documento" com o complemento `tipo_de_documento` = **73 "Alvará"** (a secretaria **emite** o alvará) |
| **Requisição de pagamento** (quem paga é o poder público: União, INSS, ou a justiça gratuita, em que a União paga o perito) | Justiça Federal e Trabalho com gratuidade | **12165** "Requisição de Pagamento" → **12173** Pequeno Valor (RPV) ou **12166** Precatório → **12175** "Preparada para Envio" → **12176** "Paga" (RPV) ou **12169** "Paga" (precatório); **12177** "Cancelada" |

O boletim das TPUs de 28/04/2025 diz que o 12548 passou a significar "Determinada a expedição do alvará de levantamento" e que a emissão de fato é o 60 com o complemento "alvará".

## Intenção × pagamento

| Estágio | O que o tribunal registra | Movimento | Na automação |
| --- | --- | --- | --- |
| Liberação decidida (intenção) | Juiz determina o alvará / requisita o pagamento | 12548; 12165, 12173, 12166, 12175 | Aviso "Pagamento em andamento no tribunal" (D3) |
| Dinheiro disponível para o beneficiário | Alvará emitido; RPV ou precatório pago (depositado) | 60 + 73; 12176; 12169 | Sugestão "Registrar recebimento" (D3), com valor, data e conta confirmados pela pessoa |
| Dinheiro na conta do perito | — | **nenhum**: o Datajud não registra o saque nem o crédito | só a pessoa confirma |

Isso responde também à pergunta da Fase 0 sobre a União na justiça gratuita: o pagamento aparece como RPV (12165 → 12176 "Paga").

## Cuidados vistos nos dados

- O mesmo dia tem vários alvarás ou "Paga" no mesmo processo (um por beneficiário: reclamante, advogados, perito, INSS). O Datajud não diz de quem é: a sugestão avisa que pode ser de outra parte e é uma por serviço e dia.
- "Paga" costuma vir logo antes de 196 "Extinção da execução" e 246 "Definitivo" (arquivamento): útil para a sugestão de encerramento.
- 12066 é "Cumprimento de Levantamento da Suspensão" (fim da suspensão), não levantamento de dinheiro.
- O complemento 73 "Alvará" é o mesmo no TRT24 e no TRF3; não existe código de "alvará eletrônico automatizado": esse texto é do sistema do tribunal (PJe) e não chega ao Datajud.

## Fixtures

- `trt24-process-alvara.json` — alvarás (60 + 73) em rajada.
- `trf3-requisicao-paga.json` — 12165 "Requisição de Pagamento" e depois 12176 "Paga".
- `trt24-rpv-paga.json` — 12176 "Paga" seguido de extinção da execução e arquivamento.
