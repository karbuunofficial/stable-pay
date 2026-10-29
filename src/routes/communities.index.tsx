import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Globe, Lock, Mail, Plus, Radio, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SocialLayout } from "@/components/amixof/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { communityStore, isDiscoverable, roleOf, useCommunities, validateCommunity, type Community, type Privacy } from "@/lib/communities";
import { img, me } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/communities/")({
  head: () => ({
    meta: [
      { title: "Communities — AMIXOF" },
      { name: "description", content: "Join or create lasting AMIXOF communities with a shared feed, group chat and community LIVE rooms." },
      { property: "og:title", content: "Communities — AMIXOF" },
      { property: "og:description", content: "Permanent spaces for scenes, creators and crews — feed, chat and LIVE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Communities,
});

export const PRIVACY: Record<Privacy, { label: string; hint: string; icon: typeof Globe }> = {
  public: { label: "Public", hint: "Anyone can discover and read. Join to participate.", icon: Globe },
  private: { label: "Private", hint: "Discoverable, but content needs approved membership.", icon: Lock },
  invite: { label: "Invite-only", hint: "Hidden. Members join by invitation only.", icon: Mail },
};

function Communities() {
  const all = useCommunities();
  const [open, setOpen] = useState(false);
  const list = all.filter((c) => isDiscoverable(c, me.handle));
  const mine = list.filter((c) => roleOf(c, me.handle));
  const other = list.filter((c) => !roleOf(c, me.handle));
  return (
    <SocialLayout>
      <PageHeader title="Communities">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create</Button>
      </PageHeader>
      <Section title="Your communities" items={mine} empty="You haven't joined any communities yet." />
      <Section title="Discover" items={other} empty="No more communities to discover." />
      <CreateDialog open={open} onOpenChange={setOpen} />
    </SocialLayout>
  );
}

function Section({ title, items, empty }: { title: string; items: Community[]; empty: string }) {
  return (
    <section className="border-b">
      <h2 className="type-overline px-4 pb-1 pt-3">{title}</h2>
      {items.length === 0 && <p className="px-4 pb-4 text-sm text-muted-foreground">{empty}</p>}
      {items.map((c) => {
        const P = PRIVACY[c.privacy];
        return (
          <Link key={c.handle} to="/communities/$handle" params={{ handle: c.handle }} className="flex gap-3 px-4 py-3 hover:bg-surface-hover active:bg-surface-active">
            <img src={c.cover} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{c.name}</span>
                {c.liveHost && <Badge variant="live" className="flex items-center gap-0.5"><Radio className="h-3 w-3" />LIVE</Badge>}
              </p>
              <p className="flex items-center gap-2 type-caption">
                <span>c/{c.handle}</span><span className="flex items-center gap-0.5"><P.icon className="h-3 w-3" />{P.label}</span>
                <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{c.members.length}</span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-sm text-support">{c.description}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [desc, setDesc] = useState("");
  const [topics, setTopics] = useState("");
  const [rules, setRules] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [approval, setApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const err = validateCommunity({ name, handle }, communityStore.get().map((c) => c.handle));
    if (err) { setError(err); return; }
    communityStore.add({
      handle, name: name.trim(), description: desc.trim() || "A new AMIXOF community.", cover: img(`comm-${handle}`, 1200, 400),
      topics: topics.split(",").map((t) => t.trim()).filter(Boolean), rules: rules.split("\n").map((r) => r.trim()).filter(Boolean),
      privacy, postApproval: approval, members: [{ handle: me.handle, role: "owner" }], requests: [], invited: [],
    });
    toast.success(`c/${handle} created — you're the owner`);
    onOpenChange(false);
    navigate({ to: "/communities/$handle", params: { handle } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Create a community</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label htmlFor="cn">Name</Label><Input id="cn" value={name} maxLength={50} onChange={(e) => { setName(e.target.value); setError(null); if (!handle || handle === slug(name)) setHandle(slug(e.target.value)); }} /></div>
          <div className="grid gap-1"><Label htmlFor="ch">Handle</Label>
            <div className="flex items-center gap-1"><span className="text-sm text-muted-foreground">c/</span><Input id="ch" value={handle} onChange={(e) => { setHandle(e.target.value.toLowerCase()); setError(null); }} /></div></div>
          <div className="grid gap-1"><Label htmlFor="cd">Description</Label><Textarea id="cd" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="ct">Topics (comma separated)</Label><Input id="ct" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Hip-Hop, Atlanta" /></div>
          <div className="grid gap-1"><Label htmlFor="cr">Rules (one per line)</Label><Textarea id="cr" rows={2} value={rules} onChange={(e) => setRules(e.target.value)} /></div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-medium">Privacy</legend>
            {(Object.keys(PRIVACY) as Privacy[]).map((k) => {
              const P = PRIVACY[k];
              return (
                <button key={k} type="button" aria-pressed={privacy === k} onClick={() => setPrivacy(k)}
                  className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-left", privacy === k ? "border-primary bg-primary/10" : "hover:bg-surface-hover active:bg-surface-active")}>
                  <P.icon className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="block text-sm font-semibold">{P.label}</span><span className="type-caption">{P.hint}</span></span>
                </button>
              );
            })}
          </fieldset>
          <label className="flex items-center justify-between gap-3 text-sm">Require approval for member posts <Switch checked={approval} onCheckedChange={setApproval} /></label>
          <p className="type-caption">Cover image is a demo placeholder. Owning a community doesn't redirect members' tips or gifts.</p>
          {error && <p role="alert" className="text-sm text-destructive-text">{error}</p>}
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Create community</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
