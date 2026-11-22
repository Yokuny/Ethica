---
feature: Páginas públicas do rodapé
slug: paginas-publicas
descricao: Rodapé comum das páginas sem login com Sobre, Novidades, Segurança, Suporte, Contato, Termos de uso e Política de privacidade
data: 2026-11-21
status: parcial
areas: [apps/web, apps/api, packages/contracts]
decisoes: [AD-248, AD-249]
spec: [.specs/features/paginas-publicas]
---

# Páginas públicas do rodapé

**Status**: parcial · **Atualizado**: 2026-11-21 · **Áreas**: `apps/web`, `apps/api`, `packages/contracts`

> Documento vivo. Spec do formulário de contato em `.specs/features/paginas-publicas/spec.md` e plano em
> `.specs/features/paginas-publicas/plans/` (congelados).
> Correlação com o git: `git log --oneline -i --grep='paginas-publicas'`.

## O que foi feito

- Todas as páginas sem login (Entrar, convite, planos e as novas) fecham com o mesmo rodapé: marca, promessa do
  produto, colunas **Produto** (Sobre, Novidades, Segurança), **Ajuda** (Suporte, Contato) e **Legal** (Termos de uso,
  Política de privacidade) e o "© ano Ethica".
- **Sobre** (`/about`) no modelo shadcnblocks da perita: topo com o título, dois fatos do produto (perícias e
  assistências trabalhistas, cíveis e federais; da nomeação aos honorários) ao lado da história do Ethica, e a grade
  "Para quem é o Ethica" (perito judicial, assistente técnico, equipe do escritório) no lugar da grade de fundadores.
  Abaixo, a grade de parceiros com os logos do modelo (`apps/web/public/partners/`, lista em
  `apps/web/src/routes/_public/about/@consts/partners.ts`): são marcas reais que não são parceiras do Ethica e ficam
  por escolha da perita até chegarem os parceiros corretos. A foto do topo e os fundadores esperam o material dela.
- **Segurança** (`/security`): entrada sem senha com passkey, dados separados por escritório, papéis conferidos no
  servidor, arquivos privados por escritório e pagamento na fatura do Asaas.
- **Suporte** (`/support`): perguntas de uso (entrada, aparelhos, equipe, vistoria sem internet), as mesmas perguntas
  de planos da tela `/billing` e o botão para o formulário de Contato.
- **Contato** (`/contact`) no modelo shadcnblocks da perita: título à esquerda e formulário (nome, e-mail, telefone,
  assunto e mensagem) que envia a mensagem por e-mail à caixa do Ethica (`CONTACT_EMAIL`) e mostra "Mensagem
  enviada" (AD-249). Até 5 envios por IP a cada 15 minutos. O bloco de endereço, telefone e e-mail do modelo espera
  os dados da perita.
- **Novidades** (`/news`): o que mudou no Ethica, do mais novo ao mais antigo.
- **Termos de uso** (`/terms`) e **Política de privacidade** (`/privacy`): só as seções, com o aviso de texto em
  elaboração.

## Por que

Pedido do usuário em 2026-11-21, depois da página de planos no modelo shadcnblocks: o rodapé do modelo leva a essas
páginas e elas valem para qualquer visitante, logado ou não (AD-248).

## Como

- `apps/web/src/routes/_public/route.tsx` — layout com o `PublicFooter` depois do `Outlet`.
- `apps/web/src/routes/_public/@components/` — `brand.tsx`, `public-nav.tsx`, `public-footer.tsx`,
  `public-document.tsx` (molde das páginas de texto), `faq-list.tsx`.
- `apps/web/src/routes/_public/@consts/` — `footer.ts` (colunas), `faq.ts` (perguntas).
- `apps/web/src/routes/_public/about/index.tsx` — página Sobre, só texto (`about_*` no dicionário).
- `apps/web/src/routes/_public/contact/` — página, `@hooks/use-contact-form.ts`, `@query/contact.ts`, assuntos em `@consts/`.
- `packages/contracts/src/schemas/contactMessage.schema.ts` — `contactMessageSchema`, `CONTACT_SUBJECTS`.
- `apps/api/src/modules/contact/` — `POST /contact` público: limite por IP (`contactRateLimit`), e-mail à
  `CONTACT_EMAIL` com o texto escapado; a API confia no primeiro proxy (`trust proxy`) para ler o IP do visitante.
- `apps/web/src/routes/_public/news/@consts/news.ts` — lista das novidades: entrega que o escritório percebe ganha
  uma linha aqui.

## Como testar

- `apps/web/src/routes/_public/route.unit.test.tsx` — links do rodapé, Sobre, Segurança, aviso dos Termos e envio do Contato.
- `apps/api/src/modules/contact/contact.router.e2e.test.ts` — envio só à caixa configurada, 400, 503, 502 e 429 por IP.
- Manual: `CONTACT_EMAIL` no `.env` (com `MAIL_PROVIDER=log` a mensagem aparece no log da API) e enviar pelo `/contact`.
- Manual: abrir `/auth` sem sessão, descer ao rodapé e abrir cada link.

## Pendências

- [ ] `CONTACT_EMAIL` na Railway; sem ela o formulário responde indisponível.
- [ ] Endereço, telefone e e-mail do Ethica no topo do Contato, como no modelo — perita informa.
- [ ] Trocar os logos da grade de parceiros da página Sobre pelos parceiros reais: hoje mostram marcas de outras empresas (OpenAI, Claude, Okta…) que não são parceiras do Ethica.
- [ ] Foto do topo e fundadores (foto, nome e cargo) da página Sobre — perita envia.
- [ ] Texto final de Termos de uso e Política de privacidade (advogado); a Privacidade cobre os dados do formulário de contato.

## Histórico

- 2026-11-21 — Criadas as seis páginas e o rodapé comum do `_public`; o rodapé próprio da tela de planos sai (AD-248).
- 2026-11-21 — Contato no modelo `contact.html` da perita (o arquivo de referência fica fora do commit): formulário com envio por e-mail à `CONTACT_EMAIL`, módulo `contact` na API e `trust proxy` (AD-249). Saem `CONTACT_CHANNELS` e o aviso "canais em breve"; Suporte, Segurança e a ajuda dos planos levam ao formulário.
- 2026-11-21 — Página Sobre (`/about`) no modelo `design.html` da perita (o arquivo de referência fica fora do commit), com link na coluna Produto do rodapé. Sem foto, fundadores e parceiros reais, o topo usa o gradiente do tema e a grade de fundadores vira "Para quem é o Ethica"; a grade de logos fica de fora até a perita enviar o material.
- 2026-11-21 — Grade de parceiros na página Sobre com os logos do modelo, a pedido da perita, que vai trocá-los pelos parceiros corretos. Os SVGs do modelo são marcas reais, não fictícias; a perita foi avisada e preferiu mantê-los. Cada SVG ganhou `<title>` com o nome da marca (regra de acessibilidade do Biome).
