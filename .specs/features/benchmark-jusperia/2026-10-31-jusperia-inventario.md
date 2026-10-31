# Jusperia — inventário funcional

**Data**: 2026-10-31 · **Plano**: `.specs/plans/2026-10-31-benchmark-jusperia.md` · **Status**: em andamento (navegação passiva concluída; fluxos com escrita pendentes)

> Engenharia reversa de comportamento, feita por navegação autenticada (conta real, plano SILVER, modo PERITO).
> Dados pessoais da conta foram anonimizados. **Evidência**: `T` = tela (URL), `F` = formulário (action + campos lidos do DOM),
> `JS` = script servido pelo app (arquivo:linha ou função), `R` = requisição de rede observada, `REA` = Evidence ID do REA.
> O que não foi observado diretamente está marcado **não confirmado**.

## Visão geral

- **Arquitetura observada**: PHP renderizado no servidor (`*.php`), formulários `POST` para `*_action.php` com redirect, alguns
  endpoints AJAX que respondem JSON (`ajax_*.php`, `api_get_*.php`). Sessão por cookie `PHPSESSID`. Sem SPA. (R: todo documento é `text/html` de `*.php`; JS: `processos.js`, `processo_detalhe.js`.)
- **Bibliotecas de front** (R): Chart.js (gráficos do dashboard), Leaflet 1.9.4 + leaflet-routing-machine (mapa), SortableJS, qrcodejs,
  TinyMCE 6.8.2 (editores de cabeçalho/rodapé/e-mail e laudo), Tom Select 2.2.2 e SweetAlert2 (módulo Laudos), Boxicons, Poppins.
- **PWA**: `manifest.json` + service worker `sw.js` e botão "Instalar App" (JS inline do layout).
- **Multi-tenant**: dados por "empresa" (`empresa_id` aparece no JSON de prazo; feed iCal tem `empresa=<id>`).
- **Dois modos de atuação ("jornada")**: PERITO (perito do juízo) e ASSISTENTE (assistente técnico). Toggle no topo
  (`?mudar_visao=PERITO|ASSISTENTE`); conta não-"Combo" recebe modal de upsell para o "Plano Combo" via WhatsApp (JS: `bloquearToggle`, `alternarVisaoCombo`).
- **Ajuda contextual**: cada tela tem playlist de vídeos de treinamento (`videos_ajuda/*.mp4`).
- **Suporte**: copiar e-mail de suporte; WhatsApp com nome, e-mail e plano pré-preenchidos.

## Menu (T: `index.php`, links da sidebar)

| Grupo | Item | Rota |
| --- | --- | --- |
| — | Comunidade | `comunidade/index.php` |
| — | Dashboard | `index.php` |
| — | Processos | `processos.php` |
| — | Minha Agenda | `agenda.php` |
| — | Mapa de Vistorias | `mapa.php` |
| — | Laudos | `Laudos/index.php` |
| — | Meus Modelos | `Laudos/lista_meus_modelos.php` |
| — | Financeiro | `financeiro.php` |
| App de Campo | App de Campo | `https://campo.jusperia.com.br` (app separado) |
| Cadastros auxiliares | Reclamante/Autor · Reclamada/Réu · Advogados/Procuradores · Locais Frequentes | `autores.php` · `reus.php` · `advogados.php` · `locais.php` |
| Administração | Clube de Benefícios · Equipe · Configurações · Diário de Bordo | `clube_beneficios.php` · `usuarios.php` · `configuracoes.php` · `auditoria.php` |
| Relatórios | Prazos · Produtividade · Processos Ociosos | `relatorio_prazos_pdf.php` · `relatorio_produtividade_pdf.php` · `relatorio_ociosos_pdf.php` |
| Suporte / Privacidade | Suporte por E-mail · Termos · Política de Privacidade · Instalar App · Encerrar Sessão | `#` · `termos.php` · `privacidade.php` · PWA · `../auth/logout.php` |

<!-- SEÇÕES DETALHADAS: preenchidas nas próximas etapas -->
