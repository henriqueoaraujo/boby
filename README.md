# Boby v56

- Tela de autenticação obrigatória antes do acesso ao sistema.
- Login por e-mail e senha ou Google.
- Cadastro com confirmação e validação de senha.
- Opção “Continuar conectado”.
- Sessão persistente disponível offline após um acesso válido.
- Sessão temporária limitada à aba quando a opção não está marcada.
- Recuperação de senha e logout com limpeza local de tokens.
- Agenda e dados ficam ocultos e inertes enquanto não há autenticação.

## Configuração

Crie um arquivo `.env` baseado em `.env.example`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

No Supabase, habilite os provedores desejados em **Authentication**. Para Google,
GitHub e LinkedIn, configure a URL pública do aplicativo nas URLs de
redirecionamento autorizadas.

Execute também `supabase/setup-completo-boby.sql` no **SQL Editor** do projeto.
Sem esse passo, o login funciona, mas tarefas e categorias permanecem apenas no
armazenamento local.

O arquivo `supabase/setup-completo-boby.sql` junta o schema atual e as migrações
necessárias em um único script. Ele pode ser executado mais de uma vez com
segurança.

O cadastro por e-mail exige a confirmação do link enviado pelo Supabase antes do
primeiro login. Google, GitHub e LinkedIn precisam ser habilitados individualmente
em **Authentication → Providers**.

As URLs e instruções exatas estão em `supabase/OAUTH_SETUP.md`. O modelo simples
do e-mail de confirmação está em `supabase/templates/confirm-signup.html`.

O formulário de cadastro inclui uma verificação de segurança local. Para proteção
antibot em produção, habilite também CAPTCHA em **Authentication → Bot and Abuse
Protection** no painel do Supabase e configure o provedor escolhido.

## Desenvolvimento

- `npm install`
- `npm run dev`
- `npm test`
- `npm run test:e2e`
- `npm run build`

## Publicação

O caminho mais simples é publicar no Vercel ou Netlify:

1. Envie o projeto para um repositório GitHub.
2. Importe o repositório na plataforma escolhida.
3. Use `npm run build` como comando de build e `dist` como diretório de saída.
4. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente.
5. Adicione a URL pública em **Supabase → Authentication → URL Configuration**.
6. Adicione a mesma origem e o callback do Supabase nos provedores OAuth.

Para GitHub Pages, configure a opção `base` do Vite com o nome do repositório.
Vercel ou Netlify são mais simples para este projeto porque permitem configurar
variáveis de ambiente e domínio HTTPS diretamente pelo painel.

O acesso offline exige que a pessoa tenha entrado anteriormente no mesmo
dispositivo. Senhas nunca são armazenadas pelo Boby.

## Operação

- Backups manuais e restauração ficam em Configurações > Preferências.
- O Boby mantém até cinco snapshots locais por usuário.
- Erros autenticados são registrados em `app_errors`, sem conteúdo de tarefas.
- Exclusão definitiva usa a Edge Function `delete-account`.
- Instruções de banco e função estão em `supabase/DEPLOY.md`.
- O workflow `.github/workflows/ci.yml` valida testes, build e interface.
