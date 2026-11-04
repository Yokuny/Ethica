# Preencher com vários PDFs — Specification

**Origem**: pedido da perita em 2026-11-04: em `/expert-cases/add`, o "Preencher com PDF ou ZIP" vira "Preencher com PDF", abre uma janela com uma barra de etapas no topo; 1) enviar vários PDFs (visual do bloco `file-upload-06` do blocks.so); 2) como são vários documentos, escolher qual valor achado preenche cada campo; 3) enviar e preencher o formulário do serviço.

## Goals

- [ ] **PPF-01** O botão passa a "Preencher com PDF" e abre uma janela com as etapas "Arquivos", "Escolher valores" e "Preencher", com barra de progresso no topo.
- [ ] **PPF-02** Etapa 1: soltar ou escolher vários PDFs; cada arquivo aparece com a situação (lendo, lido, erro), os avisos daquele arquivo (vários números, perícia já cadastrada com link) e pode ser removido. Avança com ao menos um arquivo lido e nenhum em leitura.
- [ ] **PPF-03** Etapa 2: para cada campo do cadastro que o PDF preenche (número, tribunal, vara, comarca, objeto, nomeação), uma lista com os valores diferentes achados e o arquivo de origem; já vem marcado o primeiro arquivo que trouxe o valor. Partes: todas as partes achadas, sem repetição, marcáveis uma a uma (já vêm marcadas). Campos não achados em nenhum arquivo aparecem listados.
- [ ] **PPF-04** Etapa 3: resumo do que vai entrar e o botão "Preencher": o formulário recebe os valores escolhidos, sem apagar o que a perita já digitou nos outros campos. Nada é gravado até salvar (AD-115).
- [ ] **PPF-05** O ZIP sai (supersede AD-173): processo em partes = enviar as partes como vários PDFs.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Juntar o texto dos PDFs num só antes de ler | Cada PDF é lido sozinho; a perita escolhe o valor. |
| PDF escaneado | Continua fora (AD-114). |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| "Campos aceitos no modelo do laudo atual" | Os campos do formulário do serviço que a leitura do PDF preenche | A tela `/expert-cases/add` é o cadastro do serviço | No |
| Valor marcado de início | O do primeiro arquivo enviado que trouxe o campo | Menos cliques | No |
| Formulário já digitado | Mantido; só os campos escolhidos mudam | Não perder digitação | No |
