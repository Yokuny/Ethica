# Campo e vistorias — Specification

**Origem**: onda 5 da gap analysis `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (tabela "Agenda e campo", seção 2 e seção 5 "App de campo como pré-laudo offline"); inventário `.specs/features/benchmark-jusperia/2026-10-31-jusperia-inventario.md` §3, §4, §7.2 e §12. Depende de `laudos` (variáveis, AD-126) e `documentos-pdf` (storage e cota, AD-120). Roadmap #6 e #9.

## Problem Statement

A vistoria é a etapa em que o perito colhe o que vai sustentar o laudo, e hoje ela é analógica: o Ethica só tem o compromisso na agenda e o checklist em papel. As versões das partes, os paradigmas, as funções e atividades, os agentes observados e as fotos ficam em anotações e na galeria do celular e são redigitados no laudo. O concorrente tem uma rota de campo no celular com formulário, fotos com carimbo e rascunho offline, mas grava os paradigmas numa chave e o laudo lê de outra, então as variáveis saem vazias.

## Goals

- [ ] O perito abre no celular as vistorias do dia, chega ao local (Maps/Waze) e marca o resultado com um toque.
- [ ] Registra a vistoria num formulário estruturado (participantes, paradigmas, funções e atividades na versão de cada parte, agentes, documentos, observações) e fotografa com legenda, sem perder nada se a conexão cair.
- [ ] O que foi colhido em campo chega ao laudo como variáveis e fotos, testado de ponta a ponta.

## Out of Scope

| Feature | Reason |
| --- | --- |
| App nativo (lojas) | O web responsivo/PWA cobre o uso; a decisão de offline define o resto. |
| Relatório de produtividade de campo | Valor baixo (★); entra com a gestão (onda 6). |
| Locais frequentes com GPS e endereço padrão do réu | Melhoria de cadastro da agenda, não do campo. |
| Matriz de permissões por perfil (AD-108, proposta) | Spec própria; aqui vale AD-107 (agenda e perícias para qualquer papel). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Slug e rota | `campo-vistorias`; tela `/campo` no `apps/web` (mesmo login e mesma API) | Resposta do usuário: o app de campo usa o mesmo BFF | No |
| Offline | **Pendente (vira AD)**: PWA com service worker + IndexedDB e sincronização, ou só online | Vistoria em subsolo, zona rural e indústria sem sinal | No |
| Conflito local × servidor | **Pendente**: última gravação vence por seção, ou o rascunho local nunca sobrescreve o servidor sem confirmação | Duas pessoas podem editar a mesma vistoria | No |
| Fotos | **Pendente**: compressão (lado maior 1600 px, JPEG) e carimbo (endereço, data e hora) no navegador; limite por vistoria e por arquivo dentro da cota de 1 GB (AD-120); corpo da requisição como AD-118 | Foto de celular tem 3–8 MB; cota é por tenant | No |
| Foto no laudo | **Pendente**: ampliar a allowlist da AD-123 com `img` (só fotos do próprio tenant, servidas pela API) e mapear no PDF e no Word | Hoje o laudo só tem texto e tabela | No |
| Áudio e transcrição | **Pendente**: gravar áudio entra ou fica fora; transcrição é IA → mesmo tratamento da AD-124 | Áudio tem voz e dado de saúde das partes | No |
| Formulário de vistoria | Participantes presentes (nome, qualidade, e-mail), paradigmas por polo, funções com atividades na versão do reclamante × da reclamada (o que fazia, frequência, tempo de exposição, local), agentes Sim/Não com EPI (lista do checklist de campo), documentos solicitados, observações internas | Espelha o checklist de campo do Ethica e o formulário do concorrente | No |
| Assinatura das partes | **Pendente**: assinatura desenhada na tela, gravada como imagem, ou fora | Pedido do usuário (§5 da gap analysis); valor probatório é do termo de comparecimento | No |
| Status rápido | Feita → `done`; adiada e ausente → `canceled` com o motivo gravado (`postponed`/`absent`) | Agenda já tem esses status; motivo distingue sem criar status novo | No |
| Variáveis no laudo | Novas em `LAUDO_VARIAVEIS` lidas da última vistoria feita: presentes, paradigmas, funções/atividades por parte, agentes, documentos; uma só fonte de nome de campo (contrato), testada até o PDF | Evita o defeito do concorrente (§12.1) | No |
| Mapa e rota | **Pendente**: mapa do dia com rota otimizada (provedor e custo de mapa/geocodificação) ou só os links Maps/Waze | Roadmap #9; geocodificação tem custo e cota | No |
| Aviso às partes | **Pendente**: e-mail de agendamento pelo `MailProvider` com modelo configurável, ou fora | Concorrente só gera `mailto:` | No |
| Quem usa | Qualquer papel do tenant (AD-107) registra vistoria e fotos | Vistoria é operação | No |

---

## User Stories

### P1: Rota de campo do dia ⭐ MVP

**Acceptance Criteria**:

1. WHEN o perito abre `/campo` no celular THEN the system SHALL listar as vistorias do dia (horário, status, processo, partes, local, observações) com atalhos para Google Maps e Waze, e permitir trocar o dia.
2. WHEN o perito marca "feita", "adiada" ou "ausente" THEN the system SHALL atualizar o compromisso na agenda com o status e o motivo.

### P1: Registro da vistoria ⭐ MVP

**Acceptance Criteria**:

1. WHEN o perito abre uma vistoria THEN the system SHALL mostrar o formulário em etapas (participantes e paradigmas, funções e atividades por parte, agentes e EPI, documentos, observações), pré-preenchido com as partes da perícia.
2. WHEN o perito preenche e salva THEN the system SHALL gravar o registro ligado ao compromisso e à perícia, sem perder o que já foi salvo em outras etapas.
3. WHEN a vistoria tem registro THEN the system SHALL mostrá-lo no detalhe da perícia e no compromisso da agenda.

### P1: Fotos da vistoria ⭐ MVP

**Acceptance Criteria**:

1. WHEN o perito tira ou escolhe fotos THEN the system SHALL reduzi-las e carimbar endereço, data e hora antes de enviar, e guardar cada uma com legenda no storage do escritório, contando na cota.
2. WHEN a cota ou o limite por vistoria acaba THEN the system SHALL recusar a foto e avisar, mantendo as já enviadas.
3. WHEN o perito abre a perícia THEN the system SHALL mostrar a galeria das fotos de todas as vistorias, com legenda, e permitir excluir uma foto (devolvendo o espaço da cota).

### P1: Campo no laudo ⭐ MVP

**Acceptance Criteria**:

1. WHEN o laudo é criado, aberto ou exportado THEN the system SHALL resolver as variáveis novas da vistoria (presentes, paradigmas, funções e atividades por parte, agentes, documentos) a partir da última vistoria feita.
2. WHEN o perito insere uma foto da galeria numa seção THEN the system SHALL mostrá-la com a legenda no editor, no PDF e no Word (se a decisão de foto no laudo for aceita).

### P2: Vistoria sem conexão

**Acceptance Criteria**:

1. WHEN o celular fica sem conexão THEN the system SHALL continuar abrindo a rota do dia já carregada, editar o formulário e anexar fotos, guardando tudo no aparelho.
2. WHEN a conexão volta THEN the system SHALL enviar o rascunho e as fotos pendentes e mostrar o que foi sincronizado e o que falhou.
3. WHEN o servidor tem uma versão mais nova da mesma vistoria THEN the system SHALL resolver o conflito pela regra decidida, sem apagar dado em silêncio.

### P2: Assinatura e e-mail das partes

**Acceptance Criteria**:

1. WHEN uma parte presente assina na tela THEN the system SHALL guardar a assinatura com o nome, o e-mail e a hora, e listá-la no registro da vistoria.

### P2: Áudio da vistoria

**Acceptance Criteria**:

1. WHEN o perito grava áudio na vistoria THEN the system SHALL guardar o arquivo no storage (contando na cota) e permitir ouvi-lo depois.
2. WHEN o perito pede a transcrição THEN the system SHALL transcrever pelo provedor decidido (se a IA for aceita) e mostrar o texto para revisão.

### P3: Mapa do dia com rota

**Acceptance Criteria**:

1. WHEN o perito abre o mapa do dia e informa o ponto de partida THEN the system SHALL ordenar as vistorias pela menor distância, desenhar a rota e apontar conflito de horário, com reordenação manual.

### P3: Aviso de agendamento às partes

**Acceptance Criteria**:

1. WHEN o perito pede o aviso de uma vistoria THEN the system SHALL enviar e-mail às partes e advogados com e-mail no cadastro, pelo modelo do escritório (tipo, data, hora, endereço, processo, perito, vara), e registrar o envio.

---

## Edge Cases

- Vistoria sem perícia ligada SHALL abrir sem pré-preenchimento de partes e não alimenta laudo.
- Compromisso excluído SHALL excluir o registro e as fotos dele (devolvendo a cota), ou impedir a exclusão com registro — decidir no design.
- Perícia excluída SHALL excluir registros e fotos das vistorias dela.
- Foto que falhou no envio SHALL continuar no aparelho para nova tentativa, nunca sumir.
- Duas vistorias na mesma perícia SHALL alimentar o laudo pela última feita; as anteriores continuam consultáveis.
- Marcador de variável de campo sem vistoria feita SHALL ficar pendente no laudo (bloqueio da AD-126), não vazio.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CAM-01 | P1: Rota de campo do dia | Execute | Verified |
| CAM-02 | P1: Registro da vistoria | Execute | Verified |
| CAM-03 | P1: Fotos da vistoria | Execute | Verified |
| CAM-04 | P1: Campo no laudo | Execute | Verified |
| CAM-05 | P2: Vistoria sem conexão | Execute | Verified |
| CAM-06 | P2: Assinatura e e-mail das partes | Execute | Verified |
| CAM-07 | P2: Áudio da vistoria | Execute | Verified (gravação); transcrição adiada (AD-124) |
| CAM-08 | P3: Mapa do dia com rota | Execute | Verified |
| CAM-09 | P3: Aviso de agendamento às partes | Execute | Verified |

## Success Criteria

- [ ] Uma vistoria registrada no celular gera um laudo com presentes, paradigmas, funções e fotos sem redigitar nada.
- [ ] Nenhuma foto ou campo preenchido em campo se perde por falta de conexão (se o offline entrar).
