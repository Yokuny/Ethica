# Campo e vistorias — Tasks

**Design**: `.specs/features/campo-vistorias/design.md` · AD-128 a AD-132.

| # | Tarefa | Req | Verificação |
| --- | --- | --- | --- |
| T1 | Contratos: `vistoria.schema.ts`, motivo do compromisso, aviso de agendamento, variáveis e `img` do laudo, mensagens | CAM-01..09 | `pnpm vitest run packages/contracts` |
| T2 | Models: `Vistoria`; `Compromisso` (motivo, coordenadas, avisos); `Tenant.avisoAgendamento`; ownership no estrutural | CAM-01..03, 08, 09 | `tsc`, structural |
| T3 | Identity: reservar/devolver cota; modelo do aviso em `/tenant/office/aviso-agendamento` | CAM-03, 09 | e2e office |
| T4 | Agenda: `vistoria.*` (dia, registro com versão, mídias, galeria da perícia), exclusão em cascata, motivo | CAM-01..03, 05..07 | e2e |
| T5 | Provider `geocoder` (Nominatim) + `POST /agenda/:id/geocode`; aviso por e-mail `POST /agenda/:id/aviso` | CAM-08, 09 | unit + e2e |
| T6 | Laudo: variáveis de campo, `img` no saneamento, foto no PDF e no Word | CAM-04 | unit + e2e |
| T7 | Seed: vistoria feita com registro, fotos e assinatura (sem storage, só registro), modelo do aviso | — | `seed:demo` |
| T8 | Web base: PWA (manifest, sw, ícones, registro), baseline mobile, `lib/offline` (store, sync, foto) | CAM-05 | `check` + build |
| T9 | Web `/campo` (rota do dia), `/campo/vistoria` (abas, assinatura, fotos, áudio, conflito) | CAM-01..03, 05..07 | `check` + build |
| T10 | Web `/campo/mapa` (Leaflet, ordem, conflito, OSRM, aviso) e aviso no detalhe da agenda; modelo no escritório | CAM-08, 09 | `check` + build |
| T11 | Web: painel "Vistorias" na perícia, "Inserir foto" no editor do laudo, navegação, traduções | CAM-03, 04 | `check` + build |
| T12 | Gate: `pnpm run check`, build, UAT (3 contas; celular com offline; laudo com campo e fotos em PDF e Word) | todos | `validation.md` |
