-- Social layer: profiles, posts, reactions, bookmarks, follows.
-- NOTE: like the payments tables, RLS is permissive for development. Writes are not tied to a Supabase
-- auth user (login is thirdweb), so before production either bridge thirdweb JWTs into Supabase auth and
-- scope these policies to auth.uid(), or move writes behind an API that verifies the thirdweb session.

CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL CHECK (handle ~ '^[a-z0-9_]{2,30}$'),
  name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  -- seeded sample creators: not backed by a StablePay user
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  -- starting follower count for seeded creators; real follows are added on top
  follower_baseline INTEGER NOT NULL DEFAULT 0,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  media JSONB,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  -- starting reaction counts for seeded posts, e.g. {"fire": 812}; real reactions are added on top
  reaction_baseline JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- one reaction per person per post (switching kind replaces it)
CREATE TABLE reactions (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (char_length(kind) BETWEEN 1 AND 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE TABLE bookmarks (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev: all profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev: all posts" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev: all reactions" ON reactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev: all bookmarks" ON bookmarks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev: all follows" ON follows FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id, created_at DESC);
CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_bookmarks_profile ON bookmarks(profile_id, created_at DESC);
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- the API roles need table privileges on top of RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, posts, reactions, bookmarks, follows TO anon, authenticated;
