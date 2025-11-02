# Environment Variables

## Required for Production

### SITE_URL
- Description: Base URL of your application, used for email redirects and templates.
- Local: `http://localhost:3000`
- Staging: `https://moneylens-git-main-igor-guliaevs-projects.vercel.app/`
- Production: `https://moneylens-mocha.vercel.app/`
- Used by: Supabase Auth for generating redirect links in magic link and password reset emails.


## Optional / Recommended for Production

## Notes & Validation
- Ensure `SITE_URL` is set correctly in production; email links are generated using this value.
- For local development set `SITE_URL=http://localhost:3000` before starting Supabase so email links point to your dev site.
