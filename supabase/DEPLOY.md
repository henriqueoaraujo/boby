# Publicação do Supabase

Projeto: `wibpacyerlbajjnhtpud`

## Banco

Execute no SQL Editor, nesta ordem:

1. `migrations/v57.sql`
2. `migrations/v58-production.sql`

Depois confirme que `tasks`, `categories` e `app_errors` aparecem no Table Editor.

## Exclusão de conta

Com a Supabase CLI autenticada:

```bash
supabase link --project-ref wibpacyerlbajjnhtpud
supabase functions deploy delete-account
```

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` são disponibilizadas automaticamente no ambiente
da Edge Function hospedada pelo Supabase.

## OAuth

Habilite Google, GitHub e LinkedIn OIDC em Authentication > Providers.
Cada provedor exige um Client ID e um Client Secret próprios.

Callback comum:

```text
https://wibpacyerlbajjnhtpud.supabase.co/auth/v1/callback
```

Cadastre também a URL pública do Boby em Authentication > URL Configuration.
