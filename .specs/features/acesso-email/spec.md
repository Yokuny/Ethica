# Acesso por e-mail (sem senha)

Pedido da perita em 2026-11-02: "recrie a tela de login e o processo tornando o cadastro apenas por
email e passkey de acesso, via email do usuario para transferirmos a segurança de login ao provedor de
email do usuario".

O Ethica deixa de ter senha. Quem prova a identidade é a caixa de e-mail da pessoa: ela digita o
e-mail, recebe uma **chave de acesso** (botão "Entrar no Ethica" + código de 6 dígitos) e entra. O
mesmo caminho serve para quem ainda não tem conta: confirmado o e-mail, ela cria o próprio escritório.

## Escolhas da perita (2026-11-02)

| Pergunta | Resposta |
| --- | --- |
| Como usar a chave | Link e código no mesmo e-mail |
| Quem cria conta | Cadastro aberto: e-mail novo confirmado cria um escritório e vira admin |
| Tempo conectado | 30 dias por aparelho; "Sair" encerra na hora |

## Requisitos

| ID | Requisito |
| --- | --- |
| ACE-01 | A tela de login pede só o e-mail e envia a chave de acesso para ele. A resposta é sempre "enviamos a chave para <e-mail>", exista ou não a conta (não revela quem está cadastrado). Conta desativada não recebe e-mail. |
| ACE-02 | A chave vale 15 minutos e uma vez só; pedir outra invalida a anterior. O código aceita 5 tentativas erradas e depois é descartado. |
| ACE-03 | O botão do e-mail abre `/auth?token=…` e entra direto; o código é digitado na tela que ficou aberta. |
| ACE-04 | E-mail sem conta, depois de confirmado, vê o passo "Criar escritório": nome da pessoa, nome do escritório e CNPJ (escritório só com CNPJ, AD-144). Ao salvar, o escritório nasce ativo, a pessoa é admin e já entra. |
| ACE-05 | Convite (da plataforma ou do admin): o link do convite já prova o e-mail; a pessoa informa só o nome e entra. |
| ACE-06 | A sessão dura 30 dias. Sai a senha de todo o sistema: campo no banco, troca de senha em Minha conta, login por senha e senha dos scripts de carga. |
| ACE-07 | Em produção a API só sobe com envio de e-mail real configurado (SMTP); sem ele ninguém conseguiria entrar. |

## Fora de escopo

- Passkey biométrica (WebAuthn/Face ID). "Passkey" aqui é a chave enviada por e-mail.
- Trocar o e-mail da conta.

## Design

**Banco** (`packages/db/src/models/access-key.model.ts`, dono `identity`): `AccessKey` com `email`
(único: uma chave viva por e-mail), `tokenHash` (link), `codeHash` (código), `attempts` e `expiresAt`
com índice TTL. Só os hashes são gravados (`hashToken`, como convite e sessão). `User.password` sai.

**API** (`apps/api/src/modules/identity/auth.*`):

| Rota | Faz |
| --- | --- |
| `POST /auth/access-key` `{ email }` | Gera token (32 bytes) e código (6 dígitos), substitui a chave do e-mail e envia o e-mail. Sempre `200 access_key_sent`. |
| `POST /auth/access-key/verify` `{ token }` ou `{ email, code }` | Consome a chave. Com conta: cria a sessão (cookie) e devolve `{ signedIn: true }`. Sem conta: devolve `{ signupToken }` (JWT de 30 min com o e-mail, `purpose: 'signup'`). Erro: `invalid_access_key`. |
| `POST /auth/signup` `{ signupToken, name, officeName, document }` | Cria `Tenant` ativo + `User` admin e a sessão. |

`POST /auth/signin` sai. A criação de sessão fica numa função só (`auth.service.startSession`), usada
pelo login, pelo cadastro e pelo aceite de convite (antes duplicada em `invite.service`). Sessão,
JWT e cookie passam a 30 dias. As duas rotas de chave usam o limitador por e-mail + IP que protegia o
login. Em produção, `env.config.ts` exige `MAIL_PROVIDER=nodemailer` com `SMTP_HOST` e `SMTP_FROM`.

**Web** (`apps/web/src/routes/_public/auth/`): uma página com três passos no mesmo hook — e-mail →
código (com "Reenviar" e "Usar outro e-mail") → criar escritório. Com `?token=` na URL, verifica ao
abrir. O convite perde o campo de senha; Minha conta perde o bloco Senha.

Decisões: AD-155 (acesso sem senha) e AD-156 (SMTP obrigatório em produção) em `.specs/STATE.md`.
