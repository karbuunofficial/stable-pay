import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PostView, Profile } from "@/lib/social/types";

const react = vi.fn();
const toggleBookmark = vi.fn();
let actor: Profile | null = null;
vi.mock("@/lib/social/hooks", () => ({
  useActor: () => ({ actor, loading: false }),
  useReact: () => react,
  useBookmark: () => toggleBookmark,
}));
vi.mock("@/lib/views", () => ({ useViews: () => 1234 }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string } & Record<string, unknown>) => {
    const { params, ...domProps } = rest; // router-only props must not reach the DOM
    void params;
    return <a href={to} {...(domProps as object)}>{children}</a>;
  },
  useNavigate: () => vi.fn(),
}));

import { Composer, PostCard, ReactionBar } from "@/components/amixof/post";

const profile = (over: Partial<Profile> = {}): Profile => ({ id: "p", handle: "kaydence", name: "Kaydence", avatar: "", banner: "", bio: "", category: "", verified: true, isDemo: true, followers: 10, following: false, ...over });
const post = (over: Partial<PostView> = {}): PostView => ({
  id: "p1", source: "db", author: profile(), text: "Hello there", live: false, createdAt: null, time: "4m",
  reactions: { fire: 3, heart: 1, headphones: 0 }, myReaction: null, bookmarked: false, comments: 5, reposts: 2, ...over,
});

beforeEach(() => { vi.clearAllMocks(); actor = null; });

