import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/messages/")({
  component: () => (
    <div className="grid h-full place-items-center p-8 text-center">
      <div><Mail className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-semibold">Select a conversation</p><p className="text-sm text-muted-foreground">Pick someone on the left to keep chatting.</p></div>
    </div>
  ),
});
