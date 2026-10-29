import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Radio } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { dashboard } from "@/data/mock";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Creator dashboard — AMIXOF" },
      { name: "description", content: "Track followers, viewers and earnings, and set up your next stream on AMIXOF." },
      { property: "og:title", content: "Creator dashboard — AMIXOF" },
      { property: "og:description", content: "Followers, viewers, earnings and go-live settings." },
    ],
  }),
  component: Dashboard,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Dashboard() {
  const [title, setTitle] = useState("Studio Session: building the hook from scratch");
  const [chatSlow, setChatSlow] = useState(false);
  const [saving, setSaving] = useState(false);
  const max = Math.max(...dashboard.weekly);
  return (
    <div className="space-y-6 px-4 py-5 lg:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="truncate type-title">Creator dashboard</h1>
        <button onClick={() => toast.success("You're live!", { description: "Simulated broadcast started" })} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"><Radio className="h-4 w-4" /> Go live</button>
      </div>
      <div className="grid grid-cols-2 border-y lg:grid-cols-4">
        {dashboard.stats.map((s, i) => (
          <div key={s.label} className={`p-4 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <p className="type-caption">{s.label}</p>
            <p className="type-stat mt-1">{s.value}</p>
            <p className="text-xs text-success-text">{s.delta}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border p-4">
          <h2 className="type-subheading">Earnings this week</h2>
          <div className="mt-4 flex h-48 items-end gap-2" role="img" aria-label={`Earnings this week: ${dashboard.weekly.map((v, i) => `${days[i]} $${v * 10}`).join(", ")}`}>
            {dashboard.weekly.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                <span className="text-micro tabular-nums text-muted-foreground" aria-hidden>${v * 10}</span>
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${(v / max) * 100}%` }} />
                </div>
                <span className="text-micro text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="type-subheading">Stream setup</h2>
          <label className="mt-3 block text-sm">Title
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1" />
          </label>
          <p className="mt-1 text-right type-caption">{title.length}/120</p>
          <label className="mt-2 flex items-center justify-between text-sm">Slow mode chat <Switch checked={chatSlow} onCheckedChange={setChatSlow} /></label>
          <button disabled={!title.trim() || saving} onClick={async () => { setSaving(true); await new Promise((r) => setTimeout(r, 600)); setSaving(false); toast.success("Stream settings saved"); }} className="mt-4 h-9 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Saving…" : "Save settings"}</button>
        </section>
      </div>
      <section>
        <h2 className="type-subheading mb-2">Recent streams</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface-2 text-left type-caption"><tr><th className="p-3">Stream</th><th className="p-3">Date</th><th className="p-3">Peak</th><th className="p-3">Length</th><th className="p-3 text-right">Earned</th></tr></thead>
            <tbody>{dashboard.recent.map((r) => <tr key={r.title} className="border-t"><td className="p-3 font-medium">{r.title}</td><td className="p-3 text-muted-foreground">{r.date}</td><td className="p-3 tabular-nums">{r.peak.toLocaleString()}</td><td className="p-3 tabular-nums">{r.duration}</td><td className="p-3 text-right tabular-nums">${r.earned}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
