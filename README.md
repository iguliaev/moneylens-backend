# MoneLens

**MoneLens** is a personal finance tool designed to help you understand where your money goes, assist with budgeting, and provide insights to optimize your spending. With MoneLens, you can easily track your spendings, earnings, and savings, and gain actionable insights to improve your financial habits.

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

## Frontend

The UI will be built with [Refine](https://refine.dev/), a React-based framework for building data-intensive applications. (Coming soon!)

## License

MIT
