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
| Sugestões do Datajud ao lado do dado, detalhe do lançamento, hora de cobrar e de encerrar, busca no tribunal pelo número | `sugestoes-datajud` | AD-304 (proposta) |

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

- [ ] Antes do deploy da `sugestoes-datajud`, apagar de novo os dados do Datajud em produção (ou pausar o worker na Railway até lá), para validar a linha de base do zero — `sugestoes-datajud`
- [ ] Confirmar as questões da spec `sugestoes-datajud` (tabela "Assumptions & Open Questions"): regras de suspensão e retomada, hora de cobrar e de encerrar, busca no tribunal só com o módulo — `sugestoes-datajud`
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

- [ ] Conferir na tela o botão "Registrar recebimento" no Financeiro do serviço e no diálogo do lançamento (não renderizado nesta entrega: o código de acesso sai no log da API) — `prazos-recebimentos`
- [ ] Desfazer o lançamento avulso de "Honorários prévios" de R$ 1.110,00 do 5019106-45.2025.8.24.0064: anular o lançamento e registrar o valor como recebimento do honorário fixado — `prazos-recebimentos`
- [ ] Perguntar à perita se os honorários prévios devem abater sozinhos o honorário fixado (hoje são lançamento à parte; só o recebimento registrado no honorário abate o saldo) — `prazos-recebimentos`
- [ ] Conferir na tela (não renderizado nesta entrega; o login exige passkey): números ao lado das abas de Notificações e Laudos, cartão de Serviços agendados mais baixo, "Editar" da rota abrindo o compromisso na Agenda, diálogo "Deslocamento já lançado", cores dos tipos novos na Agenda e o mês no Mix de serviços — `logistica-paginas`, `custo-deslocamento`, `agenda-eventos`, `dashboard`
- [ ] Apagar à mão no Financeiro as despesas de deslocamento duplicadas que já existem (lançadas antes da AD-301, vencem no dia do lançamento e a tela nova não as acha) — `custo-deslocamento`
- [ ] Perguntar à perita se o compromisso automático da data da perícia do serviço deve passar de "Vistoria" para o tipo novo "Perícia" (hoje segue Vistoria, AD-302) — `agenda-eventos`
- [ ] Conferir na tela o menu lateral recolhido mostrando `⌘B` no botão de abrir/fechar (o Playwright não entrou: sessão de teste expirada) — `fundacao-ethica`
- [ ] Rodar `/impeccable init` para trazer o `PRODUCT.md` ao formato atual do impeccable (faltam Positioning, Operating Context, Evidence on Hand e Product Principles; o init preserva o que já está lá e pergunta o resto) — `gestao-escritorio`
- [ ] Entrar de novo pelo e-mail no seu navegador: a passkey de teste do Playwright (2026-11-24) substituiu a do seu computador (APA-05) — `gestao-escritorio`
- [ ] Conferir na tela os Recebimentos no diálogo de um compromisso ou prazo da agenda (novo desenho com Recebido e Saldo como rótulo sobre valor); o Playwright não achou um evento com recebimento lançado — `prazos-recebimentos`
- [ ] Nos próximos dias, ler os logs `datajud.request` da rodada das 05:00 (AD-303) e conferir se passa nas primeiras tentativas; se não, ajustar pelo plano `.specs/features/automacao-datajud/plans/2026-11-24-diagnostico-falhas-datajud.md` — `automacao-datajud`
- [ ] Conferir com a perita a lista única de Notificações: Abertas/Resolvidas no lugar das cinco situações e o número do menu contando prazos vencidos, sugestões e avisos (AD-282) — `notificacoes-processo-unico`
- [ ] Perita: conferir as regras das sugestões (suspensão, retomada, acordo, desistência, sentença → qual situação ou fase) — `automacao-datajud`
- [ ] Conferir a seção No tribunal num serviço real com o plano com Automação e o aviso de movimentação no dia seguinte — `automacao-datajud`
- [ ] Conferir no navegador a meta do ano: etapa em Escritório, painel no Dashboard (com e sem meta, admin e gestor) e a linha em Serviços ligada pelo menu "…" (o login local exige passkey, não conferido pelo agente) — `meta-receita`

- [ ] Dashboard: passar o mouse (e focar pelo teclado) no ícone de ajuda de cada categoria em "De onde vem o dinheiro" e conferir o texto do tooltip — `dashboard`
- [ ] Confirmar as perguntas em aberto das specs: `central-notificacoes`, `automacao-datajud`, `gestao-membros`, `laudo-vistoria`, `rotas-vistoria`, `producao-api`
- [ ] Ativar e entrar com digital/PIN de verdade num computador e num celular — `acesso-aparelho`
- [ ] Conferir as telas no navegador: `agenda-eventos`, `anexar-laudo`, `fase-assistencia`, `novo-laudo`, `partes-servico`, `preencher-pdfs`, `rotina-servico`, `servicos`, listas no `Item` com borda e na largura toda (Início, serviço aberto, parte, novo laudo, modelos, Automação e regras, mapa e rota do campo — AD-288, AD-289); UAT geral com o seed — `fundacao-ethica`
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
- [ ] Acompanhamento das perícias cíveis (TJ) quando o Datajud do TJ responder e houver fixture — `automacao-datajud`
- [ ] Criar a receita junto com o recebimento quando o serviço não tem honorário em aberto (hoje a tela manda lançar no Financeiro) — `automacao-datajud`
- [ ] Circuit breaker por tribunal no cliente Datajud do worker — `automacao-datajud`
- [ ] Resposta truncada do Datajud (`truncated`) refazer a busca em vez de virar "não encontrado", e juntar o mesmo número de escritórios diferentes no mesmo lote — `automacao-datajud`
- [ ] Índice `{ status, dueDate }` em `Transaction` para a leitura de lançamentos a vencer de todos os escritórios (hoje `COLLSCAN`, de hora em hora) — `central-notificacoes`
- [ ] Resumo do dia de hora em hora (AD-147) pular de uma vez quem já recebeu no dia, em vez de tentar a trava pessoa a pessoa (decisão nova supersede a AD-147) — `central-notificacoes`
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

