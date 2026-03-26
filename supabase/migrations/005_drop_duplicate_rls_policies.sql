-- Drop duplicate RLS policies that may have been created by multiple migration runs
-- The ALL policies (e.g. "Users manage own contacts") handle all operations correctly

DROP POLICY IF EXISTS "Users can manage own approval items" ON approval_queue;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
