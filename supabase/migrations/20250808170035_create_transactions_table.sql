CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- Create enum type for transaction type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('earn', 'spend', 'save');
    END IF;
END$$;

CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    date date NOT NULL,
    type transaction_type NOT NULL,
    category text,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    tags text[],
    notes text,
    bank_account text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Views for spendings, earnings, and savings (using enum comparison)
CREATE OR REPLACE VIEW transactions_spend AS
SELECT * FROM transactions WHERE type = 'spend'::transaction_type;

CREATE OR REPLACE VIEW transactions_earn AS
SELECT * FROM transactions WHERE type = 'earn'::transaction_type;

CREATE OR REPLACE VIEW transactions_save AS
SELECT * FROM transactions WHERE type = 'save'::transaction_type;