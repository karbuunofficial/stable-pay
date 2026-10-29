export const img = (seed: string, w = 800, h = 450) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
export const avatar = (n: number) => `https://i.pravatar.cc/150?img=${n}`;

export type Creator = {
  handle: string;
  name: string;
  category: string;
  avatar: string;
  verified: boolean;
  live: boolean;
  viewers: number;
  followers: number;
  bio: string;
  banner: string;
};

export const creators: Creator[] = [
  { handle: "kaydence", name: "Kaydence", category: "Hip-Hop, Rap & R&B", avatar: avatar(47), verified: true, live: true, viewers: 4100, followers: 128400, bio: "Hip-Hop, Rap & R&B creator. Live most weeknights — pull up, vibe, and support the culture.", banner: img("kaydence-banner", 1200, 400) },
  { handle: "courtvision", name: "Court Vision", category: "Sports", avatar: avatar(12), verified: true, live: true, viewers: 2400, followers: 64200, bio: "Hoops talk, watch parties and hot takes.", banner: img("court-banner", 1200, 400) },
  { handle: "bpmbishop", name: "BPM Bishop", category: "Beats & Production", avatar: avatar(33), verified: true, live: true, viewers: 1800, followers: 52100, bio: "Producer. MPC loyalist. Send loops.", banner: img("bpm-banner", 1200, 400) },
  { handle: "southsidecast", name: "Southside Cast", category: "Podcasts", avatar: avatar(59), verified: true, live: true, viewers: 962, followers: 31800, bio: "Weekly conversations with indie label owners and artists.", banner: img("south-banner", 1200, 400) },
  { handle: "lowendlexi", name: "Low End Lexi", category: "Music Discovery", avatar: avatar(5), verified: false, live: true, viewers: 540, followers: 12900, bio: "Digging crates so you don't have to.", banner: img("lexi-banner", 1200, 400) },
  { handle: "chainrhymes", name: "Chain Rhymes", category: "Crypto & Web3", avatar: avatar(68), verified: false, live: true, viewers: 310, followers: 8700, bio: "Bars about blocks.", banner: img("chain-banner", 1200, 400) },
  { handle: "solesmith", name: "Sole Smith", category: "Streetwear & Sneakers", avatar: avatar(15), verified: false, live: false, viewers: 0, followers: 22300, bio: "Restorations, customs and release-day chaos.", banner: img("sole-banner", 1200, 400) },
];

export const me = { handle: "you", name: "Jordan Reyes", avatar: avatar(32) };

export const getCreator = (h: string) => creators.find((c) => c.handle === h);

export type Post = {
  id: string;
  author: string;
  time: string;
  text: string;
  title?: string;
  live?: boolean;
  media?: { kind: "image" | "video" | "audio"; src: string; title?: string };
  reactions: { fire: number; heart: number; headphones: number };
  comments: number;
  reposts: number;
  community?: string;
};

export const posts: Post[] = [
  { id: "p1", author: "kaydence", time: "4m", live: true, title: "Studio Session: building the hook from scratch", text: "Writing the hook live tonight. Pull up and vote on the second verse 🎤", media: { kind: "image", src: img("studio-red") }, reactions: { fire: 812, heart: 240, headphones: 90 }, comments: 133, reposts: 61 },
  { id: "p2", author: "bpmbishop", time: "22m", text: "Chopped a 1974 soul sample into this. 90 BPM, dusty drums. Thoughts?", media: { kind: "audio", src: img("window-grid", 200, 200), title: "Sunday Chop (demo)" }, reactions: { fire: 431, heart: 120, headphones: 388 }, comments: 74, reposts: 40 },
  { id: "p3", author: "solesmith", time: "1h", text: "Full restoration on these '96 runners. Swipe through the before and after next week.", media: { kind: "image", src: img("sneakers-rest") }, reactions: { fire: 1204, heart: 530, headphones: 12 }, comments: 210, reposts: 88 },
  { id: "p4", author: "courtvision", time: "2h", text: "That fourth-quarter run was the best basketball we've seen all season. Watch party recap is up.", media: { kind: "video", src: img("court-night") }, reactions: { fire: 640, heart: 98, headphones: 30 }, comments: 156, reposts: 72 },
  { id: "p5", author: "southsidecast", time: "3h", text: "New episode: three indie label owners on surviving the algorithm. Link in bio.", reactions: { fire: 210, heart: 140, headphones: 220 }, comments: 41, reposts: 19 },
  { id: "p6", author: "lowendlexi", time: "5h", text: "Five underground records you slept on this month. Thread 🧵", reactions: { fire: 330, heart: 210, headphones: 410 }, comments: 64, reposts: 51 },
  { id: "p7", author: "chainrhymes", time: "8h", text: "Dropping a verse every time someone tips this week. Keep me honest.", media: { kind: "image", src: img("neon-city") }, reactions: { fire: 190, heart: 60, headphones: 40 }, comments: 22, reposts: 8 },
  { id: "c1", community: "atlhiphop", author: "kaydence", time: "35m", text: "Friday cypher lineup is set. Drop your city + bars in the chat tab 🎤", media: { kind: "image", src: img("atl-cypher") }, reactions: { fire: 260, heart: 88, headphones: 34 }, comments: 48, reposts: 12 },
];

