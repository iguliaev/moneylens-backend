-- 005_categories.sql
-- Create categories table for user-defined transaction categories

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by user and type
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);

-- Unique constraint: each user cannot have duplicate category names per type
ALTER TABLE categories ADD CONSTRAINT unique_user_type_name UNIQUE (user_id, type, name);
