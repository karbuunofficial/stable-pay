import { Link, useNavigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, Bookmark, Compass, Home, LayoutDashboard, Mail, Newspaper, PanelLeftClose, PanelLeftOpen,
  Radio, Search, Clapperboard, Settings, Shield, User, Users, Wallet, Moon, Sun, Send, Clock, UserSearch, Menu, LogOut, Check, ArrowLeft, type LucideIcon,
} from "lucide-react";
import { creators } from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import { useActor, useNotifications } from "@/lib/social/hooks";
import { unreadCount, useSeenAt } from "@/lib/unread";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";
import { formatCount } from "@/lib/composer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ShellCtx = { navCollapsed: boolean; setNavCollapsed: (v: boolean) => void; social: boolean };
const Ctx = createContext<ShellCtx>({ navCollapsed: false, setNavCollapsed: () => {}, social: false });
export const useShell = () => useContext(Ctx);

const SOCIAL = [/^\/$/, /^\/post\//, /^\/explore/, /^\/notifications/, /^\/bookmarks/, /^\/profile\//, /^\/communities/];

/**
 * One nav config feeds the side nav, mobile bar and the mobile "More" sheet,
 * so labels, order and active states can't drift apart.
 *  mobile -> shown in the bottom bar (< md); everything else lives under "More"
 */
export type NavItem = { to: LinkProps["to"]; label: string; icon: LucideIcon; mobile?: boolean };

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Menu",
    items: [
      { to: "/", label: "Home", icon: Home, mobile: true },
      { to: "/explore", label: "Explore", icon: Compass, mobile: true },
      { to: "/live", label: "Live", icon: Radio, mobile: true },
      { to: "/clips", label: "Clips", icon: Clapperboard },
      { to: "/communities", label: "Communities", icon: Users },
      { to: "/blog", label: "Blog", icon: Newspaper },
      { to: "/messages", label: "Messages", icon: Mail },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    ],
  },
  {
    label: "Payments",
    items: [
      { to: "/pay", label: "Pay", icon: Send, mobile: true },
      { to: "/wallet", label: "Wallet", icon: Wallet },
      { to: "/activity", label: "Activity", icon: Clock },
      { to: "/people", label: "Find people", icon: UserSearch },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/me", label: "Account", icon: User },
      { to: "/dashboard", label: "Creator dashboard", icon: LayoutDashboard },
      { to: "/admin", label: "Admin", icon: Shield },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
const allNav = navGroups.flatMap((g) => g.items);

/** TanStack sets aria-current="page" on the active link; "/" must match exactly. */
const isExact = (to: NavItem["to"]) => to === "/";

/** Width of the navigation column. The top bar's brand block uses the same slot so the two always line up. */
const NAV_SLOT = "w-[72px] xl:w-[244px]";
const NAV_SLOT_COLLAPSED = "w-[72px]";

/** Unread count for the signed-in actor; drives the bell, the sidebar item and the mobile "More" dot. */
function useUnread() {
  const { actor } = useActor();
  const q = useNotifications();
  return unreadCount(q.data ?? [], useSeenAt(actor?.id));
}

function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span aria-hidden className={cn("grid h-4 min-w-4 place-items-center rounded-full bg-live px-1 text-nano font-bold text-live-foreground", className)}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Active marker that doesn't rely on colour: a bar on the leading edge (sidebar) or top edge (mobile bar). */
const activeBar = "pointer-events-none absolute rounded-full bg-brand";

/** `textClass` decides where the name shows next to the mark; the top bar hides it where the nav slot is only 72px wide. */
export function Wordmark({ textClass = "hidden sm:inline" }: { textClass?: string }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2 rounded-control">
      <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">A</span>
      <span aria-hidden className={cn("font-display text-lg font-bold tracking-tight", textClass)}>AMIXOF</span>
      <span className="sr-only">AMIXOF home</span>
    </Link>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { setTheme(currentTheme()); }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      shape="pill"
      aria-label={`Switch to ${next} theme`}
      onClick={() => { applyTheme(next); setTheme(next); }}
      className="text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

function NotificationsLink() {
  const unread = useUnread();
  return (
    <Button asChild variant="ghost" size="icon" shape="pill" className="relative text-muted-foreground hover:text-foreground">
      <Link to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} activeProps={{ className: "!bg-brand-subtle !text-brand" }}>
        <Bell className="size-5" />
        <UnreadBadge count={unread} className="absolute -right-0.5 -top-0.5 ring-2 ring-background" />
      </Link>
    </Button>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>("dark");
  if (!user) return null;
  const name = user.display_name || user.username || "Account";
  const next = theme === "dark" ? "light" : "dark";
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) setTheme(currentTheme()); }}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Account menu" className="ml-1 shrink-0 cursor-pointer rounded-full">
          <ProfileAvatar src={user.avatar_url} name={name} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {user.username && <span className="block truncate type-caption">@{user.username}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {([["/me", "Account", User], ["/wallet", "Wallet", Wallet], ["/activity", "Activity", Clock], ["/settings", "Settings", Settings]] as const).map(([to, label, Icon]) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to}><Icon className="size-4" />{label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { applyTheme(next); setTheme(next); }}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}Switch to {next} theme
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { logout(); navigate({ to: "/" }); }}>
          <LogOut className="size-4" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { navCollapsed, social } = useShell();
  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/85 backdrop-blur">
      {/* Same max width as the body below, so brand / search / actions line up with sidebar, feed and rail. */}
      <div className={cn("mx-auto flex h-full items-center gap-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3", social ? "max-w-[1264px]" : "max-w-[1600px]")}>
        <div className={cn("flex shrink-0 items-center md:justify-center xl:justify-start xl:pl-6 transition-[width] duration-200 motion-reduce:transition-none md:-ml-3", navCollapsed && !social ? NAV_SLOT_COLLAPSED : NAV_SLOT, "max-md:!w-auto")}>
          <Wordmark textClass={cn("hidden sm:inline md:hidden", !navCollapsed || social ? "xl:inline" : "")} />
        </div>
        <form
          role="search"
          className="w-full max-w-md min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            navigate({ to: "/explore", search: q ? { q } : {} });
          }}
        >
          <label className="flex h-control-md items-center gap-2 rounded-full border bg-surface-2 px-3 type-ui field-shell">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input name="q" type="search" aria-label="Search" placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-hidden placeholder:text-muted-foreground" />
          </label>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationsLink />
          {user ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden md:inline-flex"><Link to="/pay" activeProps={{ className: "!border-brand !text-brand" }}><Send />Pay</Link></Button>
              <AccountMenu />
            </>
          ) : (
            <>
              <span className="max-[400px]:hidden"><ThemeToggle /></span>
              <Button asChild size="sm" className="ml-1 shrink-0"><Link to="/me">Sign in</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SideNav() {
  const { navCollapsed, setNavCollapsed, social } = useShell();
  const unread = useUnread();
  const full = !navCollapsed;
  const followed = creators.slice(0, 4);
  const recommended = creators.slice(4);
  return (
    // The slot keeps its width on social pages (collapsing only narrows the visible rail) so the feed never jumps.
    <div className={cn("hidden shrink-0 transition-[width] duration-200 motion-reduce:transition-none md:block", social ? NAV_SLOT : full ? NAV_SLOT : NAV_SLOT_COLLAPSED)}>
      <aside
        aria-label="Main menu"
        className={cn(
          "sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto border-r scrollbar-none",
          full ? "w-[72px] xl:w-[244px]" : "w-[72px]",
        )}
      >
        <div className="flex flex-col gap-0.5 p-3">
          {/* Same row height in both states so the items below never move when toggling. */}
          <div className={cn("mb-1 hidden h-control-md items-center xl:flex", full ? "justify-end" : "justify-center")}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={full ? "Collapse menu" : "Expand menu"}
              aria-expanded={full}
              onClick={() => setNavCollapsed(full)}
              className="text-muted-foreground hover:text-foreground"
            >
              {full ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
            </Button>
          </div>
          {navGroups.map((group, gi) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {gi > 0 && <div className="my-2 border-t" />}
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = item.to === "/notifications" ? unread : 0;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    activeOptions={{ exact: isExact(item.to) }}
                    className={cn("relative flex h-control-lg items-center justify-center gap-3 rounded-control text-body text-foreground/90 hover:bg-surface-hover active:bg-surface-active", full && "xl:justify-start xl:px-3")}
                    activeProps={{ className: "bg-brand-subtle font-semibold !text-brand" }}
                    title={item.label}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span aria-hidden className={cn(activeBar, "-left-3 inset-y-2 w-[3px]")} />}
                        <span className="relative grid shrink-0 place-items-center">
                          <Icon className="size-5" />
                          <UnreadBadge count={badge} className={cn("absolute -right-2 -top-2 ring-2 ring-background", full && "xl:hidden")} />
                        </span>
                        {/* the name comes from the text itself (no aria-label), so it always contains what sighted users read */}
                        <span className={cn("min-w-0 flex-1 truncate", full ? "sr-only xl:not-sr-only" : "sr-only")}>{item.label}</span>
                        {badge > 0 && <span className="sr-only">, {badge} unread</span>}
                        <UnreadBadge count={badge} className={cn("hidden", full && "xl:grid")} />
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className={cn("hidden border-t p-3", full && "xl:block")}>
          <ChannelList title="FOLLOWED CHANNELS" list={followed.concat(creators.slice(6, 7))} />
          <ChannelList title="RECOMMENDED" list={recommended.slice(0, 2)} />
        </div>
      </aside>
    </div>
  );
}

function ChannelList({ title, list }: { title: string; list: typeof creators }) {
  return (
    <div className="mb-3">
      <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-muted-foreground">{title}</p>
      {list.map((c) => (
        <Link key={c.handle} to="/live/$channel" params={{ channel: c.handle }} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-3 py-1.5 hover:bg-surface-hover active:bg-surface-active">
          <ProfileAvatar src={c.avatar} name={c.name} size="sm" className={cn(!c.live && "grayscale")} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{c.name}</span>
            <span className="block truncate type-caption">{c.category}</span>
          </span>
          {c.live ? (
            <span className="flex items-center gap-1 text-xs"><span className="h-2 w-2 rounded-full bg-live" />{formatCount(c.viewers)}</span>
          ) : (
            <span className="type-caption">Offline</span>
          )}
        </Link>
      ))}
    </div>
  );
}

/**
 * True while an on-screen keyboard is covering part of the page and a text field has focus. The bottom bar steps
 * aside then (it would otherwise float above the keyboard and eat the little room left for the field).
 * visualViewport is the only signal browsers give for this; without it the bar simply stays.
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    // Height with no keyboard. Browsers either shrink the visual viewport only (iOS, older Chrome) or the layout
    // viewport too (interactive-widget=resizes-content), so compare against the last height seen with no field focused.
    let baseline = Math.max(window.innerHeight, vv.height);
    let width = window.innerWidth;
    const editable = () => !!document.activeElement?.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, [contenteditable=true]");
    const update = () => {
      if (window.innerWidth !== width) { width = window.innerWidth; baseline = Math.max(window.innerHeight, vv.height); } // rotated
      if (!editable()) baseline = Math.max(window.innerHeight, vv.height);
      setOpen(editable() && baseline - vv.height > 120);
    };
    vv.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => { vv.removeEventListener("resize", update); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); };
  }, []);
  return open;
}

function MobileNav() {
  const [more, setMore] = useState(false);
  const unread = useUnread();
  const keyboard = useKeyboardOpen();
  const items = allNav.filter((n) => n.mobile);
  const tab = "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 [@media(max-height:500px)]:min-h-12 text-nano font-medium text-muted-foreground active:bg-surface-hover";
  return (
    <>
      <nav aria-label="Mobile" data-keyboard={keyboard || undefined} className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] data-[keyboard]:hidden [@media(max-height:500px)]:h-[calc(3rem+env(safe-area-inset-bottom))] border-t bg-background/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur md:hidden">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.label} to={it.to} activeOptions={{ exact: isExact(it.to) }} className={tab} activeProps={{ className: "!text-brand font-semibold" }}>
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden className={cn(activeBar, "inset-x-4 top-0 h-[3px] rounded-t-none")} />}
                  <Icon className="size-5" />
                  {it.label}
                </>
              )}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more} aria-label={unread ? `More, ${unread} unread notifications` : "More"} className={cn(tab, more && "text-brand")}>
          <span className="relative">
            <Menu className="size-5" />
            {unread > 0 && <span aria-hidden className="absolute -right-1 -top-0.5 size-2 rounded-full bg-live ring-2 ring-background" />}
          </span>
          More
        </button>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">All pages in AMIXOF and StablePay</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {navGroups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="type-overline mb-1">{g.label}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    const badge = it.to === "/notifications" ? unread : 0;
                    return (
                      <Link
                        key={it.label}
                        to={it.to}
                        activeOptions={{ exact: isExact(it.to) }}
                        onClick={() => setMore(false)}
                        className="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border px-1 py-2 text-center text-xs font-medium hover:bg-surface-hover active:bg-surface-active"
                        activeProps={{ className: "border-brand bg-brand-subtle font-semibold !text-brand" }}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && <Check aria-hidden className="absolute right-1.5 top-1.5 size-3" />}
                            <span className="relative">
                              <Icon className="size-5" />
                              <UnreadBadge count={badge} className="absolute -right-3 -top-2 ring-2 ring-background" />
                            </span>
                            {it.label}
                            {badge > 0 && <span className="sr-only">, {badge} unread</span>}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [navCollapsed, setNavCollapsedState] = useState(() => {
    try { return localStorage.getItem("amixof-nav-collapsed") === "1"; } catch { return false; }
  });
  const setNavCollapsed = (v: boolean) => {
    setNavCollapsedState(v);
    try { localStorage.setItem("amixof-nav-collapsed", v ? "1" : "0"); } catch { /* storage unavailable */ }
  };
  const path = useRouterState({ select: (s) => s.location.pathname });
  const social = SOCIAL.some((r) => r.test(path));

  // SPA navigation doesn't move focus or announce anything on its own: after a route change, announce the
  // new page title and move focus to <main> so keyboard and screen-reader users start at the new content.
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      setAnnouncement(document.title);
      mainRef.current?.focus({ preventScroll: true });
    }, 150);
    return () => clearTimeout(t);
  }, [path]);

  return (
    <Ctx.Provider value={{ navCollapsed, setNavCollapsed, social }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <TopBar />
      <div className={cn("mx-auto flex", social ? "max-w-[1264px]" : "max-w-[1600px]")}>
        <SideNav />
        <main id="main" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] outline-none md:pb-0">{children}</main>
      </div>
      <MobileNav />
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
    </Ctx.Provider>
  );
}