/** Posts that live only inside a community (never shown in global feeds when the community is private). */
export const communityPosts: Post[] = [
  { id: "c2", community: "atlhiphop", author: "chainrhymes", time: "2h", text: "Reminder: credit your producers. Mods will remove uncredited beats.", reactions: { fire: 40, heart: 22, headphones: 5 }, comments: 9, reposts: 2 },
  { id: "c3", community: "beatmakers", author: "bpmbishop", time: "1h", text: "Beat review Thursday — upload a 60s snippet here, top 8 get on stage.", media: { kind: "audio", src: img("mpc-pads", 200, 200), title: "Snippet template" }, reactions: { fire: 120, heart: 40, headphones: 210 }, comments: 31, reposts: 0 },
  { id: "c4", community: "beatmakers", author: "lowendlexi", time: "4h", text: "Mix note: high-pass your samples before the drums hit. Instant clarity.", reactions: { fire: 80, heart: 30, headphones: 60 }, comments: 12, reposts: 0 },
  { id: "c5", community: "sneakerculture", author: "solesmith", time: "6h", text: "Customs giveaway thread opens Sunday.", reactions: { fire: 300, heart: 90, headphones: 2 }, comments: 70, reposts: 20 },
  { id: "c6", community: "labelroom", author: "southsidecast", time: "1d", text: "Distribution contract checklist pinned in About.", reactions: { fire: 20, heart: 15, headphones: 4 }, comments: 6, reposts: 0 },
];

export const getPost = (id: string) => posts.find((p) => p.id === id) ?? communityPosts.find((p) => p.id === id);

export const replies = [
  { author: "lowendlexi", time: "3m", text: "This hook is crazy 🔥" },
  { author: "chainrhymes", time: "2m", text: "Second verse needs more bounce" },
  { author: "courtvision", time: "1m", text: "First time here, this community is a vibe" },
];

export const streams = [
  { channel: "kaydence", title: "Studio Session: building the hook from scratch", thumb: img("studio-red"), tags: ["Songwriting", "English"], following: true, uptime: "1:36:00" },
  { channel: "courtvision", title: "Second-half watch party + hot takes", thumb: img("court-night"), tags: ["Basketball", "Talk"], following: false, uptime: "0:52:10" },
  { channel: "bpmbishop", title: "Flipping your samples live — send me loops", thumb: img("window-grid"), tags: ["MPC", "Soul"], following: true, uptime: "2:12:45" },
  { channel: "southsidecast", title: "Indie label owners: surviving the algorithm", thumb: img("misty-cliffs"), tags: ["Interview", "Business"], following: true, uptime: "0:41:02" },
  { channel: "lowendlexi", title: "Crate digging: 70s funk deep cuts", thumb: img("vinyl-crate"), tags: ["Vinyl", "Funk"], following: false, uptime: "1:05:33" },
  { channel: "chainrhymes", title: "Freestyle Friday — tip for a topic", thumb: img("neon-city"), tags: ["Freestyle", "Web3"], following: false, uptime: "0:18:20" },
];

export const categories = [
  "Hip-Hop, Rap & R&B", "Beats & Production", "Podcasts & Livestreams", "Pop Culture", "News & Media",
  "Streetwear & Sneakers", "Sports", "Gaming", "Crypto & Web3", "Business", "Film, TV & Comedy",
  "Art & Design", "Food, Travel & Lifestyle", "Local Scenes & Nightlife",
];

export const chatSeed = [
  { user: "Low End Lexi", text: "this hook is crazy 🔥", color: "text-live-text" },
  { user: "Sole Smith", text: "run that back!!", color: "text-chart-3" },
  { user: "Chain Rhymes", text: "@kaydence second verse needs more bounce", color: "text-brand" },
  { user: "BPM Bishop", text: "the 808s on this 😤", color: "text-success-text" },
  { user: "Court Vision", text: "first time here, this community is a vibe", color: "text-chart-2" },
  { user: "Southside Cast", text: "who produced the intro?", color: "text-brand" },
];

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  media: { kind: "image" | "video" | "audio"; src: string };
  body: string[];
};

