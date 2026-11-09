# Biblioteca de modelos — Specification

**Origem**: pedido da perita em 2026-11-09: "Na sessão laudos, subdivida a sessão em Biblioteca padrão, onde serão disponibilizados modelos padrão aos usuários, e a biblioteca do escritório, onde o usuário poderá importar, editar, reorganizar e salvar seus próprios modelos mais usados, por área de atuação dos seus serviços. [...] Use o layout padrão personalizável em anexo para os modelos da biblioteca padrão." Anexo: laudo `ETH-2026-001` (processo 5000096-57.2015.8.21.0158) impresso do Ethica com o layout desejado.

## Problem Statement

A tela Modelos mistura os modelos do sistema e os do escritório numa lista só, sem separação por área. O modelo do escritório só nasce em branco, duplicando outro ou salvando um laudo; não dá para importar o PDF ou o Word que a perita já usa. O PDF e o Word do laudo saem com uma capa e títulos simples, diferentes do layout que ela entrega.

## Goals

- [ ] **BIB-01** A tela Modelos tem duas abas: **Biblioteca padrão** e **Biblioteca do escritório**.
- [ ] **BIB-02** Biblioteca padrão (só leitura, igual para todo escritório): Laudo pericial trabalhista, Parecer técnico, Impugnação de laudo pericial trabalhista e Laudo pericial (NR-15 e NR-16). Cada um tem "Usar no escritório", que copia o modelo para a Biblioteca do escritório.
- [ ] **BIB-03** Biblioteca do escritório agrupada por **área de atuação**, que são os tipos de serviço: Perícia trabalhista, Perícia cível, Perícia federal, Assistência técnica e os tipos próprios do escritório. A área se escolhe ao criar, importar ou copiar e se muda em "Editar nome e detalhes". Modelo sem área fica no grupo "Sem área".
- [ ] **BIB-04** "Importar modelo" na Biblioteca do escritório: arquivo PDF ou Word (.docx), nome, tipo (laudo ou parecer) e área. Cada título numerado ("1. OBJETIVO", "2.1 Metodologia") ou estilo de título do Word vira item ou subitem; o texto abaixo vira o texto do item; o sumário do arquivo é ignorado. No Word, negrito, itálico, sublinhado, listas e tabelas são mantidos. Depois de importar, abre o modelo para editar e reorganizar.
- [ ] **BIB-05** Ao escolher o modelo de um laudo, os modelos da área do serviço aparecem primeiro.
- [ ] **BIB-06** Layout do anexo como padrão: fonte Source Sans, títulos azul-marinho, capa (logo, título grande, "Diligência pericial de [data]" e local, quadro com processo e perito(a)/assistente, local e data e assinatura à direita), sumário, página de abertura ao juiz e fecho "É o laudo."/"É o parecer." com assinatura. Vale para os modelos padrão e para todo modelo novo do escritório, no PDF e no Word; personalizável no "Layout" do modelo e do laudo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Importar .doc (Word antigo), ODT ou PDF escaneado | Só .pdf com texto e .docx. |
| Imagens dentro do Word importado | As fotos do laudo vêm da vistoria ou do próprio laudo. |
| Editar a Biblioteca padrão pela tela | Os modelos padrão vivem no código (AD-127). |
| Número de página no sumário do PDF | Pendência antiga (AD-125). |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Área de atuação | Os tipos de serviço (esferas da perícia, assistência técnica e tipos próprios) | Perita, 2026-11-09 | Yes |
| Arquivos importados | PDF e Word | Perita, 2026-11-09 | Yes |
| Laudo pericial (NR-15 e NR-16) | Fica como quarto modelo padrão | Perita, 2026-11-09 | Yes |
| Layout do modelo novo do escritório | O mesmo do anexo | Perita, 2026-11-09 | Yes |
| Abas ou duas listas | Abas | Molde das abas da AD-193 | No |
| Área dos modelos padrão | Laudos → Perícia trabalhista; parecer e impugnação → Assistência técnica | Pelo uso de cada um | No |
| Cabeçalho e rodapé | Seguem os do Escritório (já personalizáveis) | O anexo usa os do escritório | No |

## Acceptance

1. Modelos abre na Biblioteca padrão com os quatro modelos; a aba Biblioteca do escritório mostra os modelos do escritório em grupos por área.
2. "Usar no escritório" no Parecer técnico com a área Assistência técnica → o modelo aparece no grupo Assistência técnica, editável.
3. Importar um Word com títulos e uma tabela → modelo com os itens e a tabela; importar um PDF com sumário → o sumário não vira itens.
4. Novo laudo de um serviço de perícia trabalhista → os modelos da área Perícia trabalhista no topo da escolha.
5. Exportar PDF e Word de um laudo do modelo padrão → capa, sumário, abertura e fecho como no anexo.
