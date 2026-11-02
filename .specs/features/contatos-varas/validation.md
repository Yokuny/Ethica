# Contatos das varas — Validation

Data: 2026-11-01. Ambiente: docker compose local, seed de demonstração refeito.

| Req | Evidência | Resultado |
| --- | --- | --- |
| VAR-01 | e2e `court-division.router.e2e.test.ts` (cadastro, filtro por UF e cidade sem acento, edição que remove campo esvaziado, 409 na repetida, 404 de outro escritório, operador 403 ao escrever); tela: admin cadastra pelo diálogo, filtra SP → Campinas e vê os contatos; operador vê a lista sem os botões | OK |
| VAR-02 | e2e (criada, ignorada e recusada com a coluna; cabeçalho sem coluna obrigatória → 400); tela: planilha com 3 linhas → 2 criadas e 1 recusada ("uf") | OK |
| VAR-03 | tela: perícia 0002345-67.2026.5.02.0011 ("11ª Vara do Trabalho de São Paulo", São Paulo) mostra o painel "Contato da vara" com telefone, e-mail, balcão virtual e endereço | OK |

Gate: `pnpm run check` (526 testes) e `(cd apps/web && pnpm run build)` verdes.
