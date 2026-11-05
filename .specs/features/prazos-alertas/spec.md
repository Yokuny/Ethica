# Prazos e Alertas — Spec

Pedido da perita (2026-11-04): seção **Prazos e Alertas** no menu, logo abaixo de Serviços, com os prazos e alertas de todos os serviços em lista por criticidade (o que vence antes no topo). Tipos de prazo e alerta sugeridos para perícia, assistência técnica e parceria, aprovados por ela, viram lista suspensa na criação, com opção de escrever à mão.

## Requisitos

- **PAL-01** Item "Prazos e Alertas" no menu, abaixo de Serviços, com o mesmo acesso de Serviços.
- **PAL-02** Lista com os **pendentes** por vencimento (vencidos primeiro, depois os mais próximos), com serviço, tipo (Prazo/Alerta), vencimento e selos Vencido / Vence em breve. Filtro de situação mostra os protocolados, concluídos e perdidos (estes do mais recente ao mais antigo).
- **PAL-03** **Alerta** é um lembrete com data: pendente → **concluído** (sem data de protocolo). **Prazo** segue pendente → protocolado / perdido. Ambos reabrem.
- **PAL-04** Criar prazo ou alerta na seção, escolhendo o serviço; o detalhe do serviço também cria os dois.
- **PAL-05** (depois da aprovação dos tipos) Título por lista suspensa com os tipos aprovados por tipo de serviço, ou escrito à mão.
- Alertas entram na agenda, no aviso diário por e-mail e nos números "Prazos vencidos" / "Vencem em até 15 dias", como os prazos.

## Assumptions & Open Questions

| Item | Decisão |
| --- | --- |
| O que é alerta | Lembrete que só se conclui (perita, 2026-11-04) |
| O que a lista mostra | Só pendentes; filtro mostra os outros (perita) |
| Tipos sugeridos | Aguardando aprovação da perita (PAL-05) |
