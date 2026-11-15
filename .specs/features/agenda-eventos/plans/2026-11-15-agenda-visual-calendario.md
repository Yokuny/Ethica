# Agenda: visual do calendário no padrão do DentalEase

Pedido de 2026-11-15: o calendário da agenda (`apps/web/src/routes/_private/agenda/`) passa a seguir o visual da agenda do DentalEase (`DentalEase/src/routes/_private/schedule/`, `week-view.tsx`, `month-view.tsx`, `event-item.tsx`). Única diferença: a perita **não escolhe cor**; a cor vem só do tipo do item (compromisso ou item de dia inteiro).

## O que muda

1. **Cor por tipo, num mapa só** (`@consts/calendar.ts`, `TYPE_COLORS`): os 4 tipos de compromisso e os 4 de item de dia inteiro, fundo pastel sem borda (como o DentalEase) e a bolinha da legenda. Os dois chips (`calendar-event.tsx`) leem dali. Atrasado em vermelho, feito/pago esmaecido e cancelado riscado continuam.
2. **Legenda no filtro de tipo**: cada opção do seletor de tipo mostra a bolinha da cor; é a legenda da agenda, sem componente novo.
3. **Cabeçalho do período**: dia em destaque ("15 domingo") e mês/ano menor ao lado; à direita a navegação e o seletor Dia/Semana/Mês na mesma linha. Tipo e Novo compromisso seguem no cabeçalho da página. Supersede a parte (4) da AD-193.
4. **Dia/Semana** (`time-grid-view.tsx`): cabeçalho "seg 16" com hoje em destaque; hora escrita sobre a linha (12h); hora de 64px; a grade começa às 6h (ou antes, se houver compromisso mais cedo) e ocupa a altura da tela; linha do agora no dia de hoje; fim de semana esmaecido; clicar num dia vazio abre Novo compromisso nesse dia.
5. **Mês** (`month-view.tsx`): número do dia no canto, hoje num círculo grafite; itens em uma linha (texto inteiro no `title`); até 3 itens por dia somando prazos/financeiro e compromissos, o resto em "+N Mais"; clicar num dia vazio abre Novo compromisso.

Sem arrastar para remarcar (o DentalEase tem; aqui fica fora).
