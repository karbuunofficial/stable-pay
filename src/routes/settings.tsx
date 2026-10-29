import { PageContainer } from "@/components/amixof/page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { me } from "@/data/mock";
import { socialRepo } from "@/lib/social";
import { useActor } from "@/lib/social/hooks";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { supabaseConfigured, updateUserProfile } from "@/utils/supabase";

const NOTIF_KEY = "amixof-notification-prefs";
type NotifPrefs = { live: boolean; tips: boolean; mentions: boolean; email: boolean };
const DEFAULT_NOTIF: NotifPrefs = { live: true, tips: true, mentions: true, email: false };
function loadNotif(): NotifPrefs {
  try {
    return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "{}") };
  } catch {
    return DEFAULT_NOTIF;
  }
}

/** Tiny stand-in for each theme so the choice is visible, not just two blank boxes. */
function ThemePreview({ t }: { t: Theme }) {
  const dark = t === "dark";
  return (
    <span aria-hidden className={cn("mb-2 flex h-14 gap-1.5 rounded-md border p-1.5", dark ? "bg-[oklch(0.141_0.004_285.8)]" : "bg-[oklch(0.985_0_0)]")}>
      <span className={cn("w-4 rounded-sm", dark ? "bg-[oklch(0.21_0.006_285.9)]" : "bg-[oklch(0.93_0_0)]")} />
      <span className="flex flex-1 flex-col gap-1">
        <span className="h-1.5 w-3/4 rounded-full bg-primary" />
        <span className={cn("h-1.5 w-full rounded-full", dark ? "bg-[oklch(0.37_0.012_285.8)]" : "bg-[oklch(0.85_0_0)]")} />
        <span className={cn("h-1.5 w-2/3 rounded-full", dark ? "bg-[oklch(0.37_0.012_285.8)]" : "bg-[oklch(0.85_0_0)]")} />
      </span>
    </span>
  );
}

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AMIXOF" },
      { name: "description", content: "Theme, account and notification preferences on AMIXOF." },
      { property: "og:title", content: "Settings — AMIXOF" },
      { property: "og:description", content: "Theme, account and notification preferences." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user, updateUser } = useAuth();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<Theme>("dark");
  const [notif, setNotif] = useState<NotifPrefs>(loadNotif);
  const [saving, setSaving] = useState(false);

  // Real accounts edit the real user. The demo build (no backend) edits the demo profile.
  const signedIn = !!user?.username;
  const demo = !supabaseConfigured;
  const savedName = signedIn ? user.display_name || user.username || "" : demo ? me.name : "";
  const [name, setName] = useState(savedName);
  useEffect(() => { setName(savedName); }, [savedName]);
  useEffect(() => { setTheme(currentTheme()); }, []);

  const nameErr = name.trim().length < 2 ? "Name must be at least 2 characters" : name.trim().length > 40 ? "Name can be at most 40 characters" : "";
  const dirty = name.trim() !== savedName;

  const setPref = (k: keyof NotifPrefs, v: boolean) =>
    setNotif((n) => {
      const next = { ...n, [k]: v };
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch { /* storage unavailable: the choice still applies for this visit */ }
      return next;
    });

  const save = async () => {
    if (nameErr || saving) return;
    setSaving(true);
    try {
      const display = name.trim();
      if (signedIn && user) {
        updateUser(await updateUserProfile(user.wallet_address, { display_name: display }));
      }
      if (actor) await socialRepo.updateProfile(actor.id, { name: display });
      await queryClient.invalidateQueries();
      toast.success("Profile saved");
    } catch (e) {
      console.error("Saving profile failed:", e);
      toast.error("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <h1 className="type-title">Settings</h1>
      <section>
        <h2 className="type-subheading mb-3">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} role="radio" aria-checked={theme === t} onClick={() => { applyTheme(t); setTheme(t); }} className={cn("rounded-lg border p-3 text-left capitalize", theme === t && "border-brand ring-1 ring-brand")}>
              <ThemePreview t={t} />
              {t}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="type-subheading mb-3">Account</h2>
        {!demo && !signedIn ? (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-semibold">Sign in to edit your profile</p>
            <p className="mt-1 text-muted-foreground">Your display name belongs to your StablePay account.</p>
            <Button asChild className="mt-3"><Link to="/me">Sign in</Link></Button>
          </div>
        ) : (
          <>
            <label className="block text-sm">Display name
              <Input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameErr} className="mt-1" />
            </label>
            {nameErr && <p role="alert" className="mt-1 text-xs text-destructive-text">{nameErr}</p>}
            {signedIn && user?.username && <p className="mt-1 type-caption">Username @{user.username} can't be changed.</p>}
            <Button disabled={!!nameErr || !dirty || saving} onClick={save} className="mt-3">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </section>
      <section>
        <h2 className="type-subheading mb-1">Notifications</h2>
        <p className="mb-3 type-caption">Saved on this device.</p>
        <div className="divide-y rounded-lg border">
          {([["live", "Creators going live"], ["tips", "Tips and gifts"], ["mentions", "Mentions and replies"], ["email", "Email digest"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between p-3 text-sm">{l}<Switch checked={notif[k]} onCheckedChange={(v) => setPref(k, v)} /></label>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
