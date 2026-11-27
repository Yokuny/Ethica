# Conteúdo dos movimentos do tribunal (descoberta, 2026-11-26)

Pedido do usuário: a seção No tribunal (`apps/web/src/routes/_private/expert-cases/details/@components/case-court.tsx`)
mostra só o nome do movimento ("Expedição de documento"), sem o conteúdo, sem saber qual documento foi destinado à
perita e sem o conteúdo do alvará. Também: muitos dados desnecessários na lista.

## O que cada fonte entrega (consultas reais em 2026-11-26)

### Datajud (fonte de hoje)

Processo 0017068-93.2025.5.16.0008 (TRT16): 84 movimentos, o mais recente de 26/10/2026 (o Datajud atrasa: o DJEN
já tem 19/11). Por movimento: código, nome, data/hora e complementos tabelados — no 60 "Expedição de documento", só
o tipo (`Outros documentos`, `Ofício`, `Alvará`). **Não há texto, destinatário nem link do documento.**

Ruído na lista: Expedição de documento 23, Decurso de Prazo 14, Publicação 9, Disponibilização no DJE 9 (sempre em
par com a Publicação), Conclusão 7, Mero expediente 5.

### DJEN — Comunica PJe (`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=<20 dígitos>`)

Pública, sem chave. Mesmo processo: 11 comunicações (intimações e a lista de distribuição), cada uma com o **texto
inteiro** (despacho, prazo, data da perícia), tipo, órgão e **link do documento no PJe** (`/pjekz/validacao/<id>`).

- O id do link começa pela data/hora da expedição (`261024175706…` = 24/10/2026 17:57:06) e casa com o movimento 60
  do Datajud do mesmo minuto: dá para pôr o texto ao lado da "Expedição de documento" quando ela foi publicada.
- `destinatarios` **não é "para quem"**: é a lista de partes do processo no dia (a perita Tamires aparece em
  intimações cujo texto diz "DESTINATÁRIO: MARCOS…"). Quem é intimado está no texto ("DESTINATÁRIO: …",
  "Intimado(s) / Citado(s) - …"); a perita aparece pelo nome ou por "perita" no texto.
- **Alvará não sai no DJEN**: dois processos com alvarás e RPV (TRT24) têm 0 e 2 comunicações, nenhuma de alvará.
  O alvará e a notificação feita direto à perita pelo PJe ficam só nos autos (exigem login/certificado).

## Questões para a perita

1. Trazer as comunicações do DJEN (texto + link do PJe) para os serviços acompanhados, marcando as que citam a perita?
   Exige AD nova (a AD-281 reservou o DJEN para a descoberta de nomeações) e decisão sobre guardar texto com nomes de
   partes (o `CourtProcess` hoje não guarda partes) ou buscar na hora, sem guardar (sem aviso no sino).
2. Limpar a lista: esconder Decurso de Prazo, juntar Publicação + Disponibilização, agrupar as expedições iguais do
   mesmo dia ("Alvará ×16").
3. Alvará: não há fonte pública com o conteúdo; seguir com a sugestão de recebimento (AD-269/AD-274) e o link do PJe.

## Papel de cada fonte (análise pedida pelo usuário, 2026-11-26)

- **Datajud** = situação do processo em código (TPU do CNJ). É o que move as regras de hoje
  (`packages/contracts/src/schemas/automation-rules.ts`): suspensão, retomada, acordo, desistência/extinção, sentença
  e pagamento (alvará 60 + complemento 73, RPV/precatório pago 12176/12169). Também traz classe, assuntos, vara,
  data de ajuizamento, grau e sistema. Não traz partes, perito nem texto, por isso não descobre nomeação (AD-281).
  Atrasa semanas e o cluster do CNJ vive sobrecarregado (AD-287, AD-303).
- **DJEN** = o que foi publicado, em texto: intimações, despachos, prazos, data da perícia, link do PJe e a lista de
  partes do dia (a perita aparece nela). Busca por número, nome da parte, OAB, tribunal e período. Não tem código de
  situação e não publica alvará nem pagamento.
- Proposta: os dois ficam, cada um com um papel. DJEN para descobrir nomeação e ler o conteúdo/prazo; Datajud para
  preencher o serviço pelo número (vara, classe, assuntos) e para as sugestões de situação e pagamento. Na tela, uma
  linha do tempo só: movimentos do Datajud sem ruído, com o texto do DJEN preso à expedição do mesmo minuto.
