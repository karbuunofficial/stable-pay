import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Bell, CheckCircle2, Info, MoreHorizontal, Plus, Search, Send, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { ThemeToggle } from "@/components/amixof/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TabBar } from "@/components/ui/tab-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/design-system")({
  head: () => ({ meta: [{ title: "Design system — AMIXOF" }, { name: "description", content: "Tokens and components used across AMIXOF and StablePay." }] }),
  component: DesignSystem,
});

/** Reads the live value of a CSS variable so swatches always show the current theme's colour. */
function useVar(name: string) {
  const [v, setV] = useState("");
  useEffect(() => {
    const read = () => setV(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [name]);
  return v;
}

function Swatch({ token, cls, note, text, bare }: { token: string; cls: string; note?: string; text?: string; bare?: boolean }) {
  const value = useVar(`--${token}`);
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden className={cn("grid size-control-lg shrink-0 place-items-center rounded-control border text-xs font-bold", cls, text)}>{bare ? null : "Aa"}</span>
      <span className="min-w-0">
        <code className="block truncate text-xs font-semibold">{token}</code>
        <span className="block truncate text-xs text-muted-foreground">{note ?? value}</span>
      </span>
    </li>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4 border-t pt-8">
      <div>
        <h2 id={id} className="type-title">{title}</h2>
        {intro && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

// Full class names, written out: Tailwind only generates utilities it can see as complete strings.
const STATUS = [
  { name: "success", solid: "bg-success text-success-foreground", tint: "bg-success-subtle text-success-text" },
  { name: "warning", solid: "bg-warning text-warning-foreground", tint: "bg-warning-subtle text-warning-text" },
  { name: "info", solid: "bg-info text-info-foreground", tint: "bg-info-subtle text-info-text" },
] as const;

const group = (label: string, children: ReactNode) => (
  <div>
    <h3 className="type-overline mb-2">{label}</h3>
    {children}
  </div>
);

function DesignSystem() {
  const [tab, setTab] = useState<"posts" | "media" | "streams">("posts");
  const [pill, setPill] = useState<"all" | "image" | "video">("all");

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="type-display">Design system</h1>
            <p className="mt-2 max-w-prose text-muted-foreground">
              One set of tokens and components for AMIXOF and StablePay. Violet is for actions and the active item; everything else is neutral surfaces, borders and text. Switch theme with the button: every swatch and component below follows it.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">Theme <ThemeToggle /></div>
        </header>

        <Section id="surfaces" title="Surfaces" intro="Layers are separated by tone and a border, not by shadows. Floating layers (menus, dialogs) add one light shadow.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Swatch token="background" cls="bg-background" note="Page" />
            <Swatch token="card" cls="bg-card" note="Cards, panels (elevated 1)" />
            <Swatch token="surface-2" cls="bg-surface-2" note="Inputs, raised areas (elevated 2)" />
            <Swatch token="surface-hover" cls="bg-surface-hover" note="Hover" />
            <Swatch token="surface-active" cls="bg-surface-active" note="Pressed" />
            <Swatch token="popover" cls="bg-popover" note="Menus, dialogs, tooltips" />
            <Swatch token="border" cls="bg-background border-border" note="Dividers, card borders" />
            <Swatch token="input" cls="bg-background border-input" note="Control borders" />
            <Swatch token="overlay" cls="bg-overlay" note="Dialog backdrop" />
          </ul>
        </Section>

        <Section id="text" title="Text and brand" intro="Three text levels. Use the token, never a raw grey.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Swatch token="foreground" cls="bg-background text-foreground" note="Primary text" />
            <Swatch token="support" cls="bg-background text-support" note="Secondary text (body copy)" />
            <Swatch token="muted-foreground" cls="bg-background text-muted-foreground" note="Tertiary: meta, captions" />
            <Swatch token="primary" cls="bg-primary text-primary-foreground" note="Primary action fill" />
            <Swatch token="brand" cls="bg-background text-brand" note="Brand text, links, active item" />
            <Swatch token="brand-subtle" cls="bg-brand-subtle text-brand" note="Tinted background for brand chips" />
            <Swatch token="ring" cls="bg-background border-ring border-2" note="Focus ring" />
          </ul>
        </Section>

        <Section id="status" title="Status" intro="Four families, each with a solid fill, the text colour for it, a tint and a readable text colour. Status colours mean status only.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS.map((s) => (
              <li key={s.name}>
                <ul className="space-y-2">
                  <Swatch token={s.name} cls={s.solid} note="Solid" />
                  <Swatch token={`${s.name}-subtle`} cls={s.tint} note="Tint + text" />
                </ul>
              </li>
            ))}
            <li>
              <ul className="space-y-2">
                <Swatch token="destructive" cls="bg-destructive text-destructive-foreground" note="Solid" />
                <Swatch token="destructive-subtle" cls="bg-destructive-subtle text-destructive-text" note="Tint + text" />
              </ul>
            </li>
            <Swatch token="live" cls="bg-live text-live-foreground" note="Live broadcast" />
            <Swatch token="online" cls="bg-online" note="Presence dot" bare />
          </ul>
        </Section>

        <Section id="type" title="Typography" intro="Space Grotesk for display headings, Manrope for everything else. One h1 per page.">
          <div className="space-y-3">
            {([
              ["type-display", "Display 30 / 700 display", "Article title, sign-in hero"],
              ["type-stat", "Stat 24 / 700 display", "$4,812"],
              ["type-title", "Title 20 / 700 display", "Page title, profile name"],
              ["type-heading", "Heading 16 / 700 display", "Section heading"],
              ["type-subheading", "Subheading 15 / 600", "Card title, post title, list item title"],
              ["type-author", "Author 15 / 600", "Kaydence"],
              ["type-body", "Body 15 / 400", "Post and article text. Long strings wrap, line height is 1.6 and the measure is capped near 65 characters for articles."],
              ["type-ui", "UI 14 / 500", "Buttons, form labels, menu items"],
              ["type-meta", "Meta 13 / 400 muted", "@username · 4m"],
              ["type-caption", "Caption 12 / 400 muted", "Counts, helper text, table headers"],
              ["type-overline", "Overline 12 / 600 caps", "Group labels"],
            ] as const).map(([cls, label, sample]) => (
              <div key={cls} className="grid items-baseline gap-x-6 sm:grid-cols-[11rem_1fr]">
                <code className="text-xs text-muted-foreground">.{cls}<span className="block">{label}</span></code>
                <p className={cls}>{sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="shape" title="Shape, depth and spacing">
          <div className="grid gap-6 md:grid-cols-3">
            {group("Radius", (
              <div className="flex flex-wrap items-end gap-3">
                {[["rounded-control", "control 6"], ["rounded-card", "card 8"], ["rounded-overlay", "overlay 12"], ["rounded-full", "pill"]].map(([c, l]) => (
                  <div key={c} className="text-center"><div className={cn("size-14 border bg-surface-2", c)} /><span className="mt-1 block text-xs text-muted-foreground">{l}</span></div>
                ))}
              </div>
            ))}
            {group("Shadow (floating layers only)", (
              <div className="flex flex-wrap gap-4">
                {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg"].map((c) => (
                  <div key={c} className="text-center"><div className={cn("size-14 rounded-card border bg-popover", c)} /><span className="mt-1 block text-xs text-muted-foreground">{c.replace("shadow-", "")}</span></div>
                ))}
              </div>
            ))}
            {group("Spacing (4px base)", (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {[["gap-2", "8 tight: icon + label"], ["gap-3", "12 related items"], ["p-5", "20 card padding"], ["gap-6", "24 between sections"], ["px-4", "16 page gutter"]].map(([c, l]) => (
                  <div key={c} className="flex items-center gap-2"><span className={cn("h-3 rounded-sm bg-primary", { "gap-2": "w-2", "gap-3": "w-3", "p-5": "w-5", "gap-6": "w-6", "px-4": "w-4" }[c as string])} /><code>{c}</code> {l}</div>
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section id="controls" title="Buttons" intro="Heights: xs 24 · sm 32 · default 36 · lg 40 · xl 48 (the control scale). Touch devices get a 44px hit area automatically.">
          <div className="space-y-4">
            {group("Variants", (
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            ))}
            {group("Sizes", (
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra small</Button>
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra large</Button>
                <Button size="icon-sm" variant="outline" aria-label="Add"><Plus /></Button>
                <Button size="icon" variant="outline" aria-label="Search"><Search /></Button>
                <Button size="icon-lg" shape="pill" aria-label="Send"><Send /></Button>
              </div>
            ))}
            {group("States", (
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>Disabled</Button>
                <Button variant="outline" disabled>Disabled outline</Button>
                <Button loading>Saving</Button>
                <Button shape="pill" size="sm">Follow</Button>
                <Button variant="outline" shape="pill" size="sm">Following</Button>
              </div>
            ))}
          </div>
        </Section>

        <Section id="forms" title="Form fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="ds-name">Display name</Label><Input id="ds-name" placeholder="Jordan Reyes" /></div>
            <div className="space-y-1.5"><Label htmlFor="ds-bad">Invalid</Label><Input id="ds-bad" aria-invalid defaultValue="x" /><p className="text-xs text-destructive-text">Name must be at least 2 characters</p></div>
            <div className="space-y-1.5"><Label htmlFor="ds-dis">Disabled</Label><Input id="ds-dis" disabled defaultValue="@hustlebig" /></div>
            <div className="space-y-1.5"><Label htmlFor="ds-amt">Amount (xl)</Label><Input id="ds-amt" size="xl" inputMode="decimal" defaultValue="25.00" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ds-msg">Message</Label><Textarea id="ds-msg" placeholder="Say something nice" /></div>
            <div className="flex items-center justify-between rounded-card border p-3 sm:col-span-2"><Label htmlFor="ds-sw">Email digest</Label><Switch id="ds-sw" /></div>
          </div>
        </Section>

        <Section id="cards" title="Cards, badges and avatars">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Flat card</CardTitle><CardDescription>Border and tone, no shadow.</CardDescription></CardHeader>
              <CardContent className="text-sm text-support">Use for panels, forms and grouped content.</CardContent>
            </Card>
            <Card interactive tabIndex={0}>
              <CardHeader><CardTitle>Interactive card</CardTitle><CardDescription>Hover tone for clickable cards.</CardDescription></CardHeader>
              <CardContent className="text-sm text-support">Make the whole card a link or button.</CardContent>
            </Card>
          </div>
          {group("Badges", (
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge><Badge variant="brand">Brand</Badge><Badge variant="secondary">Secondary</Badge><Badge variant="outline">Outline</Badge>
              <Badge variant="success"><CheckCircle2 aria-hidden />Confirmed</Badge>
              <Badge variant="warning"><TriangleAlert aria-hidden />Pending</Badge>
              <Badge variant="info"><Info aria-hidden />Info</Badge>
              <Badge variant="destructive"><AlertCircle aria-hidden />Failed</Badge>
              <Badge variant="live">LIVE · 4.1K</Badge>
            </div>
          ))}
          {group("Avatars", (
            <div className="flex flex-wrap items-end gap-4">
              {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
                <div key={s} className="text-center"><ProfileAvatar name="Kaydence" size={s} /><span className="mt-1 block text-xs text-muted-foreground">{s}</span></div>
              ))}
            </div>
          ))}
        </Section>

        <Section id="feedback" title="Alerts, skeletons and toasts">
          <div className="grid gap-3 md:grid-cols-2">
            <Alert variant="info"><Info aria-hidden /><AlertTitle>Heads up</AlertTitle><AlertDescription>Informational, announced politely.</AlertDescription></Alert>
            <Alert variant="success"><CheckCircle2 aria-hidden /><AlertTitle>Saved</AlertTitle><AlertDescription>Your profile was updated.</AlertDescription></Alert>
            <Alert variant="warning"><TriangleAlert aria-hidden /><AlertTitle>Low balance</AlertTitle><AlertDescription>You may not have enough USDC for this payment.</AlertDescription></Alert>
            <Alert variant="destructive"><AlertCircle aria-hidden /><AlertTitle>Payment failed</AlertTitle><AlertDescription>Announced assertively. Nothing was charged.</AlertDescription></Alert>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2" aria-hidden><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
            <Button variant="outline" onClick={() => toast.success("Tip sent", { description: "Toasts use the popover surface." })}>Show toast</Button>
          </div>
        </Section>

        <Section id="navigation" title="Tabs, menus and overlays">
          <div className="space-y-4">
            {group("Tab bar (swaps content in place)", (
              <div className="overflow-hidden rounded-card border">
                <TabBar label="Profile sections" value={tab} onChange={setTab} tabs={[{ value: "posts", label: "Posts" }, { value: "media", label: "Media" }, { value: "streams", label: "Streams" }]} />
                <p className="p-4 text-sm text-muted-foreground">Selected: {tab}. Arrow keys move between tabs.</p>
              </div>
            ))}
            {group("Filter chips", (
              <TabBar variant="pill" label="Media type" value={pill} onChange={setPill} tabs={[{ value: "all", label: "All" }, { value: "image", label: "Images" }, { value: "video", label: "Videos" }]} />
            ))}
            {group("Tabs with panels", (
              <Tabs defaultValue="a" className="overflow-hidden rounded-card border">
                <TabsList><TabsTrigger value="a">Feed</TabsTrigger><TabsTrigger value="b">Chat</TabsTrigger><TabsTrigger value="c">About</TabsTrigger></TabsList>
                <TabsContent value="a" className="p-4 text-sm text-muted-foreground">Feed panel</TabsContent>
                <TabsContent value="b" className="p-4 text-sm text-muted-foreground">Chat panel</TabsContent>
                <TabsContent value="c" className="p-4 text-sm text-muted-foreground">About panel</TabsContent>
              </Tabs>
            ))}
            {group("Overlays", (
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent><DropdownMenuItem>Send a gift</DropdownMenuItem><DropdownMenuItem>Copy link</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem>Report</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Notifications"><Bell /></Button></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
                <Dialog>
                  <DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Send a tip</DialogTitle><DialogDescription>Dialogs use the popover surface, the overlay token and the largest radius.</DialogDescription></DialogHeader>
                    <div className="flex justify-end gap-2"><Button variant="outline">Cancel</Button><Button>Send $5</Button></div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </TooltipProvider>
  );
}
