-- Real access control.
--
-- Login is thirdweb, not Supabase auth. The `thirdweb-session` Edge Function verifies a thirdweb token with
-- thirdweb, upserts the user, and mints a short-lived Supabase JWT (role=authenticated, sub=users.id).
-- Policies below key off auth.uid(), so the database now knows who is calling. This replaces the permissive
-- "allow everything" development policies.

-- Profile ids owned by the caller. SECURITY DEFINER so policies can use it without recursing into profiles RLS.
CREATE OR REPLACE FUNCTION public.my_profile_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM profiles WHERE user_id = auth.uid() $$;

REVOKE ALL ON FUNCTION public.my_profile_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_profile_ids() TO anon, authenticated;

-- ---------------------------------------------------------------- users
DROP POLICY IF EXISTS "Allow all users operations" ON users;

-- Rows are readable (needed to find who to pay) but email stays private through column privileges.
-- Users are created by the Edge Function (service role); the client can only edit its own display fields.
REVOKE ALL ON users FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, wallet_address, created_at, updated_at) ON users TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, updated_at) ON users TO authenticated;

CREATE POLICY "users: readable" ON users FOR SELECT USING (true);
CREATE POLICY "users: update own" ON users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------- transactions
DROP POLICY IF EXISTS "Allow all transactions operations" ON transactions;

REVOKE ALL ON transactions FROM anon, authenticated;
GRANT SELECT, INSERT ON transactions TO authenticated;
GRANT UPDATE (status, transaction_hash, thirdweb_transaction_id, confirmed_at, updated_at) ON transactions TO authenticated;

CREATE POLICY "transactions: parties can read" ON transactions FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "transactions: sender can create" ON transactions FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "transactions: sender can update" ON transactions FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid()) WITH CHECK (from_user_id = auth.uid());

-- ---------------------------------------------------------------- social
DROP POLICY IF EXISTS "dev: all profiles" ON profiles;
DROP POLICY IF EXISTS "dev: all posts" ON posts;
DROP POLICY IF EXISTS "dev: all reactions" ON reactions;
DROP POLICY IF EXISTS "dev: all bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "dev: all follows" ON follows;

REVOKE ALL ON profiles, posts, reactions, bookmarks, follows FROM anon, authenticated;
GRANT SELECT ON profiles, posts, reactions, follows TO anon, authenticated;
GRANT SELECT ON bookmarks TO authenticated; -- bookmarks are private

-- Column-level grants keep users from setting server-owned fields (verified, is_demo, follower_baseline,
-- reaction_baseline, counts, is_live) on their own rows.
GRANT INSERT (handle, name, avatar_url, banner_url, bio, category, user_id) ON profiles TO authenticated;
GRANT UPDATE (name, avatar_url, banner_url, bio, category) ON profiles TO authenticated;
GRANT INSERT (author_id, title, body, media) ON posts TO authenticated;
GRANT UPDATE (title, body) ON posts TO authenticated;
GRANT DELETE ON posts TO authenticated;
GRANT INSERT (post_id, profile_id, kind), UPDATE (kind), DELETE ON reactions TO authenticated;
GRANT INSERT (post_id, profile_id), DELETE ON bookmarks TO authenticated;
GRANT INSERT (follower_id, followee_id), DELETE ON follows TO authenticated;

CREATE POLICY "profiles: readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles: create own" ON profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles: update own" ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "posts: readable" ON posts FOR SELECT USING (true);
CREATE POLICY "posts: create as own profile" ON posts FOR INSERT TO authenticated
  WITH CHECK (author_id IN (SELECT my_profile_ids()));
CREATE POLICY "posts: update own" ON posts FOR UPDATE TO authenticated
  USING (author_id IN (SELECT my_profile_ids())) WITH CHECK (author_id IN (SELECT my_profile_ids()));
CREATE POLICY "posts: delete own" ON posts FOR DELETE TO authenticated
  USING (author_id IN (SELECT my_profile_ids()));

CREATE POLICY "reactions: readable" ON reactions FOR SELECT USING (true);
CREATE POLICY "reactions: write own" ON reactions FOR ALL TO authenticated
  USING (profile_id IN (SELECT my_profile_ids())) WITH CHECK (profile_id IN (SELECT my_profile_ids()));

CREATE POLICY "bookmarks: own only" ON bookmarks FOR ALL TO authenticated
  USING (profile_id IN (SELECT my_profile_ids())) WITH CHECK (profile_id IN (SELECT my_profile_ids()));

CREATE POLICY "follows: readable" ON follows FOR SELECT USING (true);
CREATE POLICY "follows: write own" ON follows FOR ALL TO authenticated
  USING (follower_id IN (SELECT my_profile_ids())) WITH CHECK (follower_id IN (SELECT my_profile_ids()));
