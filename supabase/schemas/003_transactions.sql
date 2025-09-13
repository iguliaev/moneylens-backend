
CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    date date NOT NULL,
    type transaction_type NOT NULL,
    category text,
    category_id uuid REFERENCES categories(id),
    amount numeric(12, 2) NOT NULL,
    tags text[],
    notes text,
    bank_account text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

