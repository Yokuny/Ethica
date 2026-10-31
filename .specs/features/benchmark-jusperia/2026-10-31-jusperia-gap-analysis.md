# Jusperia × Ethica — gap analysis

**Data**: 2026-10-31 · **Base**: `.specs/features/benchmark-jusperia/2026-10-31-jusperia-inventario.md` (seções citadas como §) · **Ethica**: `main` em `fffdf3e`

**Legenda**: **Tem** = cobre o comportamento · **Parcial** = existe, com lacuna relevante · **Não tem**.
**Esforço** (no padrão Ethica: contrato Zod + model + módulo da API + rota web): **P** ≤ 2 dias · **M** 3 a 7 dias · **G** > 1 semana ou exige decisão de arquitetura.
**Valor para o perito**: ★★★ alto (dor central do `PRODUCT.md`) · ★★ médio · ★ baixo.

## 1. Tabela por módulo

### Processos / perícias

| Funcionalidade (Jusperia) | § | Ethica | Onde no Ethica | Esforço | Valor |
| --- | --- | --- | --- | --- | --- |
| Cadastro com nº, vara, comarca, objeto, nomeação, prazo do laudo | 2.2 | Tem | `packages/contracts/src/schemas/pericia.schema.ts`, `apps/web/src/routes/_private/pericias/add/` | — | — |
| Validação do nº CNJ e duplicidade | 2.2 | **Tem (melhor)**: regex CNJ + única por tenant; Jusperia aceita DV errado | `pericia.schema.ts` (`numeroProcessoSchema`), glossário | — | — |
| Dados auxiliares do laudo trabalhista (autuação, admissão, demissão, período imprescrito, função do reclamante, endereço/GPS do local) | 2.2 | Não tem | — | P | ★★ |
| Partes e advogados como cadastro reutilizável (autor/réu/advogado com documento, OAB, e-mail, telefone; "ver processos") | 2.6, 8 | Parcial: `autor`/`reu` são texto livre na perícia | `pericia.schema.ts` | M | ★★ |
| Nº de controle interno sequencial por escritório (com valor inicial configurável) | 2.1, 10 | Não tem | — | P | ★ |
| Fases granulares (29, em 5 grupos) com status derivado (ativo/suspenso/encerrado) | 2.5 | Parcial: 8 etapas (`PERICIA_STATUS`), sem grupo/status | `pericia.schema.ts` | M (decisão: ampliar etapas ou tags) | ★★ |
| Filtros da listagem (vara, mês de cadastro, status, fase, nº controle) | 2.1 | Parcial: busca + etapa + justiça | `apps/web/src/routes/_private/pericias/` | P | ★ |
| "Próximo prazo" na listagem com selo "vence em breve" | 2.1 | Parcial: faixa de indicadores (vencido, 7 dias) sem coluna de próximo prazo | `apps/api/src/modules/pericia/pericia.repository.ts` (listStats) | P | ★★ |
| Importação assistida por IA (prompt + JSON) com cálculo de prazo e período imprescrito | 2.7 | Não tem (roadmap #2 "Cadastro por IA") | `docs/roadmap.md` | M (IA externa colada) / G (IA no servidor + PDF) | ★★★ |
| Importação em lote por CSV com modelo | 2.7 | Não tem (roadmap #3) | `docs/roadmap.md` | M | ★★ |
| Ficha analítica do processo em PDF | 6 | Não tem | — | M (primeiro PDF: decisão de biblioteca) | ★★ |
| Checklist de campo pré-perícia em PDF | 6 | Não tem | — | P (após base de PDF) | ★★ |
| Exclusão com cascata e desvínculo do financeiro pago | 2.3 | Parcial: excluir perícia (admin); cascata não verificada | `apps/api/src/modules/pericia/` | P | ★ |

### Prazos

| Funcionalidade | § | Ethica | Onde | Esforço | Valor |
| --- | --- | --- | --- | --- | --- |
| Vários prazos por processo (título, vencimento fatal, observação) | 2.4 | Parcial: só `prazoLaudo` + compromisso tipo `prazo` na agenda | `pericia.schema.ts`, `compromisso.schema.ts` | M (decisão: entidade Prazo × compromisso) | ★★★ |
| Status do prazo (pendente / entregue-protocolado / perdido) e baixa com data de entrega | 2.4 | Não tem (compromisso tem `concluido`, sem data de protocolo) | `compromisso.schema.ts` | P (junto do item acima) | ★★★ |
| Prazo automático a partir do prazo do laudo | 2.4 | **Tem** (vira compromisso "Entrega do laudo", AD-106) | `apps/api/src/events/` | — | — |
| Alertas visuais de prazos (próximos 30 dias, vencidos) | 1 | Tem (vencido e 7 dias) | `pericia.repository.ts` | — | — |
| Cronograma de prazos em PDF com "faltam N dias" | 6 | Não tem | — | P (após base de PDF) | ★★ |
| Notificação ativa (e-mail/push) de prazo | 16 | Não tem — **nem a Jusperia tem** | roadmap #8, `apps/api/src/providers/mail/` | M | ★★★ (diferencial) |

### Agenda e campo

| Funcionalidade | § | Ethica | Onde | Esforço | Valor |
| --- | --- | --- | --- | --- | --- |
| Eventos por processo com tipo, status, local e observações | 3 | Tem (calendário mês/semana/dia) | `apps/web/src/routes/_private/agenda/`, `compromisso.schema.ts` | — | — |
| Tipos específicos (entrevista autor/réu, reunião de peritos, esclarecimentos, diligência) | 3 | Parcial: vistoria, audiência, prazo, reunião, outro | `compromisso.schema.ts` | P | ★ |
| Local padrão = endereço do réu; locais frequentes com GPS | 3, 8 | Não tem | — | P | ★★ |
| Painéis atrasados / urgente 7 dias / atenção 15 dias | 3 | Parcial (home: próximos compromissos) | `apps/web/src/components/upcoming-compromissos.tsx` | P | ★ |
| **Feed iCal** para Google/Outlook/Apple | 3 | Não tem | — | P | ★★★ |
| Mapa do dia com rota otimizada, reordenação, conflito de horário, Waze/Maps | 4 | Não tem (roadmap #9) | — | M | ★★ |
| Aviso de agendamento às partes por e-mail com modelo configurável | 4, 10 | Não tem | — | P (`mailto`) / M (envio pelo servidor, já há `MailProvider`) | ★★ |
| Rota de campo no celular: status rápido, formulário de vistoria (paradigmas, funções, atividades RTE×RDA), fotos com carimbo, offline (IndexedDB) | 12.1 | Não tem (roadmap #6 "Vistorias offline") | — | G | ★★★ |
| Galeria de fotos por processo/evento | 12.3 | Não tem | — | M (storage de arquivos: decisão) | ★★ |
| Relatório de produtividade de campo | 6 | Não tem | — | P | ★ |

### Laudos

| Funcionalidade | § | Ethica | Onde | Esforço | Valor |
| --- | --- | --- | --- | --- | --- |
| Modelos de laudo por seções com texto "Sim/Não", variáveis e quebra de página | 7.2, 7.3 | Não tem (roadmap #7 "Laudos automatizados") | — | G | ★★★ |
| Biblioteca padrão NR-15 (anexos 1–14), NR-16, ergonomia, acidente, PPP, quesitos | 7.2 | Não tem | — | G (conteúdo técnico + revisão) | ★★★ |
| Assistente "o que deve constar" (seleção de seções e variantes) | 7.2 | Não tem | — | M (sobre o motor de modelos) | ★★★ |
| Editor por seção com variáveis do processo e da vistoria | 7.2 | Não tem | — | G | ★★★ |
| IA para reescrever texto em linguagem pericial | 7.2 | Não tem | — | M | ★★ |
| Exportação PDF e Word, sumário, cabeçalho/rodapé com logo | 7.2, 10 | Não tem | — | M | ★★★ |
| Status rascunho/concluído com avanço de fase | 7.1 | Não tem | — | P (sobre o motor) | ★★ |

### Financeiro

| Funcionalidade | § | Ethica | Onde | Esforço | Valor |
| --- | --- | --- | --- | --- | --- |
| Receita de honorários e despesas, previsto/liquidado, vínculo opcional à perícia | 5 | Tem | `packages/contracts/src/schemas/lancamento.schema.ts`, `apps/web/src/routes/_private/financeiro/` | — | — |
| Honorário fixado vira receita automática | 5 | **Tem** (AD-106) — Jusperia é manual | `apps/api/src/events/subscribers/` | — | — |
| **Recebimento parcial** (parcelas com data, conta, estorno; status parcial; saldo) | 5.2 | Não tem (roadmap #4) | — | M | ★★★ |
| Pagamento parcial e estorno de despesa | 5.3 | Não tem | — | P (mesmo motor do item acima) | ★ |
| Categorias de despesa (8 na Jusperia) | 5.3 | Parcial: 4 categorias | `lancamento.schema.ts` | P | ★ |
| Resumo, fluxo de caixa e gráficos | 5.1 | Tem | `apps/web/src/routes/_private/financeiro/relatorios/`, `apps/web/src/components/fluxo-financeiro-chart.tsx` | — | — |
| Relatório financeiro em PDF (fluxo de caixa e analítico por processo) | 5.1, 5.2 | Não tem (roadmap #5) | — | P (após base de PDF) | ★★ |
| Restrição do financeiro por papel | 9 | **Tem** (AD-107); na Jusperia não confirmado | `.agents/skills/ethica-permissions/SKILL.md` | — | — |

### Administração, relatórios e plataforma

| Funcionalidade | § | Ethica | Onde | Esforço | Valor |
| --- | --- | --- | --- | --- | --- |
| Equipe com papéis | 9 | Tem (admin/manager/operator, convite) | `apps/api/src/modules/identity/`, `apps/web/src/routes/_private/_admin/users/` | — | — |
| Dados profissionais do perito (CPF, registro CREA/MTE, formação) para laudo | 9 | Não tem | `apps/web/src/routes/_private/account/` | P | ★★ |
| Configurações do escritório: logo, cabeçalho/rodapé de documentos | 10 | Não tem | — | P (pré-requisito de PDF/laudo) | ★★ |
| Exportação de todos os dados (ZIP de CSV) — LGPD | 10 | Não tem | — | P | ★★ |
| **Diário de bordo** (auditoria por usuário/módulo/ação) | 11 | Não tem | — | M (evento de domínio já existe, AD-039) | ★★ |
| Relatório de processos ociosos (> 60 dias sem movimentação) | 6 | Não tem | — | P | ★★ |
| Dashboard configurável (mostrar/ocultar blocos) | 1 | Não tem | `apps/web/src/routes/_private/index/` | P | ★ |
| Jornada Assistente técnico (prazos de parecer, contratante) | 14 | Parcial: `papel` perito/assistente na perícia, sem fluxo próprio | `pericia.schema.ts` | M | ★★ |
| Vídeos de ajuda por tela | — | Não tem | — | P | ★ |
| Comunidade (fórum) e clube de benefícios | 13 | Não tem | — | G / P | ★ (fora do núcleo) |

### Onde o Ethica já está à frente

| Funcionalidade | Ethica | Jusperia |
| --- | --- | --- |
| Prospecção no **Datajud** (busca por tribunal, assuntos, classe, órgão; oportunidades → perícia) | `apps/api/src/providers/datajudClient.ts`, `apps/web/src/routes/_private/prospeccao/` (AD-105) | nenhuma integração com tribunal/Datajud (§ 15) |
| Validação do CNJ | `numeroProcessoSchema` | aceita DV errado |
| Receita automática do honorário fixado e compromisso automático do prazo | AD-106 | manual / só prazo |
| Permissões por papel no servidor | AD-107 | só rótulos de perfil (não confirmado) |
| Auditoria consistente (a fazer) | — | falhas observadas: criação de processo não auditada |

## 2. Proposta de priorização (valor para o perito ÷ esforço)

Critério: dores do `PRODUCT.md` (prazos, honorários esquecidos, vistorias analógicas, laudos manuais), o que a Jusperia usa como diferencial e o que é pré-requisito de outros itens.

| Onda | Itens | Por quê | Esforço total |
| --- | --- | --- | --- |
| **1 — Prazos e honorários confiáveis** | (a) Prazos múltiplos com status e baixa de protocolo · (b) Recebimento parcial com parcelas/estorno · (c) Feed iCal da agenda e prazos · (d) Notificação de prazos por e-mail | Ataca as duas maiores dores ("risco de prazo" e "honorários esquecidos"); (c) é P e muito pedido; (d) é diferencial que a Jusperia não tem | M + M + P + M |
| **2 — Cadastro rápido** | (e) Importação por IA (começar com o modelo "colar JSON da IA externa", sem custo de IA, e evoluir para extração no servidor) · (f) CSV em lote · (g) Dados auxiliares trabalhistas + partes/advogados como cadastro | "Garimpo de dados" do `PRODUCT.md`; (g) alimenta laudo e checklist | M + M + M |
| **3 — Base de documentos** | (h) Configuração do escritório (logo, cabeçalho/rodapé, dados profissionais) · (i) Geração de PDF no servidor (decisão de biblioteca) com ficha do processo, checklist de campo, cronograma de prazos e relatório financeiro · (j) Exportação de dados (ZIP) | Pré-requisito do laudo; entrega 4 documentos de uso diário com uma só base | P + M + P |
| **4 — Laudo automatizado** | (k) Motor de modelos por seções Sim/Não + variáveis · (l) Assistente "o que deve constar" · (m) Editor por seção + IA de redação · (n) Export PDF/Word · (o) Biblioteca padrão NR-15/NR-16 | Maior diferencial da Jusperia e dor "laudos manuais"; depende da onda 3 | G |
| **5 — Campo** | (p) Rota de campo mobile offline com formulário de vistoria e fotos (alimenta as variáveis do laudo) · (q) Galeria · (r) Mapa com rota otimizada e aviso às partes | Dor "vistorias analógicas"; integra com o laudo; exige decisão de storage e offline | G + M + M |
| **6 — Gestão** | (s) Diário de bordo · (t) Processos ociosos · (u) Fases granulares/status derivado · (v) Jornada do assistente técnico · (w) dashboard configurável | Valor de governança e conforto; baixo risco | M + P + M + M + P |

Fora de escopo sugerido: comunidade e clube de benefícios (produto/negócio, não sistema), vídeos de ajuda (conteúdo).

## 3. Decisões que a implementação vai exigir (viram AD-NNN)

1. **Prazo como entidade própria** ou como compromisso da agenda com status de protocolo (hoje AD-106 cria compromisso).
2. **Biblioteca de PDF/Word** no `apps/api` (HTML→PDF headless × geração programática) — base das ondas 3 e 4.
3. **Armazenamento de arquivos** (fotos de vistoria, logo, anexos) — onde e com que limite por tenant.
4. **IA**: colar resposta de IA externa (custo zero, como a Jusperia) × provedor no servidor (custo, LGPD).
5. **Fases**: ampliar `PERICIA_STATUS` × manter etapas e acrescentar "fase detalhada".

## 4. Escolha do usuário (2026-10-31)

- Viram spec: **onda 1** (`.specs/features/prazos-recebimentos/spec.md`), **onda 2** sem a importação assistida por IA externa (colar prompt/JSON), com importação **por PDF e CSV** (`.specs/features/importacao-processos/spec.md`), **onda 3** (`.specs/features/documentos-pdf/spec.md`) e **onda 4** (`.specs/features/laudos/spec.md`).
- Ondas 5 (campo) e 6 (gestão) ficam para depois.
- Os registros criados na conta da Jusperia durante a análise foram **mantidos** a pedido do usuário.

## 5. Itens novos a partir das respostas do usuário (2026-10-31)

| Funcionalidade | Ethica | Onde | Esforço | Valor | Onda sugerida |
| --- | --- | --- | --- | --- | --- |
| Matriz de permissões por perfil × módulo × ação (acessar, visualizar, editar, inserir, excluir), com valores pré-selecionados por perfil e gerida pelo admin (AD-108, proposta) | Parcial: papéis fixos `admin`/`manager`/`operator` (AD-107); o primeiro usuário já nasce `admin` | `apps/api/src/modules/identity/platform.service.ts`, `.agents/skills/ethica-permissions/SKILL.md` | G | ★★★ | nova, antes das ondas 3–4 (toda tela nova vai consultar a matriz) |
| Jornada do assistente técnico: parecer técnico, medições junto com o perito, quesitos complementares/suplementares, impugnação, honorários pagos pela parte contratante, nomenclatura reclamante/reclamada × autor/réu | Parcial: `papel` na perícia | `packages/contracts/src/schemas/pericia.schema.ts` | M (parecer entra em `laudos`, LAU-06) + M (honorário por contratante) | ★★ | 4 e 6 |
| App de campo como pré-laudo offline: formulários do laudo salvos localmente, áudio com transcrição opcional, fotos, versões das partes, nome/e-mail/assinatura das partes, documentos | Não tem | — | G | ★★★ | 5 (redefinida) |
