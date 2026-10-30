# Glossário

Termos de domínio usados no código, na interface e nos documentos. Valores de enum vivem no código (`packages/contracts/src/schemas/`) — aqui só o significado.

| Termo | Código | Significado |
| --- | --- | --- |
| Perícia | `Pericia` (`pericia` module) | Um processo judicial em que o perito (ou assistente técnico) atua. Identificada pelo número CNJ, única por tenant. |
| Número do processo (CNJ) | `numeroProcesso` | Formato `NNNNNNN-DD.AAAA.J.TR.OOOO` (Resolução CNJ 65/2008). |
| Justiça | `justica` | Trabalhista, cível ou federal. |
| Atuação | `papel` | `perito` (nomeado pelo juízo) ou `assistente_tecnico` (de uma das partes). |
| Etapa | `status` da perícia | Nomeada → aceita → vistoria → em laudo → laudo entregue → esclarecimentos → concluída; recusada encerra sem laudo. |
| Nomeação | `dataNomeacao` | Dia em que o juízo nomeou o perito. |
| Prazo do laudo | `prazoLaudo` | Dia limite de entrega; vira compromisso automático na agenda. |
| Honorários propostos | `honorariosPropostosCents` | Proposta do perito. |
| Honorários fixados | `honorariosFixadosCents` | Valor fixado pelo juízo; vira receita a receber no financeiro. |
| Compromisso | `Compromisso` (`agenda`) | Item da agenda: vistoria, audiência, prazo, reunião ou outro. |
| Vistoria | `tipo: 'vistoria'` | Visita técnica ao local periciado. |
| Lançamento | `Lancamento` (`financeiro`) | Receita (honorário prévio, fixado, parcial) ou despesa operacional (deslocamento, material, taxas, outras). |
| Previsto / liquidado / cancelado | `status` do lançamento | A receber/pagar, já recebido/pago, desconsiderado. **Atrasado** é derivado: previsto com vencimento antes de hoje. |
| Datajud | `providers/datajudClient.ts` | API Pública do CNJ com metadados e movimentos dos processos dos tribunais. |
| Oportunidade | `Oportunidade` (`prospeccao`) | Processo encontrado no Datajud e salvo para análise; pode ser convertido em perícia. |
| Tenant | `Tenant` | O escritório/perito cliente da plataforma; todo dado é isolado por tenant. |
