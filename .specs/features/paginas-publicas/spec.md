# Páginas públicas — spec (formulário de contato)

**Data**: 2026-11-21 · **Pedido**: usuário ("na tela de contato use o design presente em `contact.html`"). O modelo
(shadcnblocks) tem título, endereço, telefone e e-mail em destaque e um formulário: nome, e-mail, telefone, assunto e
mensagem, com "Enviar".

## Problema

`/contact` só mostra "os canais serão publicados em breve": o visitante não tem como falar com o Ethica. A perita ainda
não tem endereço, telefone nem e-mail para divulgar ("sem dados por enquanto").

## Requisitos

- **PUB-01** `/contact` no layout do modelo: título e chamada à esquerda; à direita o formulário com **nome**,
  **e-mail**, **telefone**, **assunto** (Planos e pagamento, Suporte, Sugestão, Parcerias) e **mensagem**, todos
  obrigatórios.
- **PUB-02** Enviar manda a mensagem por e-mail ao endereço do Ethica configurado no servidor (`CONTACT_EMAIL`); o
  visitante vê a confirmação na própria tela. Nunca envia para endereço vindo do formulário.
- **PUB-03** Sem `CONTACT_EMAIL`, o envio responde indisponível (`contact_not_configured`); falha do provedor de e-mail
  responde `email_send_failed`.
- **PUB-04** Até 5 envios por IP a cada 15 minutos (`too_many_attempts`).
- **PUB-05** O bloco de endereço, telefone e e-mail do modelo fica de fora até a perita informar os dados.
- **PUB-06** Suporte, Segurança e a ajuda da tela de planos levam ao formulário de `/contact`.

## Design (inline)

- **Contrato**: `packages/contracts/src/schemas/contactMessage.schema.ts` — `contactMessageSchema` (strict) e
  `CONTACT_SUBJECTS`.
- **API**: módulo novo `apps/api/src/modules/contact/` (router, controller, service), sem model; montado em
  `/contact` com o `mailProvider` e o destino `env.CONTACT_EMAIL`. Corpo do e-mail em HTML com o texto do visitante
  escapado; assunto do e-mail montado só do rótulo do assunto. Limite por IP (`contactRateLimit`), e a API passa a
  confiar no primeiro proxy (`trust proxy` = 1, Railway) para que o IP seja o do visitante — vale também para os
  limites que já existem.
- **Web**: `apps/web/src/routes/_public/contact/` com `@hooks/use-contact-form.ts` (useForm + zodResolver + post) e
  `@components/contact-form.tsx`; os textos de ajuda apontam para `/contact`; sai `CONTACT_CHANNELS` e o componente de
  canais.
- Termo novo no glossário: **Mensagem de contato** = `ContactMessage`.

## Tasks

1. AD-249 e glossário.
2. Contrato + chave `contact_not_configured` em `API_MESSAGE_KEYS` e no dicionário.
3. API: env, rate limit, `trust proxy`, módulo `contact`, e2e (envio, 400, 429, 503, destino = env).
4. Web: página no modelo, form, confirmação, links de ajuda; teste unitário.
5. Prints desktop/celular (vazio, enviado, erro); registro (feature.md, roadmap: `CONTACT_EMAIL` na Railway, texto
   de Privacidade cobrindo os dados do formulário); `pnpm docs:sync`.
