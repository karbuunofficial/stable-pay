-- Sample creators and posts (demo content). Idempotent: safe to run more than once.
-- Generated from the original src/data/mock.ts; edit freely.

INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('kaydence', 'Kaydence', 'https://i.pravatar.cc/150?img=47', 'https://picsum.photos/seed/kaydence-banner/1200/400', 'Hip-Hop, Rap & R&B creator. Live most weeknights — pull up, vibe, and support the culture.', 'Hip-Hop, Rap & R&B', true, TRUE, 128400)
ON CONFLICT (handle) DO NOTHING;
INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('courtvision', 'Court Vision', 'https://i.pravatar.cc/150?img=12', 'https://picsum.photos/seed/court-banner/1200/400', 'Hoops talk, watch parties and hot takes.', 'Sports', true, TRUE, 64200)
ON CONFLICT (handle) DO NOTHING;
INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('bpmbishop', 'BPM Bishop', 'https://i.pravatar.cc/150?img=33', 'https://picsum.photos/seed/bpm-banner/1200/400', 'Producer. MPC loyalist. Send loops.', 'Beats & Production', true, TRUE, 52100)
ON CONFLICT (handle) DO NOTHING;
INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('southsidecast', 'Southside Cast', 'https://i.pravatar.cc/150?img=59', 'https://picsum.photos/seed/south-banner/1200/400', 'Weekly conversations with indie label owners and artists.', 'Podcasts', true, TRUE, 31800)
ON CONFLICT (handle) DO NOTHING;
INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('lowendlexi', 'Low End Lexi', 'https://i.pravatar.cc/150?img=5', 'https://picsum.photos/seed/lexi-banner/1200/400', 'Digging crates so you don''t have to.', 'Music Discovery', false, TRUE, 12900)
ON CONFLICT (handle) DO NOTHING;
INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('chainrhymes', 'Chain Rhymes', 'https://i.pravatar.cc/150?img=68', 'https://picsum.photos/seed/chain-banner/1200/400', 'Bars about blocks.', 'Crypto & Web3', false, TRUE, 8700)
ON CONFLICT (handle) DO NOTHING;
INSERT INTO profiles (handle, name, avatar_url, banner_url, bio, category, verified, is_demo, follower_baseline)
VALUES ('solesmith', 'Sole Smith', 'https://i.pravatar.cc/150?img=15', 'https://picsum.photos/seed/sole-banner/1200/400', 'Restorations, customs and release-day chaos.', 'Streetwear & Sneakers', false, TRUE, 22300)
ON CONFLICT (handle) DO NOTHING;

INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p1', id, 'Studio Session: building the hook from scratch', 'Writing the hook live tonight. Pull up and vote on the second verse 🎤', '{"kind":"image","src":"https://picsum.photos/seed/studio-red/800/450"}'::jsonb, true, '{"fire":812,"heart":240,"headphones":90}'::jsonb, 133, 61, NOW() - INTERVAL '4 minutes'
FROM profiles WHERE handle = 'kaydence'
ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p2', id, NULL, 'Chopped a 1974 soul sample into this. 90 BPM, dusty drums. Thoughts?', '{"kind":"audio","src":"https://picsum.photos/seed/window-grid/200/200","title":"Sunday Chop (demo)"}'::jsonb, false, '{"fire":431,"heart":120,"headphones":388}'::jsonb, 74, 40, NOW() - INTERVAL '22 minutes'
FROM profiles WHERE handle = 'bpmbishop'
ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p3', id, NULL, 'Full restoration on these ''96 runners. Swipe through the before and after next week.', '{"kind":"image","src":"https://picsum.photos/seed/sneakers-rest/800/450"}'::jsonb, false, '{"fire":1204,"heart":530,"headphones":12}'::jsonb, 210, 88, NOW() - INTERVAL '1 hours'
FROM profiles WHERE handle = 'solesmith'
ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p4', id, NULL, 'That fourth-quarter run was the best basketball we''ve seen all season. Watch party recap is up.', '{"kind":"video","src":"https://picsum.photos/seed/court-night/800/450"}'::jsonb, false, '{"fire":640,"heart":98,"headphones":30}'::jsonb, 156, 72, NOW() - INTERVAL '2 hours'
FROM profiles WHERE handle = 'courtvision'
ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p5', id, NULL, 'New episode: three indie label owners on surviving the algorithm. Link in bio.', NULL, false, '{"fire":210,"heart":140,"headphones":220}'::jsonb, 41, 19, NOW() - INTERVAL '3 hours'
FROM profiles WHERE handle = 'southsidecast'
ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p6', id, NULL, 'Five underground records you slept on this month. Thread 🧵', NULL, false, '{"fire":330,"heart":210,"headphones":410}'::jsonb, 64, 51, NOW() - INTERVAL '5 hours'
FROM profiles WHERE handle = 'lowendlexi'
ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, author_id, title, body, media, is_live, reaction_baseline, comments_count, reposts_count, created_at)
SELECT 'p7', id, NULL, 'Dropping a verse every time someone tips this week. Keep me honest.', '{"kind":"image","src":"https://picsum.photos/seed/neon-city/800/450"}'::jsonb, false, '{"fire":190,"heart":60,"headphones":40}'::jsonb, 22, 8, NOW() - INTERVAL '8 hours'
FROM profiles WHERE handle = 'chainrhymes'
ON CONFLICT (id) DO NOTHING;

