# Link da pasta e anexos do serviço

**Pedido**: perita, 2026-11-05. **Prefixo**: SPA.

## Requisitos

- **SPA-01** Campo "Link da pasta" no cadastro de serviços, para OneDrive, Google Drive, Dropbox ou outro. Fica no primeiro bloco do formulário, que todos os tipos têm ("Processo" na perícia, "Serviço" nos demais). Só aceita endereço `http` ou `https`.
- **SPA-02** O detalhe do serviço mostra o link, que abre em outra aba.
- **SPA-03** Junto às Observações do cadastro (novo e edição), a opção de anexar arquivos, vários por serviço (escolha da perita).
- **SPA-04** Os anexos aparecem no detalhe do serviço; cada um abre/baixa. Na edição, um anexo salvo pode ser removido.
- **SPA-05** Anexo conta na cota de arquivos do escritório (AD-120) e devolve o espaço ao ser removido ou ao excluir o serviço.
- **SPA-06** Mesma permissão do serviço: quem vê baixa, quem altera anexa e remove (AD-137).

## Decisões de comportamento

| Assunto | Decisão | Quem |
| --- | --- | --- |
| Lugar do link | Primeiro bloco do formulário, em todos os tipos | Agente, autorizado pela perita ("na subseção mais coerente") |
| Quantidade de anexos | Vários por serviço | Perita |
| Limites | 20 MB por arquivo, 30 por serviço; PDF, imagem, Word, Excel, texto, CSV e ZIP | Agente |

## Design

- `Case.folderUrl` e `Case.attachments` (`key`, `name`, `mime`, `bytes`), no mesmo documento do serviço. Sem migração.
- Arquivo como corpo da requisição (AD-118) e chave `tenants/<tenantId>/expert-cases/<caseId>/<uuid>` no storage (AD-120); a cota é reservada antes de gravar.
- Rotas em `/expert-cases/:id/attachments`: `POST ?name=`, `GET /:attachmentId`, `DELETE /:attachmentId`. A resposta sempre baixa o arquivo (`Content-Disposition: attachment`), para um HTML enviado não rodar no domínio da API.
- No cadastro novo o serviço ainda não existe: os arquivos ficam na tela e sobem logo depois de salvar; o mesmo vale na edição. Falha num arquivo avisa e não desfaz o serviço salvo.

## Tasks

1. Contrato, model, rotas e testes da API. Gate: `pnpm vitest run apps/api/src/modules/case/case.router.e2e.test.ts`.
2. Formulário, detalhe e testes da tela. Gate: `pnpm run check` e build do web.
3. Conferência no navegador, `feature.md`, `pnpm docs:sync`, envio.
