
-- TODO: Enable Row-Level Security (RLS) on transactions table and set up policies for user access


-- -- Enable Row-Level Security (RLS) on transactions table
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- -- Add user_id column if not present (uncomment if needed)
-- -- ALTER TABLE transactions ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- -- Policy: Users can view their own transactions
-- CREATE POLICY "Users can view their own transactions"
--   ON transactions
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- -- Policy: Users can insert their own transactions
-- CREATE POLICY "Users can insert their own transactions"
--   ON transactions
--   FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

-- -- Policy: Users can update their own transactions
-- CREATE POLICY "Users can update their own transactions"
--   ON transactions
--   FOR UPDATE
--   USING (auth.uid() = user_id);

-- -- Policy: Users can delete their own transactions
-- CREATE POLICY "Users can delete their own transactions"
--   ON transactions
--   FOR DELETE
--   USING (auth.uid() = user_id);

-- -- Enforce RLS
-- ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
