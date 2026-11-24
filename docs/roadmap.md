# Roadmap

Planejamento dos próximos passos e checklist do que ficou para trás. Direção, não compromisso: cada
item novo vira `docs/features/<slug>/` quando começar (protocolo em `AGENTS.md`). O detalhe de cada
pendência fica no `feature.md` indicado; aqui só a ação, quem faz e a feature.

## Agora — spec pronta, aguardando design

| Item | Feature | Notas |
| --- | --- | --- |
| Fotos e anotações da vistoria no laudo; editar e excluir laudo | `laudo-vistoria` | AD-149 |
| Rotas de vistoria com ponto de partida e serviço de rota próprio | `rotas-vistoria` | AD-150 |
| CRUD de membros só do admin | `gestao-membros` | AD-148 |
| Imagem de produção da API e arquivos por perícia no S3 | `producao-api` | AD-146 |
| Processos acompanhados com a situação de cada um (design inline na spec) | `processos-acompanhados` | AD-286 |

Em paralelo: validação do que já existe pela perita, com pequenas correções direto na `main` (AD-143).

## Depois

| Item | Notas |
| --- | --- |
| Descoberta de nomeações pelo DJEN, construída do zero, com a caixa de nomeações própria | O Datajud só acompanha os processos do escritório (AD-281) |
| IA: leitura do PDF da ata, redação do laudo e transcrição do áudio | Spec própria com provedor, limite por tenant e LGPD (AD-114, AD-124); adiado (AD-145) |
| Cartão dentro do Ethica em vez da fatura do Asaas | Dados do cartão passariam pela API (PCI-DSS); PIX e boleto já são no Ethica (AD-251, `cadastro-checkout`) |
| Assinatura pelo Ethica: trocar de plano, cancelar e ver faturas | Hoje pelo suporte (`cadastro-checkout`, AD-230) |
| Trocar o e-mail da conta | `acesso-email` |
| PDF escaneado (sem texto): OCR | Ata na importação e anexo do laudo (`importacao-processos`, `anexar-laudo`) |
| Gerar PDF fora da requisição (fila) | Só com volume (`documentos-pdf`) |

## A fazer

`[ ]` aberto. Ao resolver, marque `[x]`, acrescente a data e mova para "Resolvidos".

### Ir ao ar — você

- [ ] Escritório ETHICA em produção com assinatura só no banco (sem Asaas): `subscriptionPlan: automation_monthly`, acesso e Automação até 31/12/2027, gravados à mão em 2026-11-22. Antes dessa data, assinar de verdade pelo app ou estender a data, senão o acesso fecha — `automacao-datajud`
- [ ] Conferir com a perita: aviso na intenção de pagamento (12548, 12165) e sugestão de recebimento no alvará emitido e na RPV ou precatório pago (AD-274, AD-279) — `automacao-datajud`
- [ ] Testar a assinatura Mensal + Automação com dinheiro de verdade (ou no sandbox) e conferir que o módulo libera junto com o acesso; nenhuma configuração nova no Asaas (mesmo webhook) — `automacao-datajud`
- [ ] Asaas sandbox: entrar em `sandbox.asaas.com` e concluir o cadastro ("Conclua seu cadastro", dados pessoais); com a conta aprovada, criar uma chave Pix aleatória em Pix > Minhas chaves para testar o QR Code em dev. Sem webhook no sandbox: a Railway usa a chave de produção — `cadastro-checkout`
- [ ] Reiniciar a API local para ler o `ASAAS_WEBHOOK_TOKEN` novo; a tela de planos já confere o pagamento do sandbox sem túnel — `cadastro-checkout`
- [ ] Perita: decidir se o Teste só permite uma pessoa (bloquear convites até o primeiro plano pago); hoje a diferença "Só você" × "Quantas pessoas quiser" está só no texto da tela de planos (AD-247) — `cadastro-checkout`
- [ ] Perita: endereço, telefone e e-mail do Ethica para o topo da página Contato, como no modelo — `paginas-publicas`
- [ ] Perita: trocar os logos da grade de parceiros da página Sobre pelos parceiros reais — hoje são marcas de outras empresas (OpenAI, Claude, Okta…) que não são parceiras do Ethica — `paginas-publicas`
- [ ] Perita: foto do topo e fundadores (foto, nome e cargo) para a página Sobre, como no modelo — `paginas-publicas`
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

