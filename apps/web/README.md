# MoneyLens UI

MoneyLens UI is designed to provide a seamless and intuitive user experience for managing personal finances. The interface emphasizes clarity, responsiveness, and ease of navigation, enabling users to track expenses, visualize financial data, and interact with core features efficiently. Built with modern web technologies, MoneyLens UI aims to make financial management accessible and engaging for everyone.


The MoneyLens UI leverages React for building dynamic user interfaces, Refine for rapid development of data-driven applications, and Tailwind CSS for utility-first styling. This combination ensures a robust, scalable, and visually appealing frontend architecture, enabling efficient development and a consistent user experience across devices.

<details>
<div align="center" style="margin: 30px;">
    <a href="https://refine.dev">
    <img alt="refine logo" src="https://refine.ams3.cdn.digitaloceanspaces.com/readme/refine-readme-banner.png">
    </a>
</div>
<br/>

This [Refine](https://github.com/refinedev/refine) project was generated with [create refine-app](https://github.com/refinedev/refine/tree/master/packages/create-refine-app).

## Getting Started

A React Framework for building internal tools, admin panels, dashboards & B2B apps with unmatched flexibility ✨

Refine's hooks and components simplifies the development process and eliminates the repetitive tasks by providing industry-standard solutions for crucial aspects of a project, including authentication, access control, routing, networking, state management, and i18n.

## Available Scripts

### Running the development server.

```bash
    npm run dev
```

### Building for production.

```bash
    npm run build
```

### Running the production server.

```bash
    npm run start
```

## Learn More

To learn more about **Refine**, please check out the [Documentation](https://refine.dev/docs)

- **Supabase Data Provider** [Docs](https://refine.dev/docs/core/providers/data-provider/#overview)
- **Tailwind CSS** [Docs](https://refine.dev/docs/guides-concepts/general-concepts/#headless-concept)

</details>

## Authentication

MoneyLens uses Supabase Auth with the following methods:

### Email & Password
- Traditional email/password login
- Email confirmation optional
- Secure password requirements

### Magic Link (Passwordless)
- One-click login via email
- No password required
- Secure token-based authentication
- Tokens expire after 1 hour

### Password Reset
- Self-service password reset via email
- Secure token-based verification
- Tokens are single-use and expire after 1 hour

## Deployment (Vercel)

This project is deployed on Vercel with two environments:

- Pre-production (Vercel Preview): all branches except `release` deploy here automatically.
- Production (Vercel Production): the `release` branch deploys here automatically.


No GitHub Actions are required for deploys; Vercel will build and deploy automatically on pushes/PRs according to the branch rules above.

### Branch → Environment mapping

- `release` → Production deployment
- any other branch (including `main`) → Preview deployment (preproduction)


## Development workflow

Short-lived branches are created off `main`, changes are merged via PR, and deploys happen automatically:

1) Start work

- Branch from `main`: `feature/*`, `bugfix/*`, or `chore/*`.
- Push commits and open a PR into `main`.

2) CI & review

- PR builds a Vercel Preview automatically (preproduction URL).
- Reviewers verify changes using the Preview URL and approve the PR.

3) Merge to `main`

- After merge, the `main` branch continues to deploy to the preproduction (Preview) environment.

4) Promote to production via `release`

- When a releasable set of features is ready, open a PR from `main` → `release`.
- Merging into `release` automatically deploys to the Production environment on Vercel.

### Hotfixes (optional)

- For urgent production fixes, create `hotfix/*` from `release`, open a PR into `release` (deploys to Production on merge), then synchronize those changes back to `main` (PR `release` → `main` or re-merge the hotfix).

### Best practices

- Prefer squash merges into `main` to keep history clean.
- Keep `release` fast-forward or synced from `main` via PRs to avoid drift.

## Operating notes

- Preview URLs are unique per commit/PR—share them in code reviews and QA.
- Environment variables in Vercel are injected at build time; update and redeploy if they change.


## License

MIT