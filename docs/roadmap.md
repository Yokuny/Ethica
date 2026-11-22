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
| Cartão dentro do Ethica em vez da fatura do Asaas | Dados do cartão passariam pela API (PCI-DSS); PIX e boleto já são no Ethica (AD-251, `cadastro-checkout`) |
| Assinatura pelo Ethica: trocar de plano, cancelar e ver faturas | Hoje pelo suporte (`cadastro-checkout`, AD-230) |
| Trocar o e-mail da conta | `acesso-email` |
| PDF escaneado (sem texto): OCR | Ata na importação e anexo do laudo (`importacao-processos`, `anexar-laudo`) |
| Gerar PDF fora da requisição (fila) | Só com volume (`documentos-pdf`) |

## A fazer

`[ ]` aberto. Ao resolver, marque `[x]`, acrescente a data e mova para "Resolvidos".

### Ir ao ar — você

- [ ] Asaas sandbox: entrar em `sandbox.asaas.com` e concluir o cadastro ("Conclua seu cadastro", dados pessoais); com a conta aprovada, criar uma chave Pix aleatória em Pix > Minhas chaves para testar o QR Code em dev. Sem webhook no sandbox: a Railway usa a chave de produção — `cadastro-checkout`
- [ ] Reiniciar a API local para ler o `ASAAS_WEBHOOK_TOKEN` novo; a tela de planos já confere o pagamento do sandbox sem túnel — `cadastro-checkout`
- [ ] Perita: decidir se o Teste só permite uma pessoa (bloquear convites até o primeiro plano pago); hoje a diferença "Só você" × "Quantas pessoas quiser" está só no texto da tela de planos (AD-247) — `cadastro-checkout`
- [ ] Perita: endereço, telefone e e-mail do Ethica para o topo da página Contato, como no modelo — `paginas-publicas`
- [ ] Texto final de Termos de uso e Política de privacidade, revisado por advogado (LGPD: controlador, encarregado, compartilhamento com Asaas, e-mail e armazenamento, dados do formulário de contato) — `paginas-publicas`
- [ ] Perita: revisar os textos da página de planos (posicionamento, perguntas frequentes) — `cadastro-checkout`
- [ ] Validar com dinheiro de verdade em `https://ethica-zeta.vercel.app` — `cadastro-checkout`
  1. Janela anônima: criar um escritório novo (e-mail e CPF/CNPJ seus).
  2. Planos > Teste > PIX: aparecendo o QR Code, pagar os R$ 6 e ver a tela confirmar e entrar sozinha. Aparecendo "PIX indisponível", anotar e pagar por Cartão de crédito ou débito (fatura do Asaas).
  3. Estornar a cobrança no painel do Asaas (Cobranças), recarregar o Ethica e ver o acesso fechar.
  4. Asaas > Integrações > Webhooks > "Ethica billing": conferir nos logs que as entregas saíram com sucesso e que a fila não está pausada.
  5. Trazer ao agente: QR Code ou "PIX indisponível", quanto tempo levou para entrar e se o estorno fechou o acesso. "PIX indisponível" com chave Pix cadastrada pede criar a cobrança do PIX como `PIX` (pendência do `cadastro-checkout`).
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
- [ ] Conferir no navegador a lista e o detalhe de Serviços após a AD-238 (linha da OS, tabela em uma linha, "Não preenchido") — `servicos`
- [ ] Conferir as telas logadas nos temas Escuro e Azul (lista, serviço, agenda, dashboard, Conta/Escritório, celular) — `temas`
- [ ] Conferir a Logística no navegador e no celular (hub, Mapa com a faixa de dias, Planejamento de rota, Serviços agendados, intervalo de datas, assinaturas e termo em PDF) e confirmar observações internas fora do PDF — `logistica-paginas`
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

