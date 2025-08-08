# MoneyLens — Backend/Database Plan

## Project Summary

**Purpose**  
MoneyLens is a personal finance tracking app that helps track **spendings**, **earnings**, and **savings**, and provides analytics such as totals by month/year and category breakdowns.

**Technology Stack**  
- **Backend:** Supabase (PostgreSQL with auto-generated APIs)
- **Frontend:** Next.js + Refine (UI framework)
- **Repository Structure:**

```
moneylens/
|
+-- supabase/
|
+-- ui/
```


---

## Transaction Table Schema

| Column       | Type         | Description                                         |
|--------------|--------------|-----------------------------------------------------|
| id           | PK           | Unique identifier (UUID or serial)                 |
| date         | date         | Date of the transaction                             |
| type         | enum/text    | 'earn', 'spend', 'save'                             |
| category     | text         | Category of the transaction                         |
| amount       | decimal      | Positive amount                                     |
| tags         | text[]       | Optional tags                                       |
| notes        | text         | Optional notes                                      |
| bank_account | text         | Bank account name                                   |
| created_at   | timestamp    | Created timestamp                                   |
| updated_at   | timestamp    | Updated timestamp                                   |

---

## Planned Database Enhancements

1. **Views for Aggregated Data**
 - Monthly totals for each transaction type
 - Yearly totals for each transaction type
 - Breakdown by category for current month/year

2. **Row-Level Security (RLS) Policies**
 - Ensure only the authenticated user can access their own transactions

3. **Test Queries**
 - Totals for current month/year
 - Totals grouped by category
 - Totals grouped by tags (optional)

---

## Next Steps (Backend/Database)

1. **Create Supabase Project**
 - Initialize new Supabase project in `supabase/` directory
 - Configure local development with `supabase start`

2. **Implement Transaction Table**
 - SQL migration to create `transaction` table (schema above)
 - Add constraint for valid `type` values (`earn`, `spend`, `save`)

3. **Implement Aggregation Views**
 - `view_monthly_totals` — sums per type for the current month
 - `view_yearly_totals` — sums per type for the current year
 - (Optional) Category-specific views

4. **Enable Row-Level Security**
 - Turn on RLS for `transaction` table
 - Add policy for authenticated users to read/write their own records

5. **Seed Sample Data** (optional)
 - Insert sample transactions for testing queries

6. **Test Endpoints**
 - Use Supabase auto-generated REST API to fetch data from views and table

---

## Deliverables for Coding Agent

- SQL migrations for:
1. `transaction` table creation
2. Aggregation views creation
3. Enum constraint on `type` column
- Supabase RLS policy definitions
- Example queries for:
- Current month totals
- Current year totals
- Totals by category for current month/year
