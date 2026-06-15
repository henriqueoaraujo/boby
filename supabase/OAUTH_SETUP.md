# OAuth do Boby

Projeto Supabase: `wibpacyerlbajjnhtpud`

## URLs

- Site URL local: `http://localhost:4177`
- Redirect URL local: `http://localhost:4177/**`
- Callback dos provedores:
  `https://wibpacyerlbajjnhtpud.supabase.co/auth/v1/callback`

Cadastre a Site URL e a Redirect URL em **Authentication → URL Configuration**.

## Google

1. Crie um cliente OAuth do tipo Web no Google Cloud.
2. Adicione `http://localhost:4177` às origens JavaScript.
3. Adicione o callback do Supabase às URIs de redirecionamento.
4. Informe Client ID e Client Secret em **Authentication → Providers → Google**.

## GitHub

1. Crie um OAuth App no GitHub.
2. Use `http://localhost:4177` como Homepage URL.
3. Use o callback do Supabase como Authorization callback URL.
4. Informe Client ID e Client Secret em **Authentication → Providers → GitHub**.

## LinkedIn

1. Crie um aplicativo no LinkedIn Developers.
2. Ative **Sign In with LinkedIn using OpenID Connect**.
3. Use o callback do Supabase nas Authorized Redirect URLs.
4. Informe Client ID e Client Secret em
   **Authentication → Providers → LinkedIn (OIDC)**.

O frontend já utiliza os identificadores corretos: `google`, `github` e
`linkedin_oidc`.

## E-mail

Em **Authentication → Email Templates → Confirm signup**:

- Assunto: conteúdo de `templates/confirm-signup-subject.txt`
- Corpo: conteúdo de `templates/confirm-signup.html`
