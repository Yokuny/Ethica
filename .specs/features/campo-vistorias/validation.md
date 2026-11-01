# Campo e vistorias — Validation

**Data**: 2026-10-31 · **Branch**: `feat/campo-vistorias` (a partir de `main` em `22521a3`) · **Veredito**: **PASS** (transcrição de áudio fora do escopo, AD-124/AD-132)

Verificação em modo standalone (sem sub-agente): releitura dos critérios da spec contra os testes e UAT no navegador.

## Gate

| Comando | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest unit/structural/integration/e2e, Mongo Atlas Local) | 91 arquivos, 461 testes, todos passando |
| `(cd apps/web && pnpm run build)` | ok |
| `node .agents/skills/ethica-item-typography/scripts/scan.mjs --summary` | 0 texto cru |
| `docker compose up --build -d --renew-anon-volumes api web` + `seed:demo` | ok |

## Critérios × evidência

| Critério | Evidência |
| --- | --- |
| CAM-01.1 rota do dia com processo, partes, local, Maps/Waze | e2e `vistoria.router.e2e.test.ts` "rota do dia…"; UAT celular: `/campo` com as duas vistorias de hoje |
| CAM-01.2 feita/adiada/ausente com motivo | e2e (`motivo` `absent`, apagado ao concluir); UAT: "Concluído" no card → `done` |
| CAM-02.1/2 formulário em etapas, pré-preenchido, sem perder outras etapas | `vistoria.schema.unit.test.ts`; e2e (versão 1 → 2, 400 em chave desconhecida); UAT: presentes "Partes da perícia", paradigmas, funções por parte, agentes, documentos |
| CAM-02.3 registro no detalhe da perícia e no compromisso | UAT admin: painel "Vistorias" com galeria (2 fotos) e "Registro da vistoria" no detalhe da agenda |
| CAM-03.1 foto reduzida e carimbada, com legenda, na cota | e2e (mídia idempotente, `storageBytes`); UAT: foto com faixa "Avenida Paulista, 1578… · 31 out 2026 · 22:16" no PDF |
| CAM-03.2 cota e limite recusam mantendo as enviadas | e2e (`storage_quota_exceeded`, tipo errado 415) |
| CAM-03.3 galeria e exclusão devolvendo a cota | e2e (excluir mídia e compromisso → cota 0 e storage vazio) |
| CAM-04.1 variáveis da última vistoria feita | `laudo.unit.test.ts` "variáveis de campo"; e2e (pendente com vistoria agendada, resolvida depois de feita); UAT: "Estiveram presentes…", funções e paradigmas no laudo sem pendência |
| CAM-04.2 foto no editor, PDF e Word | `laudo.unit.test.ts` (data URL, `word/media`, saneamento do `img`); e2e (foto em data URL, `img` externo removido); UAT: PDF e `.docx` (convertido no Pages) com a foto |
| CAM-05.1 rota e formulário sem conexão | UAT celular: offline com faixa "Sem conexão…", 2 itens esperando envio; build de produção recarregado sem rede abriu `/campo` pela cópia do aparelho |
| CAM-05.2 envio ao voltar a conexão | UAT: observações e foto feitas offline no servidor depois da reconexão; presente adicionado após recarregar sem rede chegou ao servidor (`PUT 200`) |
| CAM-05.3 conflito sem perda silenciosa | e2e 409 com a versão do servidor; UAT: diálogo "Este registro mudou em outro lugar" → "Manter a minha" gravou "Minha versão final." |
| CAM-06.1 assinatura com nome e e-mail | UAT: canvas → "Assinado", mídia `signature` no servidor |
| CAM-07.1 áudio guardado e ouvido depois | UAT: gravação de 2 s (microfone emulado) enviada como mídia `audio` |
| CAM-08.1 mapa, ordem, conflito, reordenação | `rota.unit.test.ts` (Haversine, vizinho mais próximo, conflito); e2e geocodificação com cache; UAT: 2 paradas geocodificadas pelo Nominatim, rota OSRM desenhada, partida pela localização |
| CAM-09.1 aviso por e-mail pelo modelo, registrado | e2e (só quem tem e-mail, modelo do escritório, `inspection_requires_case`, só admin edita o modelo); UAT: aviso pelo detalhe da agenda → "Partes avisadas" com os dois e-mails |
| Edge: compromisso excluído leva registro e mídias | e2e |
| Edge: variável de campo sem vistoria feita fica pendente | `laudo.unit.test.ts`, e2e |

## UAT (navegador visível; web :15173, API docker :18080; PWA no build de produção em :15175)

- **Operador, celular (iPhone 13)**: dock "Campo" → rota do dia → registro completo (3 presentes, assinatura, paradigma, função com as duas versões, ruído com EPI, LTCAT e PPP, foto e áudio) → offline (observação e foto) → reconexão → conflito → status rápido → mapa. Sem rolagem horizontal.
- **Operador, celular, build de produção**: service worker ativo; recarregar sem rede abriu `/campo` e o registro; presente novo subiu sozinho depois da reconexão.
- **Admin, desktop**: modelo do aviso em `/office`; painel "Vistorias" e galeria na perícia; laudo com Metodologia e Atividades resolvidas pela vistoria, foto inserida, PDF e Word; aviso às partes pela agenda.
- **Gestor, desktop**: rota do dia, registro (função nova sincronizada), mapa com 2 marcadores; `/office` volta ao início.
- Corrigido durante a UAT: layout do card da rota (rodapé vazava do card); foto pendente duplicada depois do envio; recorte escondia o carimbo; chave de breadcrumb `campo`; sessão guardada para abrir sem rede (antes mandava ao login); nova tentativa periódica de sincronização (o evento `online` não chegou depois do recarregamento sem rede); data e hora da vistoria no laudo vindas da vistoria feita; dica dos marcadores do aviso.
- Limite do ambiente: emulação, não aparelho real (toque, câmera e GPS reais não foram usados; foto por arquivo, microfone e GPS emulados).
