# TODO

## Parity With Google Sheets

### User-defined Categories for Spendings, Earnings, and Savings

#### 1. Database & Backend
- [ ] Create a `categories` table with fields: id, user_id, type, name, created_at.
  - Prompt: Create a migration to add a `categories` table as described.
- [ ] Add RLS policies so users can only access their own categories.
  - Prompt: Add RLS policies for the `categories` table so only the owner can select/insert/update/delete.
- [ ] Update the `transactions` table to reference `categories(id)` (foreign key).
  - Prompt: Alter the `transactions` table so `category` is a foreign key to `categories(id)`.
- [ ] Add seed data for categories for test users.
  - Prompt: Add seed SQL to insert sample categories for each test user.

#### 2. API & Data Provider
- [ ] Add functions to list, create, update, and delete categories in the data provider.
  - Prompt: Add CRUD functions for categories to the data provider.

#### 3. UI
- [ ] Add a "Manage Categories" page or modal for users.
  - Prompt: Scaffold a page/modal for listing, adding, editing, and deleting categories.
- [ ] Update transaction forms to use a dropdown/select for category, populated from user’s categories.
  - Prompt: Replace the category input in transaction forms with a dropdown of user categories, and allow adding a new category inline.

#### 4. Testing
- [ ] Add tests for category RLS and CRUD operations.
  - Prompt: Add pgTAP tests for category RLS and CRUD.

#### 5. Migration & Data Integrity
- [ ] Migrate existing transaction categories to the new table for existing users (if needed).
  - Prompt: Write a migration to convert existing transaction category text values to category records for each user.

---

### User-defined Tags for Spendings, Earnings, and Savings

#### 1. Database & Backend
- [ ] Create a `tags` table with fields: id, user_id, name, created_at.
  - Prompt: Create a migration to add a `tags` table as described.
- [ ] Add RLS policies so users can only access their own tags.
  - Prompt: Add RLS policies for the `tags` table so only the owner can select/insert/update/delete.
- [ ] Update the `transactions` table to reference tags (many-to-many via a join table, e.g. `transaction_tags`).
  - Prompt: Create a `transaction_tags` join table with transaction_id and tag_id, and update logic to use it.
- [ ] Add seed data for tags for test users.
  - Prompt: Add seed SQL to insert sample tags for each test user.

#### 2. API & Data Provider
- [ ] Add functions to list, create, update, and delete tags in the data provider.
  - Prompt: Add CRUD functions for tags to the data provider.
- [ ] Add functions to assign/unassign tags to transactions.
  - Prompt: Add functions to assign and remove tags for a transaction in the data provider.

#### 3. UI
- [ ] Add a "Manage Tags" page or modal for users.
  - Prompt: Scaffold a page/modal for listing, adding, editing, and deleting tags.
- [ ] Update transaction forms to use a multi-select for tags, populated from user’s tags.
  - Prompt: Replace the tags input in transaction forms with a multi-select of user tags, and allow adding a new tag inline.

#### 4. Testing
- [ ] Add tests for tag RLS and CRUD operations.
  - Prompt: Add pgTAP tests for tag RLS and CRUD.
- [ ] Add tests for assigning and removing tags from transactions.
  - Prompt: Add pgTAP tests for transaction_tags assignment and removal.

#### 5. Migration & Data Integrity
- [ ] Migrate existing transaction tags to the new table for existing users (if needed).
  - Prompt: Write a migration to convert existing transaction tag arrays to tag records and transaction_tags for each user.

---

### User-defined Bank Accounts for Transactions

#### 1. Database & Backend
- [ ] Create a `bank_accounts` table with fields: id, user_id, name, created_at.
  - Prompt: Create a migration to add a `bank_accounts` table as described.
- [ ] Add RLS policies so users can only access their own bank accounts.
  - Prompt: Add RLS policies for the `bank_accounts` table so only the owner can select/insert/update/delete.
- [ ] Update the `transactions` table to reference `bank_accounts(id)` (foreign key).
  - Prompt: Alter the `transactions` table so `bank_account` is a foreign key to `bank_accounts(id)`.
- [ ] Add seed data for bank accounts for test users.
  - Prompt: Add seed SQL to insert sample bank accounts for each test user.

#### 2. API & Data Provider
- [ ] Add functions to list, create, update, and delete bank accounts in the data provider.
  - Prompt: Add CRUD functions for bank accounts to the data provider.