export const articles: Article[] = [
  { slug: "the-sample-economy", title: "The sample economy: who gets paid when a loop goes viral", excerpt: "Clearing samples has never been more complicated — or more important for independent producers.", author: "bpmbishop", date: "Oct 27, 2026", readTime: "7 min", media: { kind: "image", src: img("sample-economy", 1200, 675) },
    body: ["When a 12-second loop pulled from a 1974 soul record racks up ten million plays, the question of who gets paid stops being academic.", "Independent producers sit in an awkward position. Labels have legal teams; bedroom producers have Discord servers. That gap shapes what gets made and what gets buried.", "We talked to three producers, a clearance specialist and a label A&R about how the money actually moves — and where it gets stuck.", "The short version: clear early, document everything, and treat every collaborator agreement like it'll matter in five years. Because it might."] },
  { slug: "live-rooms-are-the-new-venue", title: "Live rooms are the new venue", excerpt: "How streamers are building local scenes without a stage.", author: "kaydence", date: "Oct 24, 2026", readTime: "5 min", media: { kind: "video", src: img("live-venue", 1200, 675) },
    body: ["The venue used to be the scene. Now the scene is a chat window with four thousand people in it.", "Live rooms give artists something the timeline never could: real-time feedback, real-time money, and a room that remembers you.", "But a room still needs a host. The best streamers treat chat like a crowd — they read it, they work it, and they know when to let it breathe."] },
  { slug: "southside-sessions-ep-42", title: "Southside Sessions, Ep. 42: Owning your masters", excerpt: "A frank conversation on rights, leverage and the long game.", author: "southsidecast", date: "Oct 20, 2026", readTime: "48 min listen", media: { kind: "audio", src: img("podcast-mic", 1200, 675) },
    body: ["This week we sat down with two artists who bought back their masters and one who wishes she had.", "We cover the math, the negotiation and the emotional side of walking away from a deal that made you."] },
];

export const getArticle = (s: string) => articles.find((a) => a.slug === s);

export const conversations = [
  { id: "c1", with: "kaydence", last: "Pull up tonight, I want your take on the verse", time: "2m", unread: 2 },
  { id: "c2", with: "bpmbishop", last: "Sent you the stems", time: "1h", unread: 0 },
  { id: "c3", with: "solesmith", last: "Size 10 or 10.5?", time: "Yesterday", unread: 0 },
  { id: "c4", with: "southsidecast", last: "Want to come on the show next week?", time: "Mon", unread: 1 },
];

export const messageSeed: Record<string, { from: "me" | "them"; text: string; time: string }[]> = {
  c1: [
    { from: "them", text: "Yo! You caught the stream last night?", time: "9:12 PM" },
    { from: "me", text: "Caught the whole thing. That hook is a problem.", time: "9:14 PM" },
    { from: "them", text: "Pull up tonight, I want your take on the verse", time: "9:15 PM" },
  ],
  c2: [{ from: "them", text: "Sent you the stems", time: "4:02 PM" }],
  c3: [{ from: "them", text: "Size 10 or 10.5?", time: "Yesterday" }],
  c4: [{ from: "them", text: "Want to come on the show next week?", time: "Mon" }],
};

export const notifications = [
  { id: "n1", kind: "live", who: "kaydence", text: "went live: Studio Session: building the hook from scratch", time: "4m", mention: false },
  { id: "n2", kind: "tip", who: "chainrhymes", text: "tipped you $5.00", time: "18m", mention: false },
  { id: "n3", kind: "mention", who: "lowendlexi", text: "mentioned you: \"@you has the best ear on here\"", time: "1h", mention: true },
  { id: "n4", kind: "follow", who: "courtvision", text: "followed you", time: "2h", mention: false },
  { id: "n5", kind: "like", who: "bpmbishop", text: "reacted 🔥 to your post", time: "3h", mention: false },
  { id: "n6", kind: "gift", who: "solesmith", text: "sent you a Mic Drop gift", time: "Yesterday", mention: false },
  { id: "n7", kind: "mention", who: "southsidecast", text: "mentioned you in a reply", time: "Mon", mention: true },
];

export const trending = [
  { topic: "#SundayChop", posts: "12.4K posts", cat: "Beats & Production" },
  { topic: "Fourth-quarter run", posts: "8.1K posts", cat: "Sports" },
  { topic: "'96 runners", posts: "3.2K posts", cat: "Sneakers" },
  { topic: "Owning your masters", posts: "2.7K posts", cat: "Business" },
  { topic: "#FreestyleFriday", posts: "1.9K posts", cat: "Hip-Hop" },
];

