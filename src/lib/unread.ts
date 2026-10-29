import { useSyncExternalStore } from "react";
import type { NotificationView } from "@/lib/social/types";

/**
 * "Unread" for the bell badge: items newer than the last time this profile opened the Notifications page.
 * Items without a timestamp (the demo build's sample notifications) count as unread until the page has been opened once.
 */
const key = (profileId: string) => `amixof-notifications-seen:${profileId}`;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function markNotificationsSeen(profileId: string, now = new Date()) {
  try {
    localStorage.setItem(key(profileId), now.toISOString());
  } catch {
    /* storage unavailable: the badge just comes back on reload */
  }
  emit();
}

export function unreadCount(items: NotificationView[], seenAt: string | null): number {
  if (!seenAt) return items.length;
  const seen = new Date(seenAt).getTime();
  return items.filter((n) => n.createdAt && new Date(n.createdAt).getTime() > seen).length;
}

const read = (profileId: string) => {
  try {
    return localStorage.getItem(key(profileId));
  } catch {
    return null;
  }
};

export function useSeenAt(profileId: string | undefined): string | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => (profileId ? read(profileId) : null),
    () => null,
  );
}
