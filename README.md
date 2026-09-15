# LGH RIS Online

Static RIS forms hosted on GitHub Pages with Supabase email/password authentication and per-user cloud data storage.

## Supabase setup

1. Create or select a Supabase project.
2. Open **SQL Editor**, paste `supabase-schema.sql`, and run it.
3. Open **Project Settings → Data API** and copy the Project URL and publishable/anon key.
4. Put those two public values in `supabase-config.js`. Never use the service-role key in this repository.
5. In **Authentication → URL Configuration**, add the GitHub Pages URL as the Site URL and Redirect URL.
6. In **Authentication → Providers → Email**, keep email/password enabled. Disable public sign-ups after creating the authorized accounts if registration should be restricted.

## GitHub Pages deployment

1. Push these files to a GitHub repository.
2. Open **Settings → Pages**.
3. Set the source to **Deploy from a branch**, select the main branch and `/ (root)`, then save.
4. Open the GitHub Pages URL and create or sign in to an account.

## Security

- Patient records are stored in `ris_user_data` and protected by Row Level Security.
- Each account can only read and change its own records.
- The Supabase anon/publishable key may be public; the service-role key must remain secret.
- This project should be reviewed against the hospital's privacy, access-control, audit, retention, and compliance requirements before clinical use.
