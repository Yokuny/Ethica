# Campo e vistorias — Design

**Spec**: `.specs/features/campo-vistorias/spec.md` · **Decisões**: AD-128 (offline e conflito), AD-129 (mídias e foto no laudo), AD-130 (registro de vistoria e variáveis), AD-131 (mapa e aviso por e-mail), AD-132 (escopo). Seguem AD-103 (datas), AD-107 (papéis), AD-113 (valores em inglês), AD-118 (arquivo no corpo), AD-120 (storage e cota), AD-123/AD-126 (laudo).

Escopo: CAM-01 a CAM-09, menos a transcrição de áudio (CAM-07.2).

## Visão geral

```
apps/web /campo (PWA, IndexedDB) ──/vistorias/*──▶ modules/agenda (vistoria.*) ──▶ providers/fileStorage (S3)
                                  ──/agenda/*────▶ modules/agenda (compromisso: status+motivo, aviso, coordenadas)
                                                      │ cota ─▶ identity.officeService (reservar/devolver)
                                                      │ e-mail ─▶ providers/mail · geocodificação ─▶ providers/geocoder (Nominatim)
modules/documentos (laudo) ──▶ agenda.vistoriaService (última vistoria feita, bytes da mídia)
navegador ──▶ tiles OSM · OSRM público (rota)
```

`Vistoria` fica no módulo `agenda`, dono do `Compromisso`; o grafo não muda (`agenda → pericia, identity`; `documentos → agenda`).

## Modelo de dados (sem migração, seed refeito)

`Vistoria` (`vistorias`), uma por compromisso:

| Campo | Observação |
| --- | --- |
| `Tenant`, `Compromisso` (único por tenant), `Pericia?` | a perícia é cópia do compromisso na criação |
| `versao` (número, começa em 1) | conflito do offline (AD-128) |
| `dados` | `VistoriaDados` do contrato (abaixo), gravado inteiro |
| `midias: [{ id (UUID do aparelho), tipo, key, bytes, mime, legenda?, createdAt }]` | `tipo`: `photo`/`audio`/`signature` |

`VistoriaDados` (`packages/contracts/src/schemas/vistoria.schema.ts`):

- `presentes: [{ id, nome, qualidade, email?, assinaturaId? }]` — `qualidade` ∈ `VISTORIA_QUALIDADES` (`plaintiff`, `defendant`, `plaintiff_lawyer`, `defendant_lawyer`, `technical_assistant`, `witness`, `other`); `assinaturaId` aponta uma mídia `signature`.
- `paradigmas: [{ id, polo, nome, funcao?, periodo?, trabalhouJunto? }]`.
- `funcoes: [{ id, titulo, anoInicio?, anoFim?, local?, autor: VersaoFuncao, reu: VersaoFuncao }]` com `VersaoFuncao = { atividades?, frequencia?, tempoExposicao? }`.
- `agentes: [{ agente, presente: yes|no, epi?, observacoes? }]` — `agente` ∈ `VISTORIA_AGENTES` (`noise`, `heat`, `cold`, `humidity`, `chemicals`, `biological_agents`, `hazardous`).
- `documentos: [{ id, documento, solicitado, observacoes? }]` — `documento` é chave de `VISTORIA_DOCUMENTOS` (`risk_program`, `ltcat`, `pcmso`, `ppe_records`, `ppp`, `job_description`) ou texto livre.
- `observacoes?` — internas, nunca vão ao laudo.

Limites no contrato: textos curtos 200, longos 2000, listas 30.

`Compromisso` ganha `motivo?` (`postponed`/`absent`, só com `canceled`), `coordenadas?: { lat, lng, endereco }` (cache da geocodificação; vale enquanto `endereco === local`) e `avisos: [{ User, at, destinatarios: string[] }]`.

`Tenant` ganha `avisoAgendamento?: { assunto, corpo }`.

## Contratos

- `vistoria.schema.ts`: listas acima, `vistoriaDadosSchema`, `saveVistoriaSchema` (`{ versao, dados }`), `MIDIA_TIPOS`, `VISTORIA_MIDIA_LIMITES` (bytes e quantidade por tipo, mimes aceitos), `updateMidiaSchema` (`legenda`).
- `compromisso.schema.ts`: `COMPROMISSO_MOTIVOS`; `updateCompromissoSchema` aceita `motivo`.
- `documento.schema.ts`: `AVISO_AGENDAMENTO_MARKERS`, `updateAvisoAgendamentoSchema`.
- `laudo.schema.ts`: novas `LAUDO_VARIAVEIS` (AD-130); `LAUDO_HTML_TAGS` + `img` e `LAUDO_IMG_SRC` (regex do caminho da mídia).
- Mensagens: `inspection_conflict`, `media_limit_reached`, `unsupported_file_type` (já existe), `inspection_requires_case` (aviso sem perícia), `no_recipients`, `geocoding_unavailable`.

## API

