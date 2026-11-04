# Fase e status do serviço — Specification

**Origem**: pedido da perita em 2026-11-03 (Serviços → Novo), com duas fotos da lista de fases do sistema que ela usava.

## Problem Statement

O cadastro pede a esfera em todo serviço e mistura, num "status" só, a etapa da rotina e a situação do serviço. A perita quer: tipo de serviço Perícia, Assistência técnica ou Cadastrar novo; Esfera (Trabalhista, Cível, Federal) só na perícia; **Fase do serviço** com a lista dela, por grupos; e **Status** à parte (Ativo, Suspenso, Cancelado).

## Requirements

- **FSV-01** — Tipo de serviço: Perícia, Assistência técnica, os tipos do escritório e Cadastrar novo. Parceria sai da lista; os serviços de parceria viram o tipo do escritório "Parceria".
- **FSV-02** — Esfera (Trabalhista, Cível, Federal) aparece e é obrigatória só na Perícia. Sai a esfera Extrajudicial.
- **FSV-03** — Assistência técnica usa o formulário de dados do contratante, como o tipo novo (sem processo obrigatório).
- **FSV-04** — "Status do serviço" vira **Fase do serviço**, com a lista das fotos em grupos (inicial, de perdas, final, de recebimento, auxiliares) na perícia e na assistência; no tipo do escritório, as fases digitadas nele, "Honorários recebidos" ou uma nova.
- **FSV-05** — Campo **Status**: Ativo, Suspenso, Cancelado.
- **FSV-06** — Encerrado (fora de "em aberto" e dos avisos de parado): status Cancelado, ou fase de perdas, ou Honorários recebidos. Suspenso não conta como parado.
- **FSV-07** — Data e hora da perícia vão para a agenda como foram digitadas (já acontece, AD-160/AD-169; mantido).
- **FSV-08** — Obrigatórios com asterisco vermelho: tipo, esfera (perícia), fase, status, objeto, número do processo e tribunal (perícia), data da nomeação (perícia).

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Assistência técnica | Formulário de contratante | Perita, 2026-11-03 | Yes |
| Fases do tipo novo | Digitadas | Perita, 2026-11-03 | Yes |
| Encerrado | Cancelado, fases de perdas e Honorários recebidos | Perita, 2026-11-03 | Yes |
| Obrigatórios extras | Nº do processo, tribunal e data da nomeação | Perita, 2026-11-03 | Yes |
| Fases da assistência técnica | A lista das fotos | A rotina de impugnações vale para o assistente | No |
| Parceria (AD-177, pedida mais cedo) | Vira tipo do escritório "Parceria", continua escolhível | Lista pedida só tem três opções; não perde os serviços | No |
| Serviços existentes | Status antigo convertido para fase + status (design.md) | Não perder a etapa | No |
| Texto "Aguardando agendam perícia" | "Aguardando agendamento da perícia / Elaborar checklist" | Abreviação da foto | No |
| Data da nomeação obrigatória | Só no formulário (importações chegam sem ela) | Igual ao contratante (AD-176) | No |
