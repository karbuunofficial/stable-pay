import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { conversations, getCreator, messageSeed } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages/$id")({
  loader: ({ params }) => {
    const conv = conversations.find((c) => c.id === params.id);
    if (!conv) throw notFound();
    return { conv };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? getCreator(loaderData.conv.with) : undefined;
    const t = c ? `Chat with ${c.name} — AMIXOF` : "Messages — AMIXOF";
    return { meta: [{ title: t }, { name: "description", content: "Direct messages on AMIXOF." }, { property: "og:title", content: t }, { property: "og:description", content: "Direct messages on AMIXOF." }] };
  },
  component: Thread,
});

function Thread() {
  const { conv } = Route.useLoaderData();
  const c = getCreator(conv.with)!;
  const [msgs, setMsgs] = useState(messageSeed[conv.id] ?? []);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { setMsgs(messageSeed[conv.id] ?? []); }, [conv.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <Link to="/messages" aria-label="Back to conversations" className="-ml-2 grid h-8 w-8 place-items-center rounded-full hover:bg-surface-hover active:bg-surface-active md:hidden"><ArrowLeft className="h-5 w-5" /></Link>
        <ProfileAvatar src={c.avatar} name={c.name} size="sm" />
        <Link to="/profile/$handle" params={{ handle: c.handle }} className="type-author -my-0.5 truncate py-0.5 hover:underline">{c.name}</Link>
      </div>
      <div role="log" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "me" && "justify-end")}>
            <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-body", m.from === "me" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-surface-2")}>
              {m.text}<span className={cn("mt-0.5 block text-nano", m.from === "me" ? "text-primary-foreground/90" : "text-muted-foreground")}>{m.time}</span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; setMsgs((m) => [...m, { from: "me", text: text.trim(), time: "now" }]); setText(""); }} className="flex shrink-0 gap-2 border-t p-3">
        <input aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${c.name}`} className="h-10 min-w-0 flex-1 rounded-full border bg-surface-2 px-4 text-sm focus:border-ring" />
        <Button type="submit" aria-label="Send" size="icon" shape="pill" disabled={!text.trim()}><Send /></Button>
      </form>
    </div>
  );
}