- [ ] Conferir com a perita a lista única de Notificações: Abertas/Resolvidas no lugar das cinco situações e o número do menu contando prazos vencidos, sugestões e avisos (AD-282) — `notificacoes-processo-unico`
- [ ] Perita: conferir as regras das sugestões (suspensão, retomada, acordo, desistência, sentença → qual situação ou fase) — `automacao-datajud`
- [ ] Depois da rodada de 24/11 (03:00), conferir que o 0017068-93.2025.5.16.0008 (TRT16) aparece em Processos acompanhados no ETHICA; se o TRT16 seguir em 429 o dia todo, pode ser bloqueio do IP da Railway — `automacao-datajud`
- [ ] Conferir a seção No tribunal num serviço real com o plano com Automação e o aviso de movimentação no dia seguinte — `automacao-datajud`
- [ ] Conferir no navegador a meta do ano: etapa em Escritório, painel no Dashboard (com e sem meta, admin e gestor) e a linha em Serviços ligada pelo menu "…" (o login local exige passkey, não conferido pelo agente) — `meta-receita`

- [ ] Dashboard: passar o mouse (e focar pelo teclado) no ícone de ajuda de cada categoria em "De onde vem o dinheiro" e conferir o texto do tooltip — `dashboard`
- [ ] Perita: confirmar as perguntas da spec de processos acompanhados (as três situações, a data velha de 3 dias, a ordem e a seção No tribunal) — `processos-acompanhados`
- [ ] Confirmar as perguntas em aberto das specs: `central-notificacoes`, `automacao-datajud`, `gestao-membros`, `laudo-vistoria`, `rotas-vistoria`, `producao-api`
- [ ] Ativar e entrar com digital/PIN de verdade num computador e num celular — `acesso-aparelho`
- [ ] Conferir as telas no navegador: `agenda-eventos`, `anexar-laudo`, `fase-assistencia`, `novo-laudo`, `partes-servico`, `preencher-pdfs`, `rotina-servico`, `servicos`, lista de destinos no novo desenho (Início, serviço aberto, modelos — AD-252); UAT geral com o seed — `fundacao-ethica`
- [ ] Conferir no celular: gráfico de serviços (`dashboard`), telas e exportação das listas (`filtros-lista`)
- [ ] Conferir o menu "…" com Importar planilha em Serviços e Varas — `dashboard`
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


- [ ] Sugestões expiradas legíveis sem o módulo (D2) e evidência da sugestão no diário de bordo — `automacao-datajud`
- [ ] Implementar a lista de processos acompanhados com a situação de cada um (tasks T1 a T6, depois da confirmação da perita) — `processos-acompanhados`
- [ ] Acompanhamento das perícias cíveis (TJ) quando o Datajud do TJ responder e houver fixture — `automacao-datajud`
- [ ] Criar a receita junto com o recebimento quando o serviço não tem honorário em aberto (hoje a tela manda lançar no Financeiro) — `automacao-datajud`
- [ ] Circuit breaker por tribunal no cliente Datajud do worker — `automacao-datajud`
- [ ] Pedir o motivo ao rejeitar uma sugestão (a API já guarda) — `automacao-datajud`
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
- [ ] Filtro de categoria na lista de lançamentos, para as categorias do Dashboard abrirem os lançamentos (AD-253) — `dashboard`

## Resolvidos

