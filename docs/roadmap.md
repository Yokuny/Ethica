# Roadmap

Direção, não compromisso. Cada item vira `docs/features/<slug>/` quando começar (protocolo em `AGENTS.md`).

## Agora — spec pronta, aguardando design

| Item | Feature | Notas |
| --- | --- | --- |
| Fotos e anotações da vistoria no laudo; editar e excluir laudo | `laudo-vistoria` | AD-149 |
| Avisos de vencimento financeiro, notificações push e varredura agendada | `avisos-notificacoes` | AD-147 |
| Rotas de vistoria com ponto de partida e serviço de rota próprio | `rotas-vistoria` | AD-150 |
| CRUD de membros só do admin | `gestao-membros` | AD-148 |
| Imagem de produção da API e arquivos por perícia no S3 | `producao-api` | AD-146 |

Em paralelo: validação do que já existe pela perita, com pequenas correções direto na `main` (AD-143).

## Depois

| Item | Notas |
| --- | --- |
| Validar a busca do Datajud com a chave real | Ajustar campos da consulta e mapeamento (AD-105); adiado (AD-145) |
| IA: leitura do PDF da ata, redação do laudo e transcrição do áudio | Spec própria com provedor, limite por tenant e LGPD (AD-114, AD-124); adiado (AD-145) |
| Monitoramento de movimentos no Datajud | Alertar nova movimentação nas perícias e oportunidades |
