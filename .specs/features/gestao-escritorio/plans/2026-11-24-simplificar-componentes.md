# Plano — simplificar os componentes do `apps/web`

Data: 2026-11-24 · Pedido do usuário: "pode excluir bastante arquivos e simplificar bastante coisa… componentes criados para simplificar acabaram limitando a personalização e trazendo padrão de design rígido… fazer direto no trecho de código da página".

## Critério

Sai o componente que **recebe dados e fixa o desenho** (a tela só passa props, não consegue ajustar o layout) quando a página pode montar o mesmo resultado direto com os primitivos de `@ethica/ui` (`Item`, `ItemGroup`, `ItemTitle`, `ItemDescription`, `ItemMedia`, `ItemActions`, `Button`, `Badge`) em poucas linhas. Fica o que guarda **lógica** (consulta, estado, cálculo, acessibilidade, gráfico) ou que, inlinado, seria copiado em muitas telas. O número de usos não decide sozinho.

Já feito nesta sessão: `link-list.tsx` (AD-288) e `default-timeline.tsx` (sem uso) excluídos.

## Candidatos

| Grupo | Componente | Usos | O que trava | Proposta | Risco |
| --- | --- | --- | --- | --- | --- |
| A | `page-intro.tsx` + `hub-illustration.tsx` + `link-card.tsx` | 2 hubs (`/expert-reports`, `/field`) | Introdução com ilustração e grade de cartões de destino com desenho próprio (AD-094) | Excluir os três; cada hub lista os destinos com `ItemGroup` + `Item render={<Link/>}` (ícone, título, apoio, seta), igual às outras listas | Baixo |
| A | `numbered-list.tsx` (bloco shadcnblocks) | 2 (seções do laudo e do modelo) | Linhas numeradas com layout fixo | Excluir; seções em `ItemGroup`/`Item` com o número em `ItemMedia` | Baixo |
| A | `step-list.tsx` (bloco shadcnblocks) | 3 (Conta, Escritório, Relatórios) | Página em etapas com título fixo e layout próprio | Excluir; cada página com seções `section` + `ItemTitle`/`ItemDescription` direto | Médio (3 páginas longas) |
| A | `info-card.tsx` | 4 (meta do ano, responsáveis técnicos, recebimentos do lançamento, aparelhos) | Cartão com valor, cauda esmaecida e rodapé fixos (AD-225) | Excluir; cada lista vira `ItemGroup`/`Item` com o valor em `ItemTitle` | Baixo |
| A | `list-trend-stat.tsx` | 2 (faixas da Home e de Serviços) | Envolve `RecordStat` com o tooltip de tendência | Manter por ora (tem a lógica do tooltip e do cálculo); rever junto com o grupo B | — |
| B | `record.tsx` — `RecordTable`, `RecordTableRow`, `RecordTableMedia`, `RecordTableCell` | ~12 telas | "A identidade toda mora aqui: a tela só escolhe os dados e não passa classe" | Excluir a parte `RecordTable*`; as listas livres (checklist) viram `ItemGroup`/`Item` ou `table` direto | Médio |
| B | `record.tsx` — `RecordHeader`, `RecordHeading`, `RecordHeadingGroup`, `RecordStatus` | ~15 telas | Cabeçalho com tamanhos fixos | Manter (cabeçalho igual em todas as telas de detalhe, pouco código na página); só tirar o que não tiver uso | Baixo |
| B | `record.tsx` — `RecordStats`, `RecordStat` | ~30 | Faixa de números | Manter (sparkline, régua, tendência e link são lógica); já simplificado na AD-292 | — |
| C | `panel.tsx` | 24 | Título/descrição/ações por props; variante recolhível com estado | Separar: o bloco simples vira `section` + `ItemTitle` direto na página; o recolhível fica (tem estado e acessibilidade) | Alto (24 telas) |
| C | `default-form-layout.tsx` | 7 formulários | Grade de formulário portada do iotlog | Rever depois do grupo C; pode ficar | Médio |
| C | `product-specs.tsx` (bloco shadcnblocks) | 4 (detalhe do serviço, parte, compromisso, prazo) | Grupos recolhíveis com linhas rótulo/valor | Rever: provável troca por `Panel collapsible` + `dl` direto | Médio |
| — | `upcoming-appointments`, `case-receipts`, `case-picker`, `goal-progress`, `heat-tiles`, `month-heat-table`, `cash-flow-*`, `composition-donut`, `data-table`, `form-fields`, `form-dialog`, `confirm-dialog`, `default-empty-data`, `default-loading`, `page-card`, `app-link`, `user-menu*`, `mobile-dock` | — | — | Manter: têm consulta, cálculo, gráfico, estado ou são a moldura de todas as telas | — |

## Execução (depois da aprovação)

1. Um grupo por commit, na ordem A → B → C, cada um com a tela conferida no Playwright logado (1440 e 390 px) antes do commit, `pnpm run check` e build verdes.
2. Cada exclusão leva a decisão: AD nova que supersede a do componente (AD-094 para os hubs, AD-225 para o `InfoCard`, AD-224 para o `StepList`, AD-090 para o `RecordTable`) e linha no "Histórico" dos `feature.md` tocados.
3. `ethica-web-standards` (SKILL.md e `references/`) e `apps/web/DESIGN.md` sem menção ao que saiu.
4. Fim: `grep` pelo nome de cada componente excluído só encontra histórico congelado.

## Resultado (2026-11-24)

- Grupo A (AD-295): saíram `PageIntro`, `HubIllustration`, `LinkCard`, `StepList`, `InfoCard`. **Divergência:** `NumberedList` ficou — guarda a lógica de árvore (subitem só aparece com o pai aberto, expandir/recolher tudo) do editor de laudo e do modelo.
- Grupo B (AD-296): saiu o `RecordTable*`; os dois usos (importação CSV) viraram `Item`.
- Grupo C (AD-297): o `Panel` simples virou `section` nas 29 telas; `Panel` ficou só recolhível. **Divergência:** `ProductSpecs` e `DefaultFormLayout` ficaram — guardam estado e lógica (grupos recolhíveis, grade de formulário), não só desenho.
- Conferido no Playwright logado (31 rotas, 1440 e 390 px) depois de cada grupo.

- **Revertido (AD-299):** o grupo A nas telas Escritório, Minha conta, Relatórios e hubs de Laudos e Logística voltou à versão anterior, a pedido do usuário; só os recebimentos do lançamento seguem em `Item`.