export const dashboard = {
  stats: [
    { label: "Followers", value: "128.4K", delta: "+2.1%" },
    { label: "Avg. viewers", value: "3,240", delta: "+8.4%" },
    { label: "Hours streamed", value: "46h", delta: "this month" },
    { label: "Earnings", value: "$4,812", delta: "+12.0%" },
  ],
  weekly: [32, 45, 38, 60, 52, 74, 68],
  recent: [
    { title: "Studio Session: building the hook", date: "Today", peak: 4300, duration: "1:36", earned: 412 },
    { title: "Verse workshop with chat", date: "Oct 26", peak: 3100, duration: "2:05", earned: 288 },
    { title: "Late night R&B listening party", date: "Oct 24", peak: 2650, duration: "1:48", earned: 197 },
    { title: "Q&A + beat reactions", date: "Oct 21", peak: 2200, duration: "1:12", earned: 141 },
  ],
};

export const reports = [
  { id: "r1", target: "Post by @chainrhymes", reason: "Spam links", status: "Open", time: "12m" },
  { id: "r2", target: "Chat message in Court Vision", reason: "Harassment", status: "Open", time: "1h" },
  { id: "r3", target: "Profile @solesmith", reason: "Impersonation", status: "Resolved", time: "Yesterday" },
];

export const mediaLibrary = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, kind: "image" as const, name: `cover-${i + 1}.jpg`, src: img(`lib-${i}`, 400, 300), size: `${(1.2 + i * 0.3).toFixed(1)} MB` })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `v${i}`, kind: "video" as const, name: `clip-${i + 1}.mp4`, src: img(`vid-${i}`, 400, 300), size: `${24 + i * 9} MB` })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `a${i}`, kind: "audio" as const, name: `episode-${40 + i}.mp3`, src: img(`aud-${i}`, 400, 300), size: `${38 + i * 4} MB` })),
];

export const walletHistory = [
  { id: "w1", kind: "Tip received", who: "chainrhymes", amount: 5, time: "18m" },
  { id: "w2", kind: "Gift received", who: "solesmith", amount: 12, time: "Yesterday" },
  { id: "w3", kind: "Tip sent", who: "kaydence", amount: -10, time: "Oct 26" },
  { id: "w4", kind: "Payout", who: "Bank ••4821", amount: -250, time: "Oct 20" },
];

const gtv = (f: string) => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${f}.mp4`;
export const clips = [
  { id: "k1", author: "kaydence", caption: "The hook that broke chat last night 🎤 #StudioSession", sound: "Original sound · Kaydence", src: gtv("ForBiggerBlazes"), poster: img("clip-k1", 540, 960), likes: 18400, comments: 612, shares: 230 },
  { id: "k2", author: "bpmbishop", caption: "Flipping a 1974 soul sample in 60 seconds #SundayChop", sound: "Sunday Chop (demo)", src: gtv("ForBiggerEscapes"), poster: img("clip-k2", 540, 960), likes: 9200, comments: 301, shares: 144 },
  { id: "k3", author: "solesmith", caption: "'96 runners restoration — before ➜ after", sound: "Original sound · Sole Smith", src: gtv("ForBiggerFun"), poster: img("clip-k3", 540, 960), likes: 22100, comments: 840, shares: 512 },
  { id: "k4", author: "courtvision", caption: "That fourth-quarter run, but every angle 🏀", sound: "Watch party audio", src: gtv("ForBiggerJoyrides"), poster: img("clip-k4", 540, 960), likes: 13700, comments: 455, shares: 201 },
  { id: "k5", author: "lowendlexi", caption: "Crate find of the week. Guess the year.", sound: "Deep cut · 70s funk", src: gtv("ForBiggerMeltdowns"), poster: img("clip-k5", 540, 960), likes: 5400, comments: 190, shares: 66 },
];

export const clipComments: Record<string, { user: string; text: string; color: string }[]> = {
  k1: [{ user: "Low End Lexi", text: "replayed this 10 times 🔥", color: "text-live-text" }, { user: "Chain Rhymes", text: "that ad-lib at 0:12 😤", color: "text-brand" }],
  k2: [{ user: "Kaydence", text: "send me this beat RIGHT NOW", color: "text-chart-2" }, { user: "Sole Smith", text: "the dusty drums >>>", color: "text-chart-3" }],
  k3: [{ user: "Court Vision", text: "brand new. unreal.", color: "text-success-text" }, { user: "BPM Bishop", text: "what did you use on the midsole?", color: "text-brand" }],
  k4: [{ user: "Southside Cast", text: "the bench reaction 😂", color: "text-brand" }],
  k5: [{ user: "BPM Bishop", text: "1976. final answer.", color: "text-success-text" }, { user: "Kaydence", text: "sampling this tonight", color: "text-chart-2" }],
};
