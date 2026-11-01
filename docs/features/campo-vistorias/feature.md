---
feature: Campo e vistorias
slug: campo-vistorias
descricao: Rota de campo no celular com registro de vistoria, fotos, áudio e assinatura offline, mapa do dia, aviso às partes e campo no laudo
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-103, AD-107, AD-113, AD-118, AD-120, AD-123, AD-124, AD-126, AD-128, AD-129, AD-130, AD-131, AD-132]
spec: [.specs/features/campo-vistorias]
branches: [feat/campo-vistorias]
---

# Campo e vistorias

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='campo-vistorias'`.

## O que foi feito

- **Rota do dia** (`/field`, também na barra inferior do celular): compromissos do dia com processo, partes, local, atalhos para Google Maps e Waze e o resultado com um toque (feita, adiada, ausente).
- **Registro da vistoria** (`/field/inspection`): presentes com qualidade, e-mail e assinatura na tela; paradigmas por parte; funções com a versão do reclamante e a da reclamada; agentes Sim/Não com EPI; documentos solicitados; observações internas; fotos com legenda (reduzidas e carimbadas com endereço, data e hora) e áudio.
- **Sem conexão**: o app abre e recarrega sem rede (PWA instalável), o que é feito fica no aparelho e sobe sozinho quando a conexão volta; se alguém salvou antes, o perito escolhe qual versão fica.
- **Mapa do dia** (`/field/map`): paradas no mapa do OpenStreetMap, ordem pela proximidade a partir da localização do aparelho, reordenação, conflito de horário, rota pelas ruas e aviso às partes.
- **Aviso de agendamento** por e-mail às partes e advogados da perícia, pelo modelo do escritório (`/office`), registrado no compromisso; também no detalhe do compromisso da agenda.
- **No laudo**: variáveis da última vistoria feita (presentes, paradigmas, funções por parte, agentes, documentos, hora) e "Inserir foto" com as fotos da perícia, que saem no PDF e no Word. O modelo padrão já usa essas variáveis em "Metodologia e vistoria" e "Atividades exercidas".
- **Na perícia**: painel "Vistorias" com os registros e a galeria de fotos.

## Por que

A vistoria era analógica e o que se colhia em campo era redigitado no laudo (`.specs/features/campo-vistorias/spec.md`). O registro usa um só tipo do contrato para o formulário e para as variáveis do laudo, evitando o defeito do concorrente em que o formulário gravava uma chave e o laudo lia outra (AD-130). Offline com service worker e IndexedDB, com versão por registro e 409 no conflito, para nada ser sobrescrito em silêncio (AD-128). Mídias no storage do escritório com cota, foto reduzida no aparelho e foto no laudo restrita às mídias do próprio tenant (AD-129). Mapa com OpenStreetMap, Nominatim pela API e OSRM público, sem custo nem chave (AD-131). Transcrição de áudio ficou fora (AD-124, AD-132).

## Como

### `apps/api`

- `apps/api/src/modules/agenda/inspection.{router,controller,service,repository,schema}.ts` — `/inspections` (dia, registro com versão e 409, mídias idempotentes pelo id do aparelho, galeria da perícia, última vistoria feita, foto do laudo). Dono do model `Inspection`.
- `apps/api/src/modules/agenda/appointment.*` — `reason` do cancelamento, coordenadas em cache, `POST /agenda/:id/geocode`, `POST /agenda/:id/notice`; excluir o compromisso leva o registro e as mídias (devolvendo a cota).
- `apps/api/src/providers/geocoder.ts` (Nominatim, uma requisição por segundo; `GEOCODER_URL`, `GEOCODER_USER_AGENT`), injetado em `buildApp` com o `mail`.
- `apps/api/src/modules/identity/office.*` — `reserveFile`/`returnFile` (cota para outros módulos) e `/tenant/office/schedule-notice`.
- `apps/api/src/modules/case/party.service.ts` — `findByIds` (destinatários do aviso).
- `apps/api/src/modules/documents/` — `report.variables.ts` (variáveis de campo), `report.html.ts` (`img` só da vistoria), `report.templates.ts` (foto em data URL), `report.docx.ts` (`ImageRun`, `imageDimensions`), `report.library.ts`; o checklist usa as listas do contrato.
- `apps/api/src/middlewares/fileBody.middleware.ts` aceita lista de tipos; `apps/api/src/app.ts` com `express.json` de 1 MB em `/inspections`.
- `apps/api/scripts/seed-demo.ts` — duas vistorias hoje e o registro da vistoria feita da perícia em elaboração de laudo.

### `apps/web`

- `apps/web/src/routes/_private/field/` — rota do dia, `inspection/` (abas, assinatura, mídias, conflito) e `map/` (Leaflet, `@utils/itinerary.ts`).
- `apps/web/src/lib/offline/` — `store.ts` (IndexedDB: rota, rascunhos, fila de mídias e status, sessão), `sync.ts` (envio e estado), `photo.ts` (redução e carimbo).
- `apps/web/public/{sw.js,manifest.webmanifest,icons/}`, `apps/web/index.html` (viewport, theme-color, manifest), `apps/web/src/main.tsx` (registro do service worker só em produção), `apps/web/src/theme.css` (toque sem flash, inputs de 16 px em tela de toque).
- `apps/web/src/query/inspection.ts`; `apps/web/src/query/session.ts` usa a última sessão sem rede; sair apaga o que o aparelho guardou.
- `apps/web/src/components/rich-text-editor.tsx` — "Inserir foto"; `apps/web/src/lib/api/client.api.ts` — `sendFile` (antes `postFile`) com `PUT`.
- Detalhe da perícia (`@components/case-inspections.tsx`), detalhe do compromisso na agenda, `/office` (aviso), navegação e barra inferior.

### `packages`

- `packages/contracts/src/schemas/inspection.schema.ts`; `appointment.schema.ts` (motivo), `document.schema.ts` (aviso), `report.schema.ts` (variáveis de campo, `img`, `REPORT_IMG_SRC`); mensagens novas.
- `packages/db/src/models/inspection.model.ts`; `appointment.model.ts` (motivo, coordenadas, avisos); `tenant.model.ts` (`scheduleNotice`). Sem migração: seed refeito.

## Como testar

```
pnpm vitest run apps/api/src/modules/agenda apps/api/src/modules/documentos packages/contracts apps/web/src/routes/_private/field
pnpm run check && (cd apps/web && pnpm run build)
```

- Dependências novas no web: `docker compose up --build -d --renew-anon-volumes api web` e `pnpm --filter api run seed:demo`.
- O recarregamento sem conexão só existe no build de produção (`vite build` + `vite preview`); no dev server o offline vale para o que já está aberto.
- UAT: `.specs/features/campo-vistorias/validation.md`.

## Pendências

- [ ] Transcrição do áudio (IA, AD-124) — adiada (AD-145).
- [ ] Ponto de partida do mapa por endereço digitado (hoje é a localização do aparelho) — spec em `rotas-vistoria` (AD-150).
- [ ] Nominatim e OSRM públicos têm limite e nenhuma garantia; com volume, trocar por serviço próprio ou pago (AD-131) — rota própria em `rotas-vistoria` (AD-150).
- [ ] Assinatura apagada deixa o `signatureId` do presente sem arquivo (ignorado na leitura).
- [ ] Imagem de produção da API ainda inexistente — spec em `producao-api` (AD-146).

## Histórico

- 2026-11-01 — Ponto de partida e rota própria especificados em `rotas-vistoria` (AD-150); chaves do storage por perícia em `producao-api` (AD-146).
- 2026-11-01 — Caminhos e nomes de código citados aqui passam ao inglês (feature `english-naming`, AD-139/AD-140).
- 2026-10-31 — Implementado CAM-01 a CAM-09, menos a transcrição (AD-128 a AD-132). Divergências do design: o ponto de partida do mapa é só a localização do aparelho; "Campo" substituiu "Prospecção" na barra inferior do celular (prospecção segue no Menu); a sessão passou a ser guardada no aparelho para o app abrir sem rede, e sair apaga os dados locais; `postFile` virou `sendFile`; o modelo padrão do laudo passou a usar as variáveis de campo; a sincronização tenta de novo a cada 15 s com pendência e quando a tela volta a aparecer (na UAT o evento `online` não chegou depois de recarregar sem rede); data e hora da vistoria no laudo vêm da vistoria feita com registro, quando há.
- 2026-10-31 — Spec criada (`.specs/features/campo-vistorias/spec.md`).
