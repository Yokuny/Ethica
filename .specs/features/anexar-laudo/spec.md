# Anexar laudo — Specification

**Origem**: pedido da perita em 2026-11-03: "Na seção serviços, subseção laudos, crie um botão para anexar PDF ou importar laudo ou criar laudo a partir de modelos."

## Problem Statement

O laudo feito fora do Ethica (Word, outro sistema) não tem lugar no serviço: a parte de laudos só cria um laudo novo a partir de um modelo. A entrega desse laudo também não é registrada e o texto dele não vira modelo.

## Goals

- [ ] **ANL-01** Na parte de laudos do serviço, dois botões lado a lado: "Anexar PDF / importar laudo" e "Criar a partir de modelo" (o "Iniciar laudo" de antes).
- [ ] **ANL-02** Anexar o PDF: o laudo entra na lista do serviço e na tela Laudos como **Concluído**, com o nome do arquivo; clicando, abre o laudo com o PDF para ver, baixar e excluir. Nada se edita no Ethica.
- [ ] **ANL-03** "Registrar a entrega" ao anexar (marcado por padrão): cumpre o prazo "Entrega do laudo", lança a movimentação e avança a fase, igual a concluir um laudo feito no Ethica.
- [ ] **ANL-04** Depois de anexar, o Ethica pergunta se quer salvar o laudo como modelo na biblioteca de modelos. Sim → o texto do PDF vira um modelo do escritório: cada título numerado ("1. OBJETIVO", "2.1 Metodologia") vira item/subitem e o texto abaixo vira o texto do item. O mesmo "Salvar como modelo" fica no "…" do laudo anexado.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar o laudo anexado no Ethica | Perita escolheu "importar = anexar PDF" (2026-11-03). |
| Importar Word (.docx) | Idem. |
| Exportar o anexado em Word | Só existe o PDF enviado. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Importar laudo | Mesma coisa que anexar PDF, e pergunta se salva como modelo | Perita, 2026-11-03 | Yes |
| Situação do anexado | Concluído, com "Registrar a entrega" | Perita, 2026-11-03 | Yes |
| Botões | Lado a lado | Perita, 2026-11-03 | Yes |
| Tipo do anexado | Laudo ou parecer técnico pelo papel no serviço (perícia → laudo, assistência → parecer) | Mesma regra do título do painel | No |
| PDF sem texto (escaneado) | Anexa normalmente; só o "salvar como modelo" avisa que o PDF não tem texto | O anexo não depende do texto | No |
| Títulos não encontrados no PDF | O modelo nasce com um item só, com todo o texto | Melhor do que recusar | No |
| Excluir o anexado | Quem pode excluir laudo exclui; o prazo já cumprido não volta | Simples; o prazo pode ser reaberto à mão | No |

## Acceptance

1. Anexar um PDF com "Registrar a entrega" → laudo Concluído na lista com o nome do arquivo; prazo "Entrega do laudo" cumprido; fase "Laudo entregue".
2. Abrir o laudo anexado → Visualizar PDF e Exportar PDF devolvem o arquivo enviado; não há Word nem itens.
3. Salvar como modelo → modelo do escritório com os itens numerados do PDF.
4. Excluir o anexado → some da lista e o espaço volta para a cota do escritório.
