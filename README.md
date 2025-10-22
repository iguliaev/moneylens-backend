# MoneyLens

**MoneyLens** is a personal finance tool designed to help you understand where your money goes, assist with budgeting, and provide insights to optimize your spending. With MoneyLens, you can easily track your spendings, earnings, and savings, and gain actionable insights to improve your financial habits.

## Features

- Track transactions: earnings, spendings, and savings
- Categorize and tag transactions
- Add notes and metadata to each transaction
- Get insights and analytics on your financial activity
- Budgeting tools (planned)
- Optimizations and recommendations (planned)

## Tech Stack

- **Backend:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime)
- **Frontend:** [Refine](https://refine.dev/) (coming soon)

## Database

The database schema is managed with Supabase migrations. The main table is `transactions`, which stores all your financial activity.

You can find the schema in [supabase/migrations/20250808170035_create_transactions_table.sql](supabase/migrations/20250808170035_create_transactions_table.sql).

## Getting Started

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Node.js](https://nodejs.org/) (for frontend, coming soon)
- [Deno](https://deno.com/) (if using edge functions)

### Supabase CLI Commands

Initialize and manage your local Supabase project:

```sh
# Start Supabase local development stack
supabase start

# Stop Supabase services
supabase stop

# Apply database migrations
supabase db push

# Create a new migration after editing SQL files
supabase migration new <migration_name>

# Reset the database (drops and recreates)
supabase db reset
```

See [supabase/config.toml](supabase/config.toml) for project configuration.

### Database Management

- Migrations are stored in [supabase/migrations/](supabase/migrations/).
- You can edit or add SQL files for schema changes.
- Use the Supabase Studio (`supabase studio`) for a web UI to manage your database and data.

## Development Workflow

This project uses a Git flow centered around two main branches: `main` and `release`.

- **`main`**: The default branch and the primary line of development. All new features, bugfixes, and chores are branched from here.
- **`release`**: Represents the production-ready state of the application.

### Contribution Process

1.  **Create a branch**: Start new work by creating a branch from `main`. Use a descriptive naming convention, such as:
    - `feature/<feature-name>`
    - `bugfix/<bug-name>`
    - `chore/<task-name>`

2.  **Commit changes**: Make your changes and commit them with clear, descriptive messages.

3.  **Submit a Pull Request (PR)**: Once your work is ready for review, open a PR against the `main` branch.

4.  **Review and Merge**: After the PR is reviewed and approved, it will be merged into `main`.

## Deployment

The project uses a two-environment deployment strategy tied to the branching model.

- **Staging Environment**: Merging a PR into the `main` branch automatically triggers a deployment to the staging environment. This allows for verification and testing before a production release.

- **Production Environment**: The `release` branch is manually synchronized with `main` when a feature set is ready for production. Pushing changes to the `release` branch automatically triggers a deployment to the production environment.

## License

MIT
