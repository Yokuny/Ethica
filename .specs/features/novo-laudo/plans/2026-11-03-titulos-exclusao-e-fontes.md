# Títulos do laudo, exclusão do rascunho, fontes e lista de serviços (2026-11-03)

Pedido da perita, cinco pontos, com o laudo ETH-2026-008 como referência. Decisão: AD-174.

1. **Fontes do cabeçalho e do rodapé**: Calibri, Cambria e Source Sans Pro entram em `REPORT_FONTS` (valem também para o layout do laudo). No PDF, Carlito, Caladea e Source Sans 3 instaladas no `Dockerfile`; no Word, o nome da fonte original.
2. **Títulos**: item em maiúsculas, subitem com a primeira letra maiúscula (`sectionTitle`), na tela, no PDF e no Word; o título gravado não muda.
3. **Excluir rascunho**: item no "…" do laudo (no lugar do botão Remover do rodapé) e lixeira na quinta coluna da lista de laudos, só no rascunho e para quem pode excluir. A API já tinha o `DELETE /expert-reports/:id` (só rascunho).
4. **Detalhe do serviço**: os blocos recolhidos (`Panel collapsible`) ganham a caixa arredondada com ícone de Juízo, Partes e Observações.
5. **Lista de serviços**: coluna Partes entre Processo e Tipo de serviço (reclamante em cima, reclamada embaixo).
