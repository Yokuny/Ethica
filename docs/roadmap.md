# Roadmap

Planejamento dos próximos passos e checklist do que ficou para trás. Direção, não compromisso: cada
item novo vira `docs/features/<slug>/` quando começar (protocolo em `AGENTS.md`). O detalhe de cada
pendência fica no `feature.md` indicado; aqui só a ação, quem faz e a feature.

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
| Assinatura pelo Ethica: trocar de plano, cancelar e ver faturas | Hoje pelo suporte (`cadastro-checkout`, AD-230) |
| Trocar o e-mail da conta | `acesso-email` |
| PDF escaneado (sem texto): OCR | Ata na importação e anexo do laudo (`importacao-processos`, `anexar-laudo`) |
| Gerar PDF fora da requisição (fila) | Só com volume (`documentos-pdf`) |

## A fazer

`[ ]` aberto. Ao resolver, marque `[x]`, acrescente a data e mova para "Resolvidos".

### Ir ao ar — você

Sem os itens da assinatura, todo cadastro novo fica sem acesso e "Pagar" responde "indisponível".

- [ ] Abrir a conta de produção do Asaas com o **CNPJ da empresa do Ethica** e concluir a aprovação cadastral — `cadastro-checkout`
- [ ] Cadastrar o domínio do Ethica no Asaas (Minha Conta > Informações) e então preencher `ASAAS_RETURN_URL` na Railway — `cadastro-checkout`
- [ ] Railway: `ASAAS_API_URL` (produção `https://api.asaas.com/v3`), `ASAAS_API_KEY` de produção e `ASAAS_WEBHOOK_TOKEN` — `cadastro-checkout`
- [ ] Painel do Asaas: webhook para `<API>/billing/webhook` com os eventos de cobrança, envio sequencial e o mesmo token — `cadastro-checkout`
- [ ] Validar no sandbox com a API publicada: cadastro → fatura paga com cartão de teste → webhook chega → acesso liberado — `cadastro-checkout`
- [ ] Validar com dados reais em produção: pagar o teste (R$ 6) com cartão de verdade, ver o acesso abrir, estornar no painel e ver o acesso fechar — `cadastro-checkout`
- [ ] Railway: `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` com domínio verificado no Resend; remover `SMTP_*` — `acesso-email`
- [ ] Criar os projetos na Railway e na Vercel e o cluster no Atlas; conferir se o domínio da Railway bate com o `vercel.json` — `producao-api`
- [ ] Railway: `S3_BUCKET`, trocar a chave de `ethica-files-api` (apareceu em conversas) e conferir logo e anexo em produção — `producao-api`, `servico-pasta-anexos`

### Validar e confirmar — você (e a perita)

- [ ] Confirmar as perguntas em aberto das specs: `avisos-notificacoes`, `gestao-membros`, `laudo-vistoria`, `rotas-vistoria`, `producao-api`
- [ ] Ativar e entrar com digital/PIN de verdade num computador e num celular — `acesso-aparelho`
- [ ] Conferir as telas no navegador: `agenda-eventos`, `anexar-laudo`, `fase-assistencia`, `novo-laudo`, `partes-servico`, `preencher-pdfs`, `rotina-servico`, `servicos`; UAT geral com o seed — `fundacao-ethica`
- [ ] Conferir no celular: gráfico de serviços (`dashboard`), telas e exportação das listas (`filtros-lista`)
- [ ] Conferir no navegador as tabelas por mês e os rankings do Dashboard e do Início, e o menu "…" com Importar planilha em Serviços e Varas — `dashboard`
- [ ] PDF com a fonte Source Sans em produção — `biblioteca-modelos`
- [ ] Revisar os textos das fases (`fase-servico`) e os textos-base do laudo e da biblioteca NR-15/NR-16 (`laudo-montagem`, `laudos`, `novo-laudo`)
- [ ] Testar a leitura com atas e processos reais de outros tribunais — `importacao-processos`, `laudo-montagem`
- [ ] Assinar o feed num Google Agenda de verdade — `prazos-recebimentos`
- [ ] Planilha com a base de varas e comarcas (24 TRTs) — `contatos-varas`, `partes-servico`, `rotina-servico`
- [ ] Conferir as telas logadas nos temas Escuro e Azul (lista, serviço, agenda, dashboard, Conta/Escritório, celular) — `temas`
- [ ] Conferir o tour guiado no navegador (menu aberto e recolhido, celular, operador) e revisar os textos — `tour-guiado`

### Código que ficou para trás — agente

- [ ] Desativar membro apaga as passkeys dele (junto com `gestao-membros`) — `acesso-aparelho`
- [ ] Estorno de um pagamento fecha o acesso mesmo com outro pagamento valendo (AD-232) — `cadastro-checkout`
- [ ] Excluir o laudo anexado reabrir o prazo "Entrega do laudo" — `anexar-laudo`
- [ ] Assinatura apagada deixa o presente sem arquivo — `campo-vistorias`
- [ ] Número do processo quebra no meio nas colunas estreitas do PDF — `documentos-pdf`
- [ ] Movimentação automática ao protocolar o laudo ou receber parcela (AD-121) — `documentos-pdf`
- [ ] Rótulo legível no histórico de auditoria (permissões e exclusões) e histórico na exportação ZIP — `gestao-escritorio`
- [ ] Excluir e mesclar partes duplicadas — `importacao-processos`
- [ ] Excluir a perícia apagar as fotos do laudo no storage — `laudo-montagem`
- [ ] Sumário do PDF do laudo com número de página — `laudos`
- [ ] Cidade do escritório para "Itajaí/SC, …" no laudo — `biblioteca-modelos`, `novo-laudo`
- [ ] Imagens do Word importado como modelo — `biblioteca-modelos`
- [ ] Honorário fixado reduzido abaixo do recebido avisar na tela (hoje só no log) — `prazos-recebimentos`
- [ ] Relatório financeiro separar as categorias novas (hoje em "Outras despesas"); excluir e renomear tipo de serviço e categoria — `servicos`
- [ ] Confirmar a busca de endereço no formato novo quando o OpenStreetMap voltar a aceitar (AD-214) — `custo-deslocamento`
- [ ] Investigar o estouro de tempo esporádico dos testes de tela — `fundacao-ethica`

## Resolvidos

- [x] 2026-11-20 — Temas Claro, Escuro e Azul (dourado) e cor de ação única nos botões e detalhes (AD-237) — `temas`
- [x] 2026-11-19 — Serviços por mês/tipo e Início com número escrito: tabela por mês e rankings (AD-236) — `dashboard`
- [x] 2026-11-19 — Dashboard com valores escritos: fluxo de caixa em tabela de calor e categorias em ranking (AD-235) — `dashboard`
- [x] 2026-11-18 — Tutorial de uso para novos usuários: tour guiado do primeiro acesso, por permissão (AD-233) — `tour-guiado`
- [x] 2026-11-18 — Rodar `integration`/`e2e` com o Mongo local (642 testes verdes) — `fundacao-ethica`
- [x] 2026-11-18 — Estorno e chargeback tiram o período pago (AD-232) — `cadastro-checkout`
- [x] 2026-11-18 — Teste com os 5 dias de carência (AD-231) — `cadastro-checkout`
- [x] 2026-11-18 — Conferido no sandbox do Asaas: cartão salvo na assinatura após a primeira fatura e CNPJ inválido recusado (o cadastro passou a conferir o dígito) — `cadastro-checkout`
