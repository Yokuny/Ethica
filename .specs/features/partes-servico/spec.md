# Partes do serviço — Specification

**Origem**: pedido da perita (Tamires) em 2026-11-03, depois da entrega do `novo-laudo`.

## Problem Statement

No cadastro do serviço as partes e os advogados são linhas soltas, sem dizer quem representa quem; o bloco "Dados do laudo trabalhista" repete o que o laudo já pede; a data e a hora da perícia travam o cadastro quando ainda não existem. Na seção Partes o mesmo nome aparece mais de uma vez, sem CREA e com os contatos que o PDF do processo traz ficando para trás. Ao iniciar um laudo pelo serviço só aparecem os modelos do tipo da atuação.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Base de varas dos 24 TRTs | A perita vai cadastrar depois, a partir dos sites dos tribunais (AD-151 segue). |
| Juntar homônimos com documentos diferentes | Dois CPFs/OABs/CREAs diferentes são pessoas diferentes. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Partes no serviço | Cada parte (reclamante/reclamada ou autor/réu) com os advogados dela dentro | Perita, 2026-11-03 | Yes |
| Nome repetido | Juntar num cadastro só, com todos os serviços, documento e contatos | Perita, 2026-11-03 | Yes |
| Registro e contato | Campo CREA no cadastro e leitura de CPF/CNPJ, OAB, CREA, telefone e e-mail pelo PDF | Perita, 2026-11-03 | Yes |
| Como juntar os que já existem | Botão "Juntar repetidos" na seção Partes; os novos já não se repetem (nome sem diferença de maiúscula, acento e espaço) | O sistema em produção já tem repetidos | No |
| Data da perícia | Data e hora em branco salvam o serviço sem compromisso; hora só é pedida quando há data | "não são obrigatórios" | No |
| Modelo pelo serviço | Lista todos os modelos (laudo e parecer); o tipo do documento vem do modelo escolhido | "modelo da base cadastrada" | No |
| Local periciado | Sem o bloco trabalhista, o local digitado na perícia vira o local do serviço (`[LOCAL_PERICIA]`) | O campo saía junto com o bloco | No |

## Requirements

- **PSV-01** Partes do serviço agrupadas: cada linha é uma parte (polo pela justiça, nome, CPF/CNPJ) com "Adicionar advogado" dentro (nome, OAB). O advogado herda o polo da parte.
- **PSV-02** Sai o bloco "Dados do laudo trabalhista" do cadastro e da edição do serviço.
- **PSV-03** Data, hora e local da perícia opcionais; com data, a hora é pedida.
- **PSV-04** Ao iniciar o laudo pelo serviço, todos os modelos cadastrados aparecem para escolha.
- **PSV-05** Seção Partes: sem repetição de nome por tipo (botão "Juntar repetidos" e reaproveitamento sem diferença de maiúscula/acento); CREA no cadastro; a lista mostra registro, telefone e e-mail.
- **PSV-06** PDF do processo: CPF/CNPJ, OAB, CREA, telefone e e-mail das partes e advogados são lidos e gravados no cadastro da parte (sem apagar o que já existe).

## Design (inline)

- Contrato `party.schema.ts`: `crea` (normalizado) no cadastro e na entrada da parte do serviço, que também passa a aceitar `email` e `phone`. `resolveParties` reaproveita pelo nome normalizado (`nameKey`: minúsculas, sem acento, espaço único) e completa o que faltar no cadastro existente.
- `Party.nameKey` (índice) para achar repetidos; `POST /parties/merge-duplicates` (admin) junta por tipo + `nameKey` quando os documentos não conflitam, mantém o mais antigo, completa os campos e troca a referência nas perícias.
- Ordem das partes no serviço: advogado vem logo depois da parte que representa; a tela agrupa por essa ordem, sem campo novo.
- `caseInspectionSchema`: `date`/`time` opcionais, `time` exigida com `date`; sem data não há evento de compromisso; `location` da perícia preenche `Case.location` quando vazio.
- Laudo: `createReport` usa o tipo do modelo escolhido (não mais o da atuação); `TemplateSelect` sem filtro de tipo na criação.
