-- Enable Row-Level Security (RLS) for categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to manage their own categories
CREATE POLICY "Allow owner full access" ON categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Optionally, restrict SELECT to owner only (redundant with FOR ALL above)
-- CREATE POLICY "Allow owner select" ON categories
--     FOR SELECT
--     USING (auth.uid() = user_id);