/**
 * The discovery rail is hidden below lg (1024px). This strip carries its most useful part, who is live right now,
 * as a swipeable row above the feed on phones and tablets.
 */
export function LiveNowStrip({ className }: { className?: string }) {
  const live = creators.filter((c) => c.live);
  if (live.length === 0) return null;
  return (
    <section aria-label="Live now" className={cn("border-b", className)}>
      <ul className="flex snap-x gap-4 overflow-x-auto px-4 py-3 scrollbar-none">
        {live.map((c) => (
          <li key={c.handle} className="shrink-0 snap-start">
            <Link to="/live/$channel" params={{ channel: c.handle }} aria-label={`${c.name}, live, ${formatCount(c.viewers)} watching`} className="flex w-16 flex-col items-center gap-1">
              <ProfileAvatar src={c.avatar} name={c.name} size="lg" className="ring-2 ring-live ring-offset-2 ring-offset-background" />
              <span className="type-caption w-full truncate text-center">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** X-style: feed (≤600px) + discovery rail, contiguous with dividers. */
export function SocialLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)]">
      <div className="w-full min-w-0 max-w-[600px] border-r max-lg:mx-auto max-lg:border-l">{children}</div>
      <aside aria-label="Discover" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[340px] shrink-0 overflow-y-auto border-r p-4 scrollbar-none lg:block">
        {rail ?? <DiscoverRail />}
      </aside>
    </div>
  );
}

export function DiscoverRail({ hideTrending = false }: { hideTrending?: boolean }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="type-heading mb-2">Live now</h2>
        {creators.filter((c) => c.live).slice(0, 4).map((c) => (
          <Link key={c.handle} to="/live/$channel" params={{ channel: c.handle }} className="-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-hover active:bg-surface-active">
            <ProfileAvatar src={c.avatar} name={c.name} size="sm" className="ring-2 ring-live" />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{c.name}</span><span className="block truncate type-caption">{c.category}</span></span>
            <span className="type-caption">{formatCount(c.viewers)} watching</span>
          </Link>
        ))}
      </section>
      {!hideTrending && (
      <section className="border-t pt-4">
        <h2 className="type-heading mb-2">Trending</h2>
        {[["#SundayChop", "12.4K posts"], ["Fourth-quarter run", "8.1K posts"], ["'96 runners", "3.2K posts"]].map(([t, n]) => (
          <Link key={t} to="/explore" className="-mx-2 block rounded-md px-2 py-2 hover:bg-surface-hover active:bg-surface-active">
            <span className="block text-sm font-semibold">{t}</span>
            <span className="type-caption">{n}</span>
          </Link>
        ))}
      </section>
      )}
      <p className="border-t pt-4 type-caption">Demo content. Viewer counts and broadcasts are simulated.</p>
    </div>
  );
}

/** Back control for page headers: a link when the parent is known, history.back() otherwise. */
export function BackButton({ to, onClick }: { to?: LinkProps["to"]; onClick?: () => void }) {
  const icon = <ArrowLeft className="size-5" />;
  return to ? (
    <Button asChild variant="ghost" size="icon-sm" shape="pill" className="-ml-2"><Link to={to} aria-label="Back">{icon}</Link></Button>
  ) : (
    <Button type="button" variant="ghost" size="icon-sm" shape="pill" aria-label="Back" onClick={onClick} className="-ml-2">{icon}</Button>
  );
}

export function PageHeader({ title, children, back }: { title: string; children?: ReactNode; back?: ReactNode }) {
  return (
    <div className="sticky top-14 z-30 flex h-12 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
      {back}
      <h1 className="type-title min-w-0 flex-1 truncate">{title}</h1>
      {children}
    </div>
  );
}