- [x] 2026-11-21 — Modelo aberto (`/expert-reports/templates/details`) no mesmo padrão do laudo aberto: lista numerada, expandir/recolher, setas e "…" por seção — `biblioteca-modelos`
- [x] 2026-11-21 — `seed:templates`: modelos de laudo e parecer de todas as áreas na biblioteca do escritório — `fundacao-ethica`
- [x] 2026-11-21 — `seed:volume` com e-mails e links no formato real, sem `example.com`/`exemplo` — `fundacao-ethica`
- [x] 2026-11-21 — Produção configurada: Railway com as variáveis do Asaas (URL, chave, token do webhook, retorno para `https://ethica-zeta.vercel.app/billing`), `CONTACT_EMAIL` e Resend conferido, `SMTP_*` removidas; Asaas com webhook "Ethica billing" (quatro eventos, envio sequencial, token), chave Pix e Site cadastrados — `cadastro-checkout`, `paginas-publicas`, `acesso-email`, `producao-api`
- [x] 2026-11-21 — PIX e boleto na tela do Ethica, cartão na fatura do Asaas, e acesso aberto sem webhook pela conferência da tela de planos (AD-251) — `cadastro-checkout`
- [x] 2026-11-21 — Conta de produção do Asaas aprovada (MEI) — `cadastro-checkout`
- [x] 2026-11-21 — Página de planos no modelo da Vercel: preço por mês, avulsa dentro do Mensal e comparação em grupos (AD-250) — `cadastro-checkout`
- [x] 2026-11-21 — Página Contato com formulário enviado por e-mail ao Ethica (AD-249) — `paginas-publicas`
- [x] 2026-11-21 — Rodapé comum das páginas sem login e páginas Novidades, Segurança, Suporte, Contato, Termos de uso e Política de privacidade (AD-248) — `paginas-publicas`
- [x] 2026-11-21 — Página de planos no modelo shadcnblocks da perita e teste pelo primeiro mês (AD-247) — `cadastro-checkout`
- [x] 2026-11-20 — Tela de planos em `/billing` com os quatro planos em carrossel (AD-245, AD-246) — `cadastro-checkout`
- [x] 2026-11-20 — Escritório com CPF ou CNPJ no cadastro e no Asaas, com os dígitos conferidos (AD-244) — `cadastro-checkout`
- [x] 2026-11-20 — Seletor de intervalo no cabeçalho da Logística com mês, ano, semana e mês inteiro (AD-243) — `logistica-paginas`
- [x] 2026-11-20 — Faixa de dias na horizontal (dia, intervalo, dia da semana e fim de semana) nas três páginas da Logística, botões do mapa flutuando sobre ele e ações do cartão agrupadas (AD-242) — `logistica-paginas`
- [x] 2026-11-20 — Logística em páginas por intenção, intervalo de datas e termo da vistoria assinado em PDF (AD-239) — `logistica-paginas`
- [x] 2026-11-20 — `seed:volume`: dados em volume no escritório de um login para a conferência visual (`RUN_BOOK.md`) — `fundacao-ethica`
- [x] 2026-11-20 — Serviços: OS discreta abaixo da faixa, tabela normalizada e detalhe compacto com "Não preenchido" no fim (AD-238) — `servicos`
- [x] 2026-11-20 — Temas Claro, Escuro e Azul (dourado) e cor de ação única nos botões e detalhes (AD-237) — `temas`
- [x] 2026-11-19 — Serviços por mês/tipo e Início com número escrito: tabela por mês e rankings (AD-236) — `dashboard`
- [x] 2026-11-19 — Dashboard com valores escritos: fluxo de caixa em tabela de calor e categorias em ranking (AD-235) — `dashboard`
- [x] 2026-11-18 — Tutorial de uso para novos usuários: tour guiado do primeiro acesso, por permissão (AD-233) — `tour-guiado`
- [x] 2026-11-18 — Rodar `integration`/`e2e` com o Mongo local (642 testes verdes) — `fundacao-ethica`
- [x] 2026-11-18 — Estorno e chargeback tiram o período pago (AD-232) — `cadastro-checkout`
- [x] 2026-11-18 — Teste com os 5 dias de carência (AD-231) — `cadastro-checkout`
- [x] 2026-11-18 — Conferido no sandbox do Asaas: cartão salvo na assinatura após a primeira fatura e CNPJ inválido recusado (o cadastro passou a conferir o dígito) — `cadastro-checkout`
