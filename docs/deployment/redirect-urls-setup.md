# Redirect URLs Setup

## Supabase Dashboard Configuration

1. Go to the Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to: **Authentication** → **URL Configuration** (or similar section for redirect URLs)

## URLs to Add

### Site URL
- Production: `https://moneylens-mocha.vercel.app/`
- Staging: `https://moneylens-git-main-igor-guliaevs-projects.vercel.app/`
- Local development: `http://localhost:3000`

### Additional Redirect URLs
- Add any allowed redirect destinations that your application uses (for example):
  - `https://moneylens-mocha.vercel.app/`
  - `https://moneylens-git-main-igor-guliaevs-projects.vercel.app/`
  - `http://localhost:3000`


## Why These URLs?
- **Site URL:** Default redirect used by Supabase when generating email links.
- **Additional Redirect URLs:** Supabase will only redirect to whitelisted URLs when a `redirectTo` or `next` parameter is provided; add all valid domains/paths you expect to use.


## Security Note
Only add trusted URLs. Supabase will reject redirect attempts to any URL not in this allow-list. Avoid adding wildcard or broad domains unless strictly necessary.


## Quick Steps (Summary)
1. Open Supabase Dashboard → Authentication → URL Configuration
2. Set `SITE_URL` to production/staging/local as appropriate
3. Add the additional redirect URLs used by your app
4. Save and test by generating a magic link / recovery email and confirming the `next` parameter resolves to an allowed URL
