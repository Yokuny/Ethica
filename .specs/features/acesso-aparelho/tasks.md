# Tasks — acesso-aparelho

Um commit por task; gate `pnpm run check` (e `(cd apps/web && pnpm run build)` quando o web muda).
Versões de `@simplewebauthn/server` e `@simplewebauthn/browser` conferidas no Context7 antes da T2.

| # | Task | Requisitos | Prova |
| --- | --- | --- | --- |
| T1 | Retirar o cadastro de teste com senha: `User.passwordHash`, schema, rota, serviço, tela `access-password-form.tsx` e testes | APA-09 | e2e de auth sem a rota; `pnpm run check` |
| T2 | Model `Passkey` + `Session.passkey`; config `WEBAUTHN_RP_ID`/origem | APA-05, APA-07 | int test do índice `user + kind` |
| T3 | API: `passkeyToken` em verify/signup/convite; registro e entrada por passkey; troca do mesmo tipo encerra sessões; `startSession` exige passkey | APA-02 a APA-07 | e2e com respostas WebAuthn simuladas |
| T4 | API: `GET/DELETE /me/passkeys`; desativar membro apaga passkeys | APA-07, APA-08 | e2e |
| T5 | Web: passo passkey em `/auth` e no convite; "Entrar com este aparelho" e preenchimento automático | APA-02 a APA-04 | unit da página; teste manual no navegador |
| T6 | Web: layout em duas colunas e vitrine (filtros, agenda, mapa SVG, gráfico) | APA-01, APA-10 | build; captura de tela desktop e celular |
| T7 | Web: Minha conta → Aparelhos com acesso | APA-08 | unit |
| T8 | Registro: `feature.md`, AD-220 ativa, `pnpm docs:sync` | — | `pnpm docs:check` |
