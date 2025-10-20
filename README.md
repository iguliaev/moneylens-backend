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

### RPC Functions

#### `bulk_insert_transactions(p_transactions jsonb)`

Atomically inserts multiple transactions from a JSON array. This function is designed for bulk transaction uploads (e.g., CSV imports) and ensures all-or-nothing behavior: if any transaction fails validation, the entire batch is rolled back.

**Purpose:** Enable users to upload multiple transactions at once with proper validation, foreign key resolution, and atomic error handling.

**Parameters:**
- `p_transactions` (jsonb): Array of transaction objects to insert

**Returns:** JSONB object with result summary:
```json
{
  "success": true,
  "inserted_count": 100,
  "total_count": 100
}
```

**Error Handling:** If any validation fails, raises an exception with `SQLSTATE P0001` and DETAIL containing an errors array:
```json
[
  {
    "index": 0,
    "error": "Missing required field: date"
  },
  {
    "index": 5,
    "error": "Category 'InvalidCategory' not found for type 'spend'"
  }
]
```

**Transaction Object Schema:**

Each transaction in the array should have this structure:

```json
{
  "date": "2025-10-15",
  "type": "spend",
  "amount": 50.00,
  "category": "Groceries",
  "bank_account": "Chase Checking",
  "tags": ["essentials", "monthly"],
  "notes": "Weekly grocery shopping"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | string (YYYY-MM-DD) | ✅ Yes | Must be valid ISO date |
| `type` | string | ✅ Yes | Must be one of: `earn`, `spend`, `save` |
| `amount` | number | ✅ Yes | Must be numeric, positive or negative |
| `category` | string | ❌ No | If provided, must exist in user's categories for the given type |
| `bank_account` | string | ❌ No | If provided, must exist in user's bank_accounts |
| `tags` | string[] | ❌ No | If provided, all tag names must exist in user's tags table |
| `notes` | string | ❌ No | Free text, no validation |

**Key Features:**
- ✅ Authenticates user via `auth.uid()` before processing
- ✅ Validates all required fields (date, type, amount)
- ✅ Resolves category names to `category_id` (scoped to user and type)
- ✅ Resolves bank account names to `bank_account_id` (scoped to user)
- ✅ Validates all tags exist for the user
- ✅ Collects errors with row index for actionable feedback
- ✅ Ensures atomic behavior (all-or-nothing)
- ✅ Returns detailed error information for failed batches

**Usage Example:**

```javascript
// Using Supabase JavaScript client
const { data, error } = await supabase.rpc('bulk_insert_transactions', {
  p_transactions: [
    {
      date: '2025-10-15',
      type: 'spend',
      category: 'Groceries',
      amount: 50.00,
      bank_account: 'Checking'
    },
    {
      date: '2025-10-16',
      type: 'earn',
      category: 'Salary',
      amount: 3000.00
    }
  ]
});

if (error) {
  // Parse error.details for structured error information
  const errors = JSON.parse(error.details);
  console.error('Validation errors:', errors);
} else {
  console.log(`Successfully inserted ${data.inserted_count} transactions`);
}
```

**Important Notes:**
- All categories, bank accounts, and tags must already exist in the user's account (no auto-creation)
- Category names are resolved based on both name AND transaction type (e.g., "Salary" category only works with "earn" type)
- If ANY transaction fails validation, the entire batch is rolled back
- The function uses `SECURITY DEFINER` to bypass RLS but validates `auth.uid()` to ensure user authentication

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
