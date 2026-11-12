# Acesso preso ao aparelho (passkey) e tela de entrada nova

Pedido em 2026-11-12: "o processo de auth dependerá apenas do email do usuário, ele deve receber a
chave de acesso pelo email como se fosse uma passkey [...] para sabermos se o usuário está usando o
passkey na máquina que ele gerou vamos usar o webauthn", com layout novo em duas colunas.

Evolução de `acesso-email` (AD-155): o e-mail continua sendo quem prova a identidade, e cada entrada
pelo e-mail termina **criando a passkey do aparelho** (WebAuthn: Touch ID, Face ID, Windows Hello,
PIN do aparelho). Nas próximas vezes, naquele aparelho, a pessoa entra só com a passkey, sem e-mail.

## Escolhas (2026-11-12)

| Pergunta | Resposta |
| --- | --- |
| Link aberto em outro aparelho | Vale no aparelho em que foi aberto; o que importa é que a conta funcione num aparelho por vez de cada tipo, garantido pela passkey |
| Passkey depois de entrar pelo e-mail | **Obrigatória**: sem criar a passkey no aparelho, a pessoa não entra |
| Quantos aparelhos | **Um computador + um celular**. Entrar num computador novo derruba só o computador antigo; o celular continua (e vice-versa) |
| Passkey sincronizada (iCloud / Google) | **Aceita**: iPhone e Mac funcionam; a passkey fica presa à conta Apple/Google da pessoa |
| Cadastro de teste com senha (AD-157) | **Sai agora** |
| Lado direito da tela | Peças do produto com dados fictícios: botão Filtros com filtros escolhidos, agenda com compromissos, mapa com rota de vistorias e um gráfico |

## Requisitos

| ID | Requisito |
| --- | --- |
| APA-01 | A tela `/auth` tem duas colunas (lg+): à esquerda título, texto curto e o formulário; à direita a vitrine do produto (APA-10). No celular, só a coluna do formulário. |
| APA-02 | Aparelho com passkey: a tela oferece "Entrar com este aparelho" (e o preenchimento automático do navegador no campo de e-mail). A biometria/PIN confirma e a sessão abre, sem e-mail. |
| APA-03 | Aparelho sem passkey: e-mail → chave de acesso (link + código, como AD-155). Confirmada a chave, a pessoa **cria a passkey do aparelho**; só então a sessão abre. Recusar ou falhar volta ao passo da passkey, com "Tentar de novo"; a chave confirmada vale para isso por 10 minutos. |
| APA-04 | E-mail sem conta: chave confirmada → "Criar escritório" (como hoje) → passkey → sessão. Convite: link do convite → nome → passkey → sessão. |
| APA-05 | Cada pessoa tem no máximo **uma passkey de computador e uma de celular**. Criar uma passkey de um tipo apaga a anterior do mesmo tipo e encerra as sessões abertas por ela. |
| APA-06 | A passkey é do próprio aparelho (autenticador da plataforma, verificação do usuário obrigatória); chave de segurança USB e "usar o celular para entrar no computador" (QR) não valem. Passkey sincronizada pelo iCloud/Google é aceita. |
| APA-07 | Toda sessão nasce de uma passkey. Remover a passkey (em Minha conta ou pela troca de APA-05) encerra as sessões dela. Membro desativado perde as passkeys. |
| APA-08 | Minha conta mostra "Aparelhos com acesso": computador e celular, com nome do aparelho, criado em e último uso, e o botão Remover. Remover o aparelho atual sai do sistema. |
| APA-09 | Sai o cadastro de teste com senha (AD-157): `User.passwordHash`, rota e tela. |
| APA-10 | Vitrine (só ilustração, sem interação, oculta para leitores de tela): botão "Filtros" com contador e o painel aberto com filtros e valores escolhidos (como o filtro de `apps/web/src/components/data-table.tsx`); agenda do dia com compromissos; mapa ilustrado com rota de vistorias numerada; gráfico com dados fictícios. Tudo com componentes do `@ethica/ui`, sem imagem externa nem mapa carregado da internet. |

## Fora de escopo

- Trocar o e-mail da conta.
- Recuperação de conta sem e-mail (perdeu o e-mail, perdeu o acesso — AD-155).
- Prova por atestado de que a passkey está no chip (TPM): a Apple não fornece, e a passkey sincronizada foi aceita.

## Design

**Banco** (`packages/db`, dono `identity`):
- `Passkey`: `user`, `credentialId` (único), `publicKey`, `counter`, `transports`, `kind`
  (`desktop` | `mobile`), `backedUp`, `label` (navegador + sistema), `lastUsedAt`, timestamps.
  Índice único parcial `user + kind`: um de cada tipo.
- `Session.passkey` (referência): apagar a passkey apaga as sessões dela.
- `AccessKey` sem mudança. `User.passwordHash` sai.

**Desafios WebAuthn**: o desafio vai num JWT curto (5 min, `purpose: 'webauthn'`) em cookie httpOnly,
sem coleção nova; consumido na verificação.

**API** (`apps/api/src/modules/identity/`), biblioteca `@simplewebauthn/server`:

| Rota | Faz |
| --- | --- |
| `POST /auth/access-key/verify` | Muda: com conta não abre mais sessão; devolve `{ passkeyToken }` (JWT 10 min, `purpose: 'passkey'`, com o `user`). Sem conta segue `{ signupToken }`. |
| `POST /auth/signup` | Muda: cria escritório + admin e devolve `{ passkeyToken }`. |
| `POST /invites/accept` | Muda: grava o nome e devolve `{ passkeyToken }`. |
| `POST /auth/passkey/register/options` `{ passkeyToken, kind }` | Opções de registro (plataforma, `residentKey` e `userVerification` obrigatórios). |
| `POST /auth/passkey/register` `{ passkeyToken, kind, response }` | Verifica, substitui a passkey do mesmo `kind` (e suas sessões), cria a sessão. |
| `POST /auth/passkey/options` | Opções de entrada (credencial descobrível, sem e-mail). |
| `POST /auth/passkey` `{ response }` | Verifica, atualiza `counter`/`lastUsedAt`, cria a sessão. |
| `GET /me/passkeys`, `DELETE /me/passkeys/:id` | Aparelhos com acesso. |

`startSession` passa a exigir a passkey. O `kind` vem do navegador (`navigator.userAgentData.mobile`,
com o user agent como reserva) e é conferido no servidor pelo user agent da requisição.
Config: `WEBAUTHN_RP_ID` e origem a partir de `WEB_URL` (`apps/api/src/config/env.config.ts`).
**Atenção**: a passkey fica presa ao domínio; trocar o domínio do front invalida todas e cada
pessoa entra de novo pelo e-mail.

**Web**: `apps/web/src/routes/_public/auth/` com `@simplewebauthn/browser`; o hook `use-access.ts`
ganha o passo "passkey". O convite termina no mesmo passo. Vitrine em
`apps/web/src/routes/_public/auth/@components/` (mapa em SVG, gráfico com `chart` do `@ethica/ui`).
Minha conta ganha o bloco Aparelhos.

Decisão: AD-220 em `.specs/STATE.md`.