#### 3. UI
- [ ] Add a "Manage Bank Accounts" page or modal for users.
  - Prompt: Scaffold a page/modal for listing, adding, editing, and deleting bank accounts.
- [ ] Update transaction forms to use a dropdown/select for bank account, populated from user’s bank accounts.
  - Prompt: Replace the bank account input in transaction forms with a dropdown of user bank accounts, and allow adding a new bank account inline.

#### 4. Testing
- [ ] Add tests for bank account RLS and CRUD operations.
  - Prompt: Add pgTAP tests for bank account RLS and CRUD.

#### 5. Migration & Data Integrity
- [ ] Migrate existing transaction bank account values to the new table for existing users (if needed).
  - Prompt: Write a migration to convert existing transaction bank account text values to bank account records for each user.

---

## (Optional) User Profile Entity

### Motivation
Centralize user-specific data (categories, tags, bank accounts, preferences) and simplify future features and RLS policies.

#### 1. Database & Backend
- [ ] Create a `user_profiles` table with fields: id, auth_user_id, name, created_at, etc.
  - Prompt: Create a migration to add a `user_profiles` table as described.
- [ ] Update `categories`, `tags`, and `bank_accounts` tables to reference `user_profiles.id` (or `auth.users.id`).
  - Prompt: Alter related tables to reference the user profile entity.
- [ ] Add RLS policies so users can only access their own profile-bound data.
  - Prompt: Update RLS policies for all user-bound tables to use the new user profile entity.
- [ ] Add seed data for user profiles for test users.
  - Prompt: Add seed SQL to insert sample user profiles for each test user.

#### 2. API & Data Provider
- [ ] Add functions to get and update user profile data.
  - Prompt: Add CRUD functions for user profiles to the data provider.
- [ ] Update category, tag, and bank account CRUD to use user profile references.
  - Prompt: Refactor data provider logic to use user profile entity.

#### 3. UI
- [ ] Add a "Profile" page/modal for users to view and edit their profile.
  - Prompt: Scaffold a page/modal for viewing and editing user profile data.
- [ ] Ensure category, tag, and bank account management UIs use the profile reference.
  - Prompt: Refactor UI logic to use user profile entity.

#### 4. Testing
- [ ] Add tests for user profile RLS and CRUD operations.
  - Prompt: Add pgTAP tests for user profile RLS and CRUD.
- [ ] Add tests for profile-bound data access (categories, tags, bank accounts).
  - Prompt: Add pgTAP tests for profile-bound data access.

#### 5. Migration & Data Integrity
- [ ] Migrate existing user-bound data to reference the new user profile entity.
  - Prompt: Write a migration to convert existing user-bound records to reference user profiles.

---

## (Optional) User-specified Currency

### Motivation
Allow users to select their preferred currency for transactions and display it throughout the UI.

#### 1. Database & Backend
- [ ] Add a `currency` field to the `user_profiles` table (e.g., currency text NOT NULL DEFAULT 'GBP').
  - Prompt: Create a migration to add a currency field to user_profiles.
- [ ] Optionally, add a currency field to transactions for multi-currency support.
  - Prompt: Create a migration to add a currency field to transactions if needed.
- [ ] Add seed data for currency for test users.
  - Prompt: Add seed SQL to set currency for test user profiles.

#### 2. API & Data Provider
- [ ] Add logic to get/set the user's currency in the data provider.
  - Prompt: Add CRUD functions for currency in user profiles to the data provider.
- [ ] Ensure all transaction and dashboard queries include/display the correct currency.
  - Prompt: Refactor data provider logic to use the user's currency setting.

#### 3. UI
- [ ] Add a currency dropdown/select to the profile page/modal.
  - Prompt: Scaffold a UI for selecting currency in the user profile.
- [ ] Refactor all amount displays to use the user's currency (e.g., Intl.NumberFormat).
  - Prompt: Refactor UI logic to display amounts using the selected currency.

#### 4. Testing
- [ ] Add tests to verify currency is stored, retrieved, and displayed correctly.
  - Prompt: Add pgTAP and UI tests for currency selection and display.

#### 5. Migration & Data Integrity
- [ ] Migrate existing data to set a default currency for all users.
  - Prompt: Write a migration to set currency for existing user profiles and transactions.

---

Each step above can be assigned as a prompt to a coding agent for implementation