- [x] 2026-11-27 — Filtros das listas com "Marcar todas" e o resumo "Todas, exceto …" — `filtros-lista`
- [x] 2026-11-27 — "Honorários recebidos" deixa de encerrar o serviço; encerram só as fases de perdas, "Acordo / desistência" e "Finalizado" (AD-306) — `fase-servico`
- [x] 2026-11-27 — Fase "Finalizado" na Assistência técnica, que encerra o serviço (AD-305) — `fase-assistencia`
- [x] 2026-11-27 — Fase inicial "Nomeado" antes de "Nomeação aceita" no cadastro do serviço — `fase-servico`
- [x] 2026-11-26 — Recebimento do honorário pelo detalhe do serviço e pelo diálogo do lançamento, abatendo o saldo do honorário fixado — `prazos-recebimentos`
- [x] 2026-11-25 — Consulta ao Datajud às 05:00 e tempo limite de 120 s, pela sobrecarga do CNJ vista nos logs (AD-303) — `automacao-datajud`
- [x] 2026-11-25 — Produção: o 0017068-93.2025.5.16.0008 (TRT16) do ETHICA consultado com linha de base em 24/11, pelos logs do worker (a página não foi aberta em produção) — `processos-acompanhados`
- [x] 2026-11-25 — Worker na Railway com a versão de 2026-11-24 (deploy de 24/11 01:13; logs `datajud.request` nas rodadas de 24 e 25/11) — `processos-acompanhados`
- [x] 2026-11-25 — TRT16 do ETHICA consultado na rodada de 24/11 (9ª tentativa, linha de base gravada); o 429 era sobrecarga do cluster do CNJ, não bloqueio do IP da Railway — `automacao-datajud`
- [x] 2026-11-25 — Pedidos da perita: contagem nas abas de Notificações e Laudos, cartão de Serviços agendados mais baixo, rota ordenada por dia e "Editar" que abre o compromisso na Agenda, deslocamento sem lançar em dobro (AD-301), tipos Inspeção, Avaliação e Perícia (AD-302), "Serviços entregues" e mês no Mix de serviços; plano em `.specs/features/logistica-paginas/plans/2026-11-25-ajustes-perita-logistica-abas.md` — `central-notificacoes`, `laudos`, `logistica-paginas`, `custo-deslocamento`, `agenda-eventos`, `servicos`, `dashboard`
- [x] 2026-11-24 — `apps/web/DESIGN.md` atualizado com o código (YAML válido, tokens de link, gráficos e status, campo de 44px, selo em `packages/ui`, componentes padrão revertidos na AD-299, coluna `max-w-4xl` só no hub) e `.impeccable/design.json` regenerado — `gestao-escritorio`
- [x] 2026-11-24 — Escritório, Minha conta, Relatórios e hubs de Laudos e Logística de volta à versão com `StepList`, `PageIntro`, `LinkCard` e `InfoCard` (AD-299) — `gestao-escritorio`
- [x] 2026-11-24 — Simplificação dos componentes do `apps/web`, grupos A, B e C (AD-295 a AD-297); plano em `.specs/features/gestao-escritorio/plans/2026-11-24-simplificar-componentes.md` — `gestao-escritorio`
- [x] 2026-11-24 — Varredura estética com o Playwright (31 rotas, desktop e celular): sem célula sozinha, sem texto colado em sublinhado, sem rolagem lateral, sem sombra em controle (AD-293, AD-294) — `gestao-escritorio`
- [x] 2026-11-24 — Meta em Serviços sem depender do menu (AD-291); Recebimentos com hierarquia de valores; faixa de números sem célula sozinha nem dica colada no sublinhado; Dashboard com a faixa no topo (AD-292, AD-298) — conferido com o Playwright, menos o diálogo dos Recebimentos — `meta-receita`, `dashboard`, `prazos-recebimentos`
- [x] 2026-11-24 — Ícone do cabeçalho dos detalhes no ladrilho do `LinkCard` — `gestao-escritorio`
- [x] 2026-11-24 — Listas com o ícone de volta e a seta ↗ nas linhas que levam a outra tela — `gestao-escritorio`
- [x] 2026-11-24 — `ItemGroup` só flex com gap: cada linha é um `Item` com borda, sem sombra; mapa e rota do campo no mesmo formato — `gestao-escritorio`
- [x] 2026-11-24 — `LinkList` excluído; toda lista de linhas usa o `Item` com borda (`ItemGroup variant="list"`), selos à direita e na largura toda — `gestao-escritorio`
- [x] 2026-11-24 — Conferidos no navegador local /automation (situações, textos e ordem) e a seção No tribunal de um serviço não encontrado — `processos-acompanhados`
- [x] 2026-11-24 — Processos acompanhados: todo serviço acompanhado aparece, com a situação de cada um, também na seção No tribunal; o worker grava o não encontrado — `processos-acompanhados`
- [x] 2026-11-24 — Perita: perguntas da spec de processos acompanhados respondidas (padrões da spec; seção No tribunal aceita) — `processos-acompanhados`
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
