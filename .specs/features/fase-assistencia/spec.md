# Fases da Assistência técnica — Spec

Pedido da perita (2026-11-04): quando o tipo de serviço é **Assistência técnica**, a lista "Fase do serviço" é própria, sem grupos, na ordem:

Proposta de honorários enviada · Contratado · Estudo dos autos e quesitos iniciais · Reunião de alinhamento · Perícia in loco · Parecer técnico em elaboração · Parecer técnico entregue · Quesitos suplementares · Impugnação de laudo pericial · Quesitos complementares · Perícia complementar · Etapa extra · Assistência finalizada · Honorários recebidos · Acordo / desistência

(As 12 da perita + 3 sugestões aceitas: Proposta de honorários enviada, Honorários recebidos, Acordo / desistência.)

## Requisitos

- **FAS-01** Na assistência técnica, cadastro e edição mostram só essa lista; perícia continua com a lista em grupos (AD-178, AD-180) e o tipo do escritório com as fases digitadas.
- **FAS-02** A API recusa fase que não é do tipo do serviço (`invalid_service_type`).
- **FAS-03** Assistência nova começa em "Contratado"; trocar o tipo no formulário troca a fase para a primeira do novo tipo quando a atual não serve.
- **FAS-04** Encerram a assistência (saem de "Serviços em aberto"): Honorários recebidos e Acordo / desistência; Cancelado como hoje. "Assistência finalizada" continua em aberto (escolha da perita).
- **FAS-05** "Laudos entregues" conta a assistência de "Parecer técnico entregue" em diante (sem Acordo / desistência). Concluir o parecer com a entrega leva a assistência a "Parecer técnico entregue" quando ainda estava antes dela.
- **FAS-06** Assistências já cadastradas com fase da perícia passam para "Contratado" na subida (escolha da perita); as que já estão em "Honorários recebidos" ficam, porque essa fase existe na lista nova.
- **FAS-07** Planilha: fase lida que não serve à assistência fica em branco e vai para as observações com "(!)".
- **FAS-08** Lista, filtro por fase, detalhe, ficha em PDF e gráfico do início mostram as fases novas (gráfico: barra "Assistência técnica").

## Assumptions & Open Questions

| Item | Decisão |
| --- | --- |
| Já cadastradas | Todas para "Contratado" (perita, 2026-11-04) |
| Sugestões | Proposta de honorários enviada, Honorários recebidos, Acordo / desistência (perita) |
| Encerramento | Só Honorários recebidos (perita); Acordo / desistência encerra pela descrição aceita |