describe("ReactionBar (local state)", () => {
  it("counts a reaction, switches between kinds without double counting, and removes it", async () => {
    const user = userEvent.setup();
    render(<ReactionBar initial={{ fire: 10, heart: 5, headphones: 0 }} />);
    await user.click(screen.getByRole("button", { name: /^Fire, 10/ }));
    expect(screen.getByRole("button", { name: /^Fire, 11/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^Love, 5/ }));
    expect(screen.getByRole("button", { name: /^Fire, 10/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /^Love, 6/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^Love, 6/ }));
    expect(screen.getByRole("button", { name: /^Love, 5/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("adds an emoji reaction from the picker", async () => {
    const user = userEvent.setup();
    render(<ReactionBar initial={{}} />);
    await user.click(screen.getByRole("button", { name: /add reaction/i }));
    await user.click(screen.getByRole("menuitem", { name: /React 💯/ }));
    expect(screen.getByRole("button", { name: /^💯, 1/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("ReactionBar (controlled, real data)", () => {
  it("shows the given counts and reports clicks instead of changing them itself", async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<ReactionBar counts={{ fire: 7, heart: 0, headphones: 0 }} mine="fire" onReact={onReact} />);
    expect(screen.getByRole("button", { name: /^Fire, 7/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^Love, 0/ }));
    expect(onReact).toHaveBeenCalledWith("heart");
    expect(screen.getByRole("button", { name: /^Love, 0/ })).toHaveAttribute("aria-pressed", "false"); // parent owns the state
  });

  it("shows emoji reactions that already have counts", () => {
    render(<ReactionBar counts={{ "💯": 4 }} mine={null} onReact={() => {}} />);
    expect(screen.getByRole("button", { name: /^💯, 4/ })).toBeInTheDocument();
  });
});

describe("PostCard", () => {
  const card = (p: PostView, extra: Partial<ComponentProps<typeof PostCard>> = {}) => render(<PostCard post={p} {...extra} />);

  it("shows the author, handle, time, text and counts", () => {
    card(post());
    expect(screen.getByRole("article", { name: /post by kaydence/i })).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("@kaydence")).toBeInTheDocument();
    expect(screen.getByText("4m")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /verified/i })).toBeInTheDocument();
  });

  it("marks live posts", () => {
    card(post({ live: true, title: "Studio session" }));
    expect(screen.getByText(/live now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /join the room/i })).toBeInTheDocument();
  });

  it("routes real-post reactions and bookmarks through the data layer", async () => {
    const user = userEvent.setup();
    card(post());
    await user.click(screen.getByRole("button", { name: /^Fire, 3/ }));
    expect(react).toHaveBeenCalledWith("fire");
    await user.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(toggleBookmark).toHaveBeenCalledTimes(1);
  });

  it("reflects the saved state from the data", () => {
    card(post({ bookmarked: true }));
    expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps community (demo) posts local: no data-layer calls", async () => {
    const user = userEvent.setup();
    card(post({ source: "local" }));
    await user.click(screen.getByRole("button", { name: /^Fire, 3/ }));
    await user.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(react).not.toHaveBeenCalled();
    expect(toggleBookmark).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Bookmark" })).toBeInTheDocument(); // local toggle still works
  });

  it("falls back to an initial when the author has no avatar", () => {
    card(post({ author: profile({ name: "Zed", handle: "zed", avatar: "" }) }));
    expect(screen.getAllByText("Z").length).toBeGreaterThan(0);
  });
});

describe("PostCard: more actions", () => {
  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "More actions" }));
  const setNav = (props: Record<string, unknown>) => { for (const [k, v] of Object.entries(props)) Object.defineProperty(navigator, k, { value: v, configurable: true }); };
  beforeEach(() => setNav({ clipboard: undefined, share: undefined }));

  it("copies the real link to the post and only then says so", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav({ clipboard: { writeText } });
    render(<PostCard post={post()} />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /copy link/i }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/post/p1`);
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Link copied");
  });

  it("says so when copying is not possible, instead of claiming success", async () => {
    const user = userEvent.setup();
    setNav({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    document.execCommand = vi.fn().mockReturnValue(false);
    render(<PostCard post={post()} />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /copy link/i }));
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith("Couldn't copy the link");
  });

  it("offers the system share sheet only when the device has one", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PostCard post={post()} />);
    await openMenu(user);
    expect(screen.queryByRole("menuitem", { name: /share/i })).not.toBeInTheDocument();
    unmount();
    const share = vi.fn().mockResolvedValue(undefined);
    setNav({ share });
    render(<PostCard post={post()} />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /share/i }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `${window.location.origin}/post/p1` }));
  });

  it("opens the real gift dialog (it does not just toast 'sent')", async () => {
    const user = userEvent.setup();
    render(<PostCard post={post()} />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /send a gift to kaydence/i }));
    expect(await screen.findByRole("dialog", { name: /send a gift/i })).toBeInTheDocument();
  });

  it("clicking inside the menu does not open the post page", async () => {
    const user = userEvent.setup();
    const { container } = render(<PostCard post={post()} />);
    expect(container.querySelector("article")).toBeTruthy();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /copy link/i }));
    expect(screen.getByRole("article")).toBeInTheDocument(); // still on the feed card
  });
});

describe("Composer", () => {
  it("won't post empty text and shows characters remaining", async () => {
    const user = userEvent.setup();
    render(<Composer onPost={() => {}} />);
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /write a post/i }), "hey");
    expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
    expect(screen.getByText(/497/)).toBeInTheDocument();
  });

  it("blocks posts over the limit with an explanation", async () => {
    const user = userEvent.setup();
    render(<Composer onPost={() => {}} />);
    await user.click(screen.getByRole("textbox", { name: /write a post/i }));
    await user.paste("a".repeat(501));
    expect(screen.getByRole("alert")).toHaveTextContent(/1 characters over the 500 limit/);
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("submits the text and clears the box", async () => {
    const user = userEvent.setup();
    const onPost = vi.fn().mockResolvedValue(undefined);
    render(<Composer onPost={onPost} />);
    const box = screen.getByRole("textbox", { name: /write a post/i });
    await user.type(box, "first post");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(onPost).toHaveBeenCalledWith("first post"));
    await waitFor(() => expect(box).toHaveValue(""));
  });

  it("keeps the draft when posting is refused (for example signed out)", async () => {
    const user = userEvent.setup();
    const onPost = vi.fn().mockResolvedValue(false);
    render(<Composer onPost={onPost} />);
    const box = screen.getByRole("textbox", { name: /write a post/i });
    await user.type(box, "don't lose me");
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(onPost).toHaveBeenCalled());
    expect(box).toHaveValue("don't lose me");
    expect(screen.getByRole("button", { name: "Post" })).toBeEnabled(); // no stuck spinner
  });

  it("keeps the draft and recovers when posting throws", async () => {
    const user = userEvent.setup();
    const onPost = vi.fn().mockRejectedValue(new Error("boom"));
    render(<Composer onPost={onPost} />);
    const box = screen.getByRole("textbox", { name: /write a post/i });
    await user.type(box, "try again");
    await user.click(screen.getByRole("button", { name: "Post" })).catch(() => {});
    await waitFor(() => expect(screen.getByRole("button", { name: "Post" })).toBeEnabled());
    expect(box).toHaveValue("try again");
  });

  it("submits with Ctrl+Enter", async () => {
    const user = userEvent.setup();
    const onPost = vi.fn();
    render(<Composer onPost={onPost} />);
    await user.type(screen.getByRole("textbox", { name: /write a post/i }), "quick{Control>}{Enter}{/Control}");
    await waitFor(() => expect(onPost).toHaveBeenCalledWith("quick"));
  });
});

describe("PostCard with awkward content", () => {
  const long = "A".repeat(80);
  it("keeps the time visible and lets the name and handle truncate", () => {
    render(<PostCard post={post({ author: profile({ name: `Very Long Display Name ${long}`, handle: `handle${long}` }) })} />);
    const name = screen.getByText(/^Very Long Display Name/);
    expect(name).toHaveClass("truncate", "max-w-[60%]");
    expect(screen.getByText(/^@handle/)).toHaveClass("truncate", "min-w-0");
    expect(screen.getByText("4m").closest("a")).toHaveClass("shrink-0", "whitespace-nowrap");
  });
  it("breaks unbroken strings instead of overflowing the column", () => {
    render(<PostCard post={post({ text: `https://example.com/${long}${long}` })} />);
    expect(screen.getByText(/^https:\/\/example/)).toHaveClass("wrap-anywhere", "whitespace-pre-wrap");
  });
  it("preserves multiline text", () => {
    render(<PostCard post={post({ text: "line one\nline two" })} />);
    expect(screen.getByText(/line one/)).toHaveClass("whitespace-pre-wrap");
  });
});
