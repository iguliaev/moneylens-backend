CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    date date NOT NULL,
    type text NOT NULL CHECK (type IN ('earn', 'spend', 'save')),
    category text,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    tags text[],
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);