# Ajustes do escritório e do laudo (2026-11-03)

Pedido da perita, cinco pontos. Decisão: AD-172.

1. **Novo laudo começado e troca de tela**: ao sair do "Novo laudo" com o serviço já escolhido, pergunta "Salvar como rascunho?" com Salvar rascunho (cria o rascunho e segue para onde ia), Descartar e sair, ou Cancelar (fica). Trocar serviço ou modelo na mesma tela não pergunta. `useBlocker` do TanStack Router em `apps/web/src/routes/_private/expert-reports/add/index.tsx`.
2. **Cabeçalho e rodapé do escritório**: fonte (Times, Arial), tamanho (pt) e alinhamento (esquerda, centro, direita) para cada um, no PDF e no Word. `headerStyle`/`footerStyle` no `Tenant` (sem eles vale o padrão de hoje: Arial 8,5 centralizado); o responsável técnico usa a formatação do escritório.
3. **Controle de OS**: botão "Personalizar padrão da OS" abre o padrão com marcadores `[SIGLA]`, `[ANO]`, `[NUMERO]` e os dígitos do número; "Usar o padrão sugerido" volta a `[SIGLA]-[ANO]-[NUMERO]` com 3 dígitos. Sem `[ANO]` no padrão a numeração não volta a 001 em janeiro (senão repetiria).
4. **Expandir/recolher**: `ProductSpecs` passa a abrir com tudo recolhido, como a `NumberedList`.
5. **Itens do laudo**: linha inteira clicável para expandir, linhas mais compactas e "Faz parte do laudo" escrito uma vez acima da lista (a caixa de cada linha fica com dica ao passar o mouse).
