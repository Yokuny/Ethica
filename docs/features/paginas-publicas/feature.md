---
feature: Páginas públicas do rodapé
slug: paginas-publicas
descricao: Rodapé comum das páginas sem login com Novidades, Segurança, Suporte, Contato, Termos de uso e Política de privacidade
data: 2026-11-21
status: parcial
areas: [apps/web]
decisoes: [AD-248]
spec: [.specs/features/paginas-publicas]
---

# Páginas públicas do rodapé

**Status**: parcial · **Atualizado**: 2026-11-21 · **Áreas**: `apps/web`

> Documento vivo. Plano em `.specs/features/paginas-publicas/plans/` (congelado).
> Correlação com o git: `git log --oneline -i --grep='paginas-publicas'`.

## O que foi feito

- Todas as páginas sem login (Entrar, convite, planos e as novas) fecham com o mesmo rodapé: marca, promessa do
  produto, colunas **Produto** (Novidades, Segurança), **Ajuda** (Suporte, Contato) e **Legal** (Termos de uso,
  Política de privacidade) e o "© ano Ethica".
- **Segurança** (`/security`): entrada sem senha com passkey, dados separados por escritório, papéis conferidos no
  servidor, arquivos privados por escritório e pagamento na fatura do Asaas.
- **Suporte** (`/support`): perguntas de uso (entrada, aparelhos, equipe, vistoria sem internet), as mesmas perguntas
  de planos da tela `/billing` e os canais de atendimento.
- **Contato** (`/contact`): os canais de atendimento; enquanto não há canal definido, o aviso "publicados em breve".
- **Novidades** (`/news`): o que mudou no Ethica, do mais novo ao mais antigo.
- **Termos de uso** (`/terms`) e **Política de privacidade** (`/privacy`): só as seções, com o aviso de texto em
  elaboração.

## Por que

Pedido do usuário em 2026-11-21, depois da página de planos no modelo shadcnblocks: o rodapé do modelo leva a essas
páginas e elas valem para qualquer visitante, logado ou não (AD-248).

## Como

- `apps/web/src/routes/_public/route.tsx` — layout com o `PublicFooter` depois do `Outlet`.
- `apps/web/src/routes/_public/@components/` — `brand.tsx`, `public-footer.tsx`, `public-document.tsx` (molde das
  páginas de texto), `faq-list.tsx`, `contact-channels.tsx`.
- `apps/web/src/routes/_public/@consts/` — `footer.ts` (colunas), `faq.ts` (perguntas e `CONTACT_CHANNELS`).
- `apps/web/src/routes/_public/news/@consts/news.ts` — lista das novidades: entrega que o escritório percebe ganha
  uma linha aqui.

## Como testar

- `apps/web/src/routes/_public/route.unit.test.tsx` — links do rodapé, página de Segurança e aviso dos Termos.
- Manual: abrir `/auth` sem sessão, descer ao rodapé e abrir cada link.

## Pendências

- [ ] Canais de atendimento (e-mail, WhatsApp) em `CONTACT_CHANNELS` — perita informa.
- [ ] Texto final de Termos de uso e Política de privacidade (advogado).

## Histórico

- 2026-11-21 — Criadas as seis páginas e o rodapé comum do `_public`; o rodapé próprio da tela de planos sai (AD-248).
