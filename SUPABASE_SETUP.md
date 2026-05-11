# Supabase Setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste and run the contents of `supabase-schema.sql`.
4. Go to **Authentication > Providers > Email**.
5. For quick testing, you can turn off email confirmation. If you leave it on, each new account must confirm by email before logging in.
6. Start the app locally:

```bash
npm run dev
```

The app uses `.env.local` for:

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The publishable key is safe to use in the browser. The database security comes from the row-level security policies in `supabase-schema.sql`.

Current database behavior:

- each user can only be in one couple space through the app functions
- each couple space allows at most two members
- messages are only readable/writeable by members of that couple space
- the app listens for new messages and partner joins through Supabase Realtime
