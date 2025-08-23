CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
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

