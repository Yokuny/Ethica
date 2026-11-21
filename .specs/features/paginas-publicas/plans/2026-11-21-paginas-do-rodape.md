# Plano — páginas do rodapé público (2026-11-21)

Pedido: apagar `pricing.html` e `design.html`; criar as páginas do rodapé (segurança, contato, suporte, novidades e
as legais) e repetir o rodapé em todas as páginas do `_public`.

Respostas da perita: páginas Termos de uso, Política de privacidade, Segurança, Contato, Suporte e Novidades; o canal
de contato ela informa depois; Termos e Privacidade só com a estrutura (texto final do advogado).

1. Rodapé no layout `apps/web/src/routes/_public/route.tsx` (vale para auth, invite, billing e as novas).
2. `_public/@components/`: `brand.tsx`, `public-footer.tsx`, `public-document.tsx` (barra + título + seções),
   `faq-list.tsx` e `contact-channels.tsx`; `_public/@consts/`: `footer.ts` e `faq.ts` (perguntas de planos saem do
   billing e servem também ao Suporte; `CONTACT_CHANNELS` vazio até a perita informar).
3. Rotas `terms`, `privacy` (estrutura e aviso de texto em elaboração), `security` (só o que o sistema faz),
   `contact`, `support` (uso + planos + canais) e `news` (lista em `news/@consts/news.ts`).
4. Billing usa a marca e as perguntas compartilhadas e perde o rodapé próprio.
5. Testes do rodapé e das páginas; prints; registro (feature.md, AD, roadmap).
