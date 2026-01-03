# Email Templates Setup (Hosted Supabase or Self-Managed)

## One-Time Setup (Hosted Supabase)

1. Go to the Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to: **Authentication** → **Email** → **Templates**

### Magic Link Template
- Template name: Magic Link (or create a custom template)
- Subject: `Your Magic Link for MoneyLens`
- Content: copy the contents of `moneylens-backend/supabase/templates/magic-link.html` (or the HTML below) and ensure the template uses the variables `{{ .SiteURL }}` and `{{ .TokenHash }}`.
- Ensure the generated link includes the query parameters `type=magiclink` and `next=/dashboard` (or uses the supplied `redirectTo`/`next`).

### Password Recovery Template
- Template name: Reset Password (or create a custom template)
- Subject: `Reset Your Password - MoneyLens`
- Content: copy the contents of `moneylens-backend/supabase/templates/recovery.html` and ensure it uses `{{ .SiteURL }}` and `{{ .TokenHash }}`.
- Ensure the generated link includes the query parameters `type=recovery` and `next=/update-password`.


## Self-Managed (supabase/config.toml)
If you manage Supabase locally (or with config files), add template entries to `moneylens-backend/supabase/config.toml`:

```toml
[auth.email.template.magic_link]
subject = "Your Magic Link for MoneyLens"
content_path = "./supabase/templates/magic-link.html"

[auth.email.template.recovery]
subject = "Reset Your Password - MoneyLens"
content_path = "./supabase/templates/recovery.html"
```

The `content_path` should point to the HTML files included in the repository. When Supabase starts with that config, it will use these templates for emails.


## Validation Checklist
- [ ] `moneylens-backend/supabase/templates/` directory exists and contains `magic-link.html` and `recovery.html`.
- [ ] Both templates include `{{ .SiteURL }}` and `{{ .TokenHash }}`.
- [ ] Templates produce links containing `token_hash` and `type` query params (magiclink or recovery).
- [ ] Magic link `next` points to `/dashboard` (or the configured redirect)
- [ ] Recovery link `next` points to `/update-password`
- [ ] After updating templates, restart Supabase: `supabase stop && supabase start` (for local/self-managed).


## Testing
1. Trigger a magic link or password reset in your local dev flow.
2. Open Inbucket (default local dev Inbox): `http://localhost:54324` and verify the email content.
3. Confirm the link redirects to `http(s)://<SITE_URL>/auth/confirm?token_hash=...&type=...&next=...`.
4. Click through and follow the rest of the flow (see implementation plan tests).