| Rota | Papel | Observação |
| --- | --- | --- |
| `GET /vistorias/dia?date` | qualquer | compromissos do dia (qualquer tipo, por horário) com resumo da perícia (número, partes, vara) e o registro (`dados`, `versao`, mídias sem bytes) — snapshot do offline |
| `GET /vistorias/:compromissoId` | qualquer | registro (cria vazio virtualmente: `versao: 0`) + compromisso + perícia |
| `PUT /vistorias/:compromissoId` | qualquer | `{ versao, dados }`; `versao` diferente da atual → 409 `inspection_conflict` com o registro do servidor em `data`; sucesso devolve `versao + 1` |
| `PUT /vistorias/:compromissoId/midias/:midiaId?tipo&legenda` | qualquer | corpo binário (`image/jpeg`, `audio/webm`, `audio/mp4`, `image/png`); idempotente pelo `midiaId`; limite por tipo → 422 `media_limit_reached`; cota → 422 `storage_quota_exceeded`; sem storage → 503 |
| `GET /vistorias/:compromissoId/midias/:midiaId` | qualquer | bytes com o mime, `Cache-Control: private, max-age=31536000, immutable` |
| `PATCH` · `DELETE /vistorias/:compromissoId/midias/:midiaId` | qualquer | legenda; excluir devolve a cota e tira a assinatura de quem a usava |
| `GET /vistorias/pericia/:periciaId` | qualquer | registros da perícia (galeria e painel) |
| `PATCH /agenda/:id` | qualquer | já existe; ganha `motivo` |
| `POST /agenda/:id/geocode` | qualquer | geocodifica o `local` (cache no compromisso); 503 `geocoding_unavailable` |
| `POST /agenda/:id/aviso` | qualquer | e-mail às partes e advogados com e-mail; 422 `inspection_requires_case`/`no_recipients`; registra o envio |
| `GET` · `PUT /tenant/office/aviso-agendamento` | admin | modelo do aviso (padrão quando vazio) |

Excluir compromisso (`compromissoService.deleteCompromisso`) apaga o registro e as mídias (storage e cota). Cota: `officeService.reservarArquivo(tenantId, bytes)` (update condicional, como o logo) e `officeService.devolverArquivo(tenantId, bytes)`.

Providers novos: `geocoder` (Nominatim; `GEOCODER_URL`, `GEOCODER_USER_AGENT`; fila de 1 req/s; testes com falso).

## Laudo

- `laudo.variaveis.ts` recebe a última vistoria feita (`vistoriaService.ultimaFeitaDaPericia`) e monta as variáveis novas a partir de `VistoriaDados`, com rótulos pt-BR do servidor para agentes, qualidades e documentos.
- `laudo.html.ts`: `img` permitido com `src` que casa `LAUDO_IMG_SRC` depois de tirar a origem (o editor grava URL absoluta da API); qualquer outro `img` some.
- Exportação: `laudo.service` junta os `src` das seções, lê os bytes pelo `vistoriaService` (só do tenant) e passa um mapa `src → { data, mime, largura, altura }`; o PDF troca o `src` por data URL, o Word usa `ImageRun` (largura máx. 15 cm, proporção pelo cabeçalho do JPEG/PNG). Mídia que não existe mais some do documento.

## Web

| Rota | Conteúdo |
| --- | --- |
| `/campo` (card "Campo" no grupo Trabalho) | rota do dia: troca de dia, faixa de conexão/sincronização, cards por compromisso (hora, tipo, status, processo, partes, local, Maps/Waze, "Feita/Adiada/Ausente", "Registro"), atalho para o mapa |
| `/campo/vistoria?id=<compromissoId>` | registro em abas (Presentes, Paradigmas, Funções, Agentes, Documentos, Mídias, Observações); salva no aparelho a cada mudança e envia quando há conexão; conflito abre comparação; assinatura num `Dialog` com canvas; foto com câmera (`capture`) e carimbo; áudio com `MediaRecorder` |
| `/campo/mapa?date` | mapa Leaflet, ponto de partida, ordem sugerida, reordenar, conflito de horário, rota OSRM, aviso por e-mail por parada |
| `/pericias/details` | painel "Vistorias" (registros, galeria de fotos, áudios) |
| `/agenda` (detalhe do compromisso) | link para o registro e "Avisar as partes" |
| `/_admin/office` | modelo do aviso de agendamento |
| editor do laudo | "Inserir foto" com a galeria da perícia |

- Offline: `apps/web/src/lib/offline/` — `store.ts` (`idb-keyval`: rota do dia, rascunhos por compromisso, fila de mídias com blob) e `sync.ts` (envia rascunhos e mídias em ordem, trata 409, reage a `online`). `public/sw.js` + `public/manifest.webmanifest` + ícones PNG; registro em `main.tsx` só em produção. Baseline mobile (`viewport-fit=cover`, `theme-color`, `-webkit-tap-highlight-color`, inputs 16 px na tela de campo).
- Foto: `apps/web/src/lib/offline/foto.ts` (canvas: redução a 1600 px, faixa com endereço e data/hora, JPEG 0,82).
- Mapa: `leaflet` direto (sem wrapper React), CSS do pacote importado na rota.
- Tiptap: `@tiptap/extension-image` no `rich-text-editor.tsx`, ativo só com `fotos` (laudo).

## Testes

- Unit: schema da vistoria (limites, chaves), variáveis de campo (texto de cada lista, ausência = pendência), saneamento do `img`, dimensões JPEG/PNG, Haversine/vizinho mais próximo e conflito (web, função pura), modelo do aviso (marcadores).
- E2E: salvar com versão (200 e 409), mídia idempotente e limites, cota devolvida ao excluir mídia e compromisso, operador pode registrar, aviso envia só a quem tem e-mail e registra, geocodificação com cache (provider falso), laudo com variáveis de campo e foto no PDF (renderizador falso conferindo o data URL) e no Word.
