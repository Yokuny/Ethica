# Novo laudo — Specification

**Origem**: pedido da perita (Tamires) em 2026-11-03, com o laudo `Laudo_ETH-2026-008 · 5005246-12.2020.8.21.0039.pdf` como modelo, o protótipo `index_tabela.html` (itens com "Faz parte do laudo", "Recolher" e "pendente · vistoria") e o bloco shadcnblocks `feature207` (lista numerada com separadores) como referência visual.

## Problem Statement

O laudo trabalhista que a perita usa (21 itens, subitens até o 3º nível, página de abertura ao juiz e "É o laudo." com assinatura) não existe como modelo no Ethica. O laudo sempre sai assinado por quem gera o arquivo, com o cabeçalho, rodapé e logo do escritório, sem OS e sem escolher quem é o responsável técnico. O editor mostra uma seção por vez, sem visão do laudo inteiro, sem incluir um item novo no meio e sem ajustar o layout.

## Goals

- [ ] Número de controle de OS por serviço, com a sequência do escritório (sigla + ano + sequência).
- [ ] Responsável técnico do laudo: a dona da conta ou um responsável cadastrado (sem acesso ao Ethica) com dados, logo, cabeçalho e rodapé próprios.
- [ ] Modelo "Laudo pericial trabalhista" com os mesmos itens e subitens do modelo da perita.
- [ ] Editor em rolagem com todos os itens, expandir/recolher tudo e um a um, "Faz parte do laudo", "Adicionar item".
- [ ] Layout do laudo personalizável: fonte e tamanho, margens e espaçamento, capa/sumário/abertura e cor dos títulos.
- [ ] Botão "Novo laudo" na seção Laudos.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Numerar os serviços já cadastrados | Perita escolheu "só os novos" (2026-11-03); o número dos antigos pode ser digitado. |
| Acesso ao Ethica para o responsável técnico cadastrado | Perita escolheu "só cadastro" (2026-11-03). |
| Fontes além de Times New Roman e Arial | O servidor de PDF só tem essas duas famílias (Liberation Serif/Sans). |
| Cidade ("Itajaí/SC") antes da data | O Ethica não guarda a cidade do escritório; a data sai por extenso como hoje. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Formato da OS | Sigla + ano + sequência de 3 dígitos (ETH-2026-008), volta a 1 em janeiro | Perita, 2026-11-03 | Yes |
| Serviços antigos | Só os novos recebem OS automática; a OS pode ser digitada/corrigida no serviço | Perita, 2026-11-03 | Yes |
| Responsável técnico novo | Só cadastro (nome, CPF, registro, formação, telefone, logo, cabeçalho, rodapé) | Perita, 2026-11-03 | Yes |
| Layout | Fonte e tamanho, margens e espaçamento, capa/sumário/abertura e cor dos títulos | Perita, 2026-11-03 | Yes |
| Modelo atual | O modelo trabalhista novo entra ao lado do modelo atual e vira o padrão do "Novo laudo" | "Adicione o modelo em modelos de laudo" | No |
| Texto dos itens do modelo | Os itens chegam vazios, exceto os que o Ethica já sabe preencher (objeto, dados do processo, local e data, presentes, período, função, anexos da NR-15/NR-16, quesitos, honorários, encerramento) | O PDF de referência só tem os títulos | No |
| "Faz parte do laudo" desmarcado | O item fica no rascunho com o texto, mas não sai no PDF/Word nem conta na numeração | Protótipo da perita | No |
| Selo "pendente" | Item marcado sem texto ou com dado sem valor | Protótipo da perita | No |
| Layout por modelo | O modelo guarda o layout; o laudo nasce com o do modelo e pode mudar o seu | Cada tipo de laudo tem sua cara | No |

---

## Requirements

