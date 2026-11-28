# Tipo e fase do serviço só em enums — Spec

Pedido do usuário (2026-11-27): o filtro pronto "Serviços finalizados" escondia as Parcerias com fase "Finalizado",
porque a fase delas era texto digitado (`phase: 'custom'` + `phaseName`), e o filtro de tipo gerava `role` ou
`serviceType` conforme o tipo. Normalizar agora (MVP, só usuários de teste em produção): tipo e fase só como enums em
inglês, com de/para dos textos gravados, e remover tudo do cadastro personalizado.

## Requisitos

- **SEN-01** `Case.serviceType` é obrigatório e é um destes: `expert_examination` (Perícia), `technical_assistance`
  (Assistência técnica), `partnership` (Parceria), `private_service` (Serviço particular). Sai o "Cadastrar novo"
  (tipo com nome digitado), a lista de tipos do escritório (`GET /cases/service-types`) e o prefixo `name:` do filtro.
- **SEN-02** Saem `role`, `roleName` e `phaseName` do serviço. O que o `role` decidia (laudo ou parecer, sugestões da
  Automação, processos acompanhados, cliente da assistência) passa a ler o `serviceType`.
- **SEN-03** Fase só da lista fixa do tipo: perícia (grupos), assistência (lista própria) e uma lista para Parceria e
  Serviço particular: Contratado, Em andamento, Entregue, Honorários recebidos, Finalizado. Sai a fase `custom`.
- **SEN-04** "Finalizado" é uma fase só, `finished`, a última de todos os tipos, e encerra o serviço
  (`CASE_CLOSED_PHASES`); `assistance_closed` vira `finished` e `assistance_hired` vira `hired` (Contratado), comum
  à assistência e aos tipos próprios.
- **SEN-05** Na subida da API, o serviço gravado do jeito antigo é convertido: tipo pelo `role`/nome; fase digitada
  pelo texto (Finalizado/Concluído/Encerrado → `finished`, Entregue → `delivered`, Contratado → `hired`, Honorários
  recebidos/Pago → `fees_received`, outro → `in_progress`); a atuação digitada vai para as Observações.
- **SEN-06** Filtro "Tipo de serviço" da lista: um parâmetro só, `serviceType`, com os quatro valores.

## Assumptions & Open Questions

| Item | Decisão |
| --- | --- |
| Cadastrar novo | Sai inteiro; só os 4 tipos (usuário, 2026-11-27) |
| Atuação digitada | Sai; o texto vai para as Observações (usuário) |
| Finalizado | Fase `finished` em todos os tipos, perícia inclusive (usuário) |
| Planilha | "Finalizado", "Concluído", "Encerrado" passam a `finished` (antes `fees_received`) |
