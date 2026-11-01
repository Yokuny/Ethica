# Montagem do laudo — Validation

Data: 2026-11-01. Ambiente: docker compose local, seed de demonstração, admin.

| Req | Evidência | Resultado |
| --- | --- | --- |
| LMO-01 | e2e `report.router.e2e.test.ts` ("seções do modelo no rascunho"); tela: desmarcar "Objetivo", marcar "Anexo 3 — Calor" trouxe "Insalubridade — NR-15" junto e manteve o texto das outras seções | OK |
| LMO-02 | unit `report.unit.test.ts` (biblioteca com as seções novas, marcadores válidos e HTML saneado) | OK |
| LMO-03 | unit `report.process.unit.test.ts`; tela: PDF de exemplo → admissão, demissão e função salvas na perícia, pedidos no Objetivo, aviso de "Quesitos do juízo" e "Seção de quesitos" não achados | OK |
| LMO-04 | e2e: `?preview=true` com pendência responde 200 com o marcador no HTML; tela: diálogo recebe `application/pdf`. O navegador de teste sem janela não desenha PDF dentro da página: conferência visual pela perita | OK (visual pendente da perita) |
| LMO-05 | unit (foto do laudo aceita no saneamento; foto na célula com meia largura no Word); e2e (envio, leitura, reenvio sem duplicar, 415 para PNG, exclusão apaga o arquivo); tela: quadro inserido, salvo e desenhado no PDF em duas colunas iguais | OK |

Gate: `pnpm run check` (524 testes) e `(cd apps/web && pnpm run build)` verdes.
