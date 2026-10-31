# Ethica — produto

## O que é

Plataforma multi-tenant para **peritos judiciais e assistentes técnicos** gerirem perícias
trabalhistas, cíveis e federais de ponta a ponta — da nomeação ao laudo e ao recebimento dos
honorários — e **prospectarem** novos serviços e possíveis nomeações na API Pública do Datajud (CNJ).

Promessa: *fazer mais perícias gastando menos tempo com burocracia.* O desafio do perito não é o
conhecimento técnico, é a gestão do caos: processos, prazos, vistorias, honorários e documentos
espalhados.

## Para quem

| Perfil | O que precisa |
| --- | --- |
| Perito judicial (pessoa física ou escritório) | Não perder prazo, organizar vistorias, saber o que tem a receber |
| Assistente técnico | Acompanhar as perícias em que atua para uma das partes |
| Equipe do escritório | Cadastrar processos, agendar, lançar despesas |

Um tenant = um perito ou escritório. Papéis (`admin`, `manager`, `operator`) seguem `.agents/skills/ethica-permissions/SKILL.md`.

## Dores que o produto ataca

- **Garimpo de dados**: ler petições longas só para extrair número do processo, objeto e prazos.
- **Risco de prazos**: o fantasma de perder um prazo judicial e prejudicar a reputação nas varas.
- **Honorários esquecidos**: valores a receber que passam despercebidos entre tantas movimentações.
- **Vistorias analógicas**: sistemas que travam em campo (fábrica, zona rural) sem internet.
- **Laudos manuais**: fotos e anotações espalhadas na hora de redigir o laudo.

## O que existe hoje (fundação)

| Área | Faz |
| --- | --- |
| Perícias | Cadastro, listagem com busca, filtros e próximo prazo, detalhe com edição, etapas do fluxo (nomeada → … → concluída), vários prazos com protocolo, honorários propostos e fixados |
| Agenda | Calendário mês/semana/dia de vistorias, audiências e reuniões, com os prazos pendentes; feed iCal para o celular; aviso diário de prazos por e-mail |
| Financeiro | Honorários com recebimentos parciais (saldo e estorno) e despesa operacional; resumo, fluxo de caixa e totais por categoria em gráficos |
| Prospecção | Busca de processos no Datajud por tribunal e movimento; oportunidades salvas e convertidas em perícia |
| Início | Indicadores (abertas, prazos vencidos, prazos em até 15 dias, a receber), próximos compromissos e gráficos |
| Conta e equipe | Login, convite de usuários, foto/nome/senha |

Detalhe técnico vivo: `docs/features/*/feature.md` (índice em `docs/index.md`). Próximos passos: `docs/roadmap.md`.

## Princípios de produto

- Dado do processo é fonte única: prazo, honorário e compromisso apontam para a perícia.
- O que é automático é visível (`origem: automatico` na agenda, receita lançada por evento).
- Dinheiro só para quem precisa ver (financeiro restrito a admin/manager, AD-107).
- Texto de interface em português, chaves de tradução (`t()`), datas no fuso de São Paulo (AD-036, AD-103).