- **NLA-01** Controle de OS no Escritório, depois de logo, cabeçalho e rodapé: "O escritório já tem número de controle de OS?".
  1. Sim → sigla, ano e último número usado; o próximo serviço recebe o número seguinte.
  2. Não → "Criar sequência de OS" com a sigla; começa em 001 no ano atual.
  3. WHEN a sequência existe e um serviço é cadastrado sem OS digitada THEN the system SHALL dar o próximo número; WHEN o ano muda THEN a sequência SHALL voltar a 001.
  4. A OS aparece e pode ser editada no cadastro/detalhe do serviço; duas OS iguais no escritório SHALL ser recusadas.
- **NLA-02** Responsável técnico.
  1. Cadastro de responsáveis técnicos (nome, CPF, registro profissional, formação, telefone, logo, cabeçalho, rodapé) no Escritório e no "Novo laudo".
  2. WHEN o laudo tem responsável cadastrado THEN capa, abertura, assinatura, variáveis `[PERITO_*]`, logo, cabeçalho e rodapé SHALL usar os dados dele (cabeçalho/rodapé/logo vazios caem nos do escritório); sem responsável, os da dona da conta que criou o laudo.
- **NLA-03** Novo laudo: botão "Novo laudo" no hub e na lista de Laudos. A tela pede, em ordem: serviço (número do processo ou serviço) com a OS vinculada (digitável se o serviço não tiver), responsável técnico com os dados pessoais (com "Cadastrar novo responsável") e modelo/itens.
- **NLA-04** Modelo padrão "Laudo pericial trabalhista" com os itens do PDF da perita, inclusive "Objeto da perícia" e "Considerações preliminares" sem número; abertura ao juiz e "É o laudo." com assinatura ligados no layout.
- **NLA-05** Editor em rolagem: todos os itens numerados numa lista (número, título e prévia do texto), expandir tudo, recolher tudo, expandir/recolher um a um; "Faz parte do laudo"; selo "pendente"; "Adicionar item" (item ou subitem) abaixo de qualquer item; remover item.
- **NLA-06** Layout no modelo e no laudo: fonte (Times New Roman, Arial), tamanho (10–14), entrelinha, espaço entre parágrafos, margens (cm), cor dos títulos, capa, sumário e abertura/assinatura final; vale no PDF e no Word.
- **NLA-07** Componente padrão do sistema para lista numerada expansível, no visual do `feature207`.

## Design (inline)

- **OS** (`Case.serviceOrder`, texto): `Tenant.serviceOrder = { prefix, year, last }` (dono `identity`). `officeService.nextServiceOrder` incrementa num único update com pipeline (ano diferente → 1), sem corrida. `case.service.createCase` pede o número quando o cadastro não traz OS. Índice único parcial `{ Tenant, serviceOrder }`. Variável `[NUMERO_OS]`.
- **Responsável técnico** = `Signatory` (glossário): coleção própria, dona `documents`, com logo no storage pela cota do escritório (AD-120). `Report.Signatory` opcional; a exportação monta `expert`/`identity` a partir dele. Rotas em `/expert-reports/signatories` com a permissão `expert_reports`.
- **Modelos padrão**: `REPORT_DEFAULT_TEMPLATES` passa a ser lista (id → tipo); o primeiro do tipo é o padrão do "Novo laudo".
- **Seção**: `unnumbered` (modelo e laudo) e `included` (laudo). `numberSections` pula as sem número e as fora do laudo; exportação e pendências ignoram as fora do laudo. `POST /expert-reports/:id/sections` adiciona item depois de outro; refazer a escolha de seções do mesmo modelo mantém os itens adicionados.
- **Layout** (`reportLayoutSchema` no contrato) em `Template.layout` e `Report.layout`; `PUT /templates/:id/layout` e `PUT /:id/layout`. PDF: CSS e margens do Chromium vindos do layout; Word: estilos, margens e blocos.
- **Web**: `apps/web/src/components/numbered-list.tsx` (NLA-07); `details/` passa a ser a lista em rolagem; `add/` em três painéis; `src/components/signatory-dialog.tsx` compartilhado entre Escritório e Novo laudo.