- [x] 2026-11-23 — Lote do Datajud com 429 tenta 12 vezes no dia em vez de desistir em cerca de 20 minutos (AD-286) — `automacao-datajud`
- [x] 2026-11-23 — API num padrão único: controller sem try/catch, 404 no service, convite numa entidade, model só no repository, kebab-case, tudo travado no teste estrutural (AD-284) — `api-padrao-unico`
- [x] 2026-11-23 — Testes de falha em Notificações e Financeiro: lista resiste a data ilegível do tribunal, honorário do serviço não duplica em mudanças simultâneas, datas e valores impossíveis param na borda (AD-283) — `notificacoes-processo-unico`, `prazos-recebimentos`
- [x] 2026-11-23 — Notificações numa lista só (Abertas/Resolvidas), sem abas aninhadas, com uma leitura e um contador na API (AD-282) — `notificacoes-processo-unico`
- [x] 2026-11-23 — Página Automação Datajud conferida no navegador local, com e sem o módulo (menu, sugestões, processo acompanhado com link, regras e oferta) — `automacao-datajud`
- [x] 2026-11-22 — Produção: collection `opportunities` (vazia) apagada e `prospecting` tirado do único convite que tinha, depois da cópia em `ethica-backups` e da confirmação do usuário; nenhum serviço, usuário ou diário de bordo tinha dado da Prospecção — `prospeccao-datajud`
- [x] 2026-11-22 — Página Automação Datajud no lugar da Prospecção; Prospecção removida inteira do código, sem shim (AD-281) — `automacao-datajud`, `prospeccao-datajud`
- [x] 2026-11-22 — GitHub Actions habilitadas no repositório (estavam desligadas, por isso o CI nunca rodou); o workflow CI passa a rodar a cada push na main — `fundacao-ethica`
- [x] 2026-11-22 — Collection antiga `deadlines` apagada na produção (já copiada para `notifications`); healthcheck da API conferido em Settings na Railway — `central-notificacoes`, `producao-api`
- [x] 2026-11-22 — Configuração da Railway da API e do worker passada para Settings (config-as-code deixa de valer em 01/12/2026); `railway.json` e `railway.worker.json` saíram do repositório — `producao-api`
- [x] 2026-11-22 — Worker no ar na Railway (Dockerfile.worker, healthcheck /health, Datajud e push ligados), usuário `ethica-worker` com role própria no Atlas e chaves VAPID na API e no worker — `central-notificacoes`, `automacao-datajud`
- [x] 2026-11-22 — Central de notificações, worker de lembretes, e-mail do dia, avisos, sino, preferências e push; Automação Datajud com plano de R$ 80, acompanhamento no tribunal e sugestões para aprovar (Fases 0 a 6) — `central-notificacoes`, `automacao-datajud`
- [x] 2026-11-22 — Produção (D8): prazos antigos copiados para `Notification` (11 prazos, 11 itens de agenda) pelo script avulso, já apagado — `central-notificacoes`
- [x] 2026-11-22 — Conferir no navegador a Central (prazo criado, cancelado e visto na agenda e no serviço), a aba Avisos, o sino e Conta → Notificações — `central-notificacoes`
- [x] 2026-11-22 — Meta de receita do ano: cadastro em Escritório, acompanhamento no Dashboard e, por escolha de cada pessoa, em Serviços (AD-258) — `meta-receita`
- [x] 2026-11-22 — Editar honorário no Financeiro não dá mais erro 500 (`internal_error`) ao salvar — `prazos-recebimentos`
- [x] 2026-11-22 — Texto que parece número sem aspas na URL em todas as telas (busca, paginação, período do Dashboard) (AD-257) — `fundacao-ethica`
- [x] 2026-11-22 — Dashboard e Início reformulados conferidos no navegador (6 e 12 meses, três temas, celular) — `dashboard`
- [x] 2026-11-22 — Dashboard e Início reformulados com gráficos, hierarquia macro → micro e cores indicativas (AD-255) — `dashboard`
- [x] 2026-11-22 — Rankings do Dashboard e do Início com contexto: barras pelo maior valor com drill-down, categorias no período do fluxo de caixa com o anterior e escala comum, composição por justiça com os sem justiça (AD-253) — `dashboard`
- [x] 2026-11-21 — Lista de destinos (`LinkList`) no desenho sem moldura e na largura toda; Início com compromissos e serviços parados um embaixo do outro — `gestao-escritorio`
- [x] 2026-11-21 — Modelo aberto (`/expert-reports/templates/details`) no mesmo padrão do laudo aberto: lista numerada, expandir/recolher, setas e "…" por seção — `biblioteca-modelos`
- [x] 2026-11-21 — `seed:templates`: modelos de laudo e parecer de todas as áreas na biblioteca do escritório — `fundacao-ethica`
- [x] 2026-11-21 — `seed:volume` com e-mails e links no formato real, sem `example.com`/`exemplo` — `fundacao-ethica`
- [x] 2026-11-21 — Produção configurada: Railway com as variáveis do Asaas (URL, chave, token do webhook, retorno para `https://ethica-zeta.vercel.app/billing`), `CONTACT_EMAIL` e Resend conferido, `SMTP_*` removidas; Asaas com webhook "Ethica billing" (quatro eventos, envio sequencial, token), chave Pix e Site cadastrados — `cadastro-checkout`, `paginas-publicas`, `acesso-email`, `producao-api`
- [x] 2026-11-21 — PIX e boleto na tela do Ethica, cartão na fatura do Asaas, e acesso aberto sem webhook pela conferência da tela de planos (AD-251) — `cadastro-checkout`
- [x] 2026-11-21 — Conta de produção do Asaas aprovada (MEI) — `cadastro-checkout`
- [x] 2026-11-21 — Página de planos no modelo da Vercel: preço por mês, avulsa dentro do Mensal e comparação em grupos (AD-250) — `cadastro-checkout`
- [x] 2026-11-21 — Página Sobre (`/about`) no modelo da perita, com link na coluna Produto do rodapé — `paginas-publicas`
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
