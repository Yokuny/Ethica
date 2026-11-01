# Rotas de vistoria com ponto de partida e serviço de rota próprio — Specification

**Origem**: roadmap item 9 (`docs/roadmap.md`), pendências de `docs/features/campo-vistorias/feature.md` ("ponto de partida do mapa por endereço digitado"; "Nominatim e OSRM públicos têm limite e nenhuma garantia") e pedido do usuário em 2026-11-01. Prefixo de requisito: `ROT`.

## Problem Statement

O mapa do dia (`/field/map`) ordena as vistorias pela proximidade **a partir da localização do aparelho**. A perita muitas vezes planeja o dia de casa ou do escritório, na véspera, e o ponto de partida real é outro endereço; a AD-131 previa o endereço digitado, mas ele não foi feito. A rota pelas ruas usa o **OSRM público** (`router.project-osrm.org`) chamado direto do navegador, e o endereço é geocodificado no **Nominatim público**: os dois têm limite de uso, nenhuma garantia de disponibilidade e recebem os endereços das vistorias.

## Goals

- [ ] A perita escolhe de onde sai (endereço digitado, endereço do escritório ou localização atual) e a ordem e a rota partem dali.
- [ ] A rota pelas ruas vem de um serviço de rota do próprio Ethica, chamado pela API, sem depender do servidor público.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Otimização exata da ordem (caixeiro-viajante com janelas de horário) | O vizinho mais próximo com reordenação manual atende poucas paradas por dia (AD-131). |
| Trânsito em tempo real e tempo estimado com trânsito | Exige provedor pago. |
| Navegação passo a passo dentro do Ethica | Os atalhos para Google Maps e Waze já existem. |
| Trocar os tiles do mapa (OpenStreetMap) | Tiles não carregam os endereços; fica como está. |

---

## Já existe (não refazer)

| Item | O que já há | Lacuna |
| --- | --- | --- |
| Mapa do dia | `apps/web/src/routes/_private/field/map/` (Leaflet, `@utils/itinerary.ts` com vizinho mais próximo e conflito de horário) | Ponto de partida por endereço. |
| Rota pelas ruas | `itineraryOsrm` em `apps/web/src/routes/_private/field/map/index.tsx` chamando o OSRM público do navegador | Serviço próprio, chamado pela API. |
| Geocodificação | `apps/api/src/providers/geocoder.ts` (Nominatim, `GEOCODER_URL`, uma requisição por segundo) e coordenadas em cache no compromisso | Geocodificar o endereço de partida. |
| Endereço do escritório | Cadastro do escritório em `/office` (`apps/api/src/modules/identity/office.*`) tem nome, CNPJ, cabeçalho e rodapé, **sem endereço** (`packages/db/src/models/tenant.model.ts`) | Campo de endereço no escritório (só admin edita, como o resto de `/office`). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Opções de partida | "Minha localização", "Escritório" (endereço novo no cadastro do escritório, geocodificado e guardado como o do compromisso) e "Outro endereço" (digitado, geocodificado pela API) | Cobre o planejamento na véspera e o dia na rua | No |
| Endereço digitado | Lembrado **por pessoa** no servidor (preferência), não no `localStorage`, para valer no celular e no computador | A perita planeja num aparelho e sai com outro | No |
| Retorno | Opção "voltar ao ponto de partida" desligada por padrão | Útil para calcular o dia, mas nem sempre se volta | No |
| Serviço de rota | **OSRM próprio** (container `osrm-backend` com o mapa do Brasil do OpenStreetMap/Geofabrik) chamado **pela API** por um provider novo, com a URL em variável de ambiente (`ROUTING_URL`); o navegador chama só a API (AD-150) | Sem custo por requisição, sem limite de terceiros e os endereços não saem da infraestrutura | No |
| Custo do OSRM próprio | O mapa do Brasil pede vários GB de RAM no pré-processamento e ~2–4 GB para servir; no desenvolvimento local, um recorte menor (ex.: Sudeste) e o mesmo container | Confirmar onde a API vai rodar em produção antes do deploy (ver `producao-api`) | No |
| Geocodificação | Continua no Nominatim por provider (`GEOCODER_URL`), que já é trocável por um Nominatim próprio ou pago sem mudar código | Trocar a rota já resolve o maior volume; o geocode tem cache por compromisso | No |
| Sem serviço de rota configurado | A API responde que a rota não está disponível e o mapa mostra as linhas retas e os atalhos Maps/Waze, como hoje | Mesmo padrão de recurso opcional (Datajud, S3) | No |

---

## User Stories

### P1: Ponto de partida escolhido ⭐ MVP — ROT-01

**User Story**: Como perita, quero dizer de onde vou sair, para que a ordem das vistorias e a rota façam sentido mesmo quando planejo de outro lugar.

**Acceptance Criteria**:

1. WHEN a perita abre o mapa do dia THEN the system SHALL mostrar o ponto de partida atual e permitir trocar entre localização, escritório e outro endereço.
2. WHEN a perita digita um endereço THEN the system SHALL geocodificá-lo pela API, mostrar o ponto no mapa e recalcular a ordem e a rota.
3. WHEN o endereço não é encontrado THEN the system SHALL avisar e manter o ponto anterior.
4. WHEN a perita volta ao mapa em outro aparelho THEN the system SHALL usar a última escolha dela.
5. WHEN o escritório não tem endereço cadastrado THEN the system SHALL desabilitar a opção "Escritório" com a explicação.

**Independent Test**: no computador, escolher "Outro endereço" e digitar um endereço; abrir o mapa no celular e ver a mesma partida e a mesma ordem.

### P1: Rota pelo serviço próprio — ROT-02

**User Story**: Como perita, quero que a rota do dia funcione sempre, sem depender de um servidor público que pode cair ou bloquear.

**Acceptance Criteria**:

1. WHEN o mapa precisa da rota THEN the system SHALL pedir à API, que consulta o serviço de rota configurado.
2. WHEN o serviço de rota responde THEN the system SHALL desenhar a rota pelas ruas com a distância e o tempo total estimados.
3. WHEN o serviço não está configurado ou não responde THEN the system SHALL desenhar as linhas retas e manter os atalhos Maps/Waze, sem erro na tela.
4. WHEN a rota nova entra THEN the system SHALL remover a chamada ao OSRM público do navegador (sem manter as duas).

**Independent Test**: `docker compose up` com o container de rota; mapa do dia do seed com duas vistorias mostra a rota pelas ruas; parar o container mostra as linhas retas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ROT-01 | P1: Ponto de partida escolhido | Specify | Pending |
| ROT-02 | P1: Rota pelo serviço próprio | Specify | Pending |

## Success Criteria

- [ ] A perita planeja o dia seguinte saindo de casa sem estar em casa.
- [ ] Nenhuma requisição do navegador vai para `router.project-osrm.org`.

## Pontos de atenção para o design

- O provider de rota segue o formato de `geocoder.ts`: criado em `buildApp` e injetado, com teste unitário sem rede.
- Rota nova na API fica no módulo `agenda` (dono do compromisso e do campo), com a permissão `agenda` `view` (AD-137).
- O mapa precisa continuar funcionando sem conexão com o que já foi carregado (AD-128): a rota é melhoria, não requisito para abrir o dia.
- O container de rota entra no `docker-compose.yml` com o preparo do mapa documentado no `RUN_BOOK.md`.
