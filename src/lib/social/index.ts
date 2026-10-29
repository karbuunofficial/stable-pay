import { supabaseConfigured } from "@/utils/supabase";
import { mockRepo } from "./mockRepo";
import { supabaseRepo } from "./supabaseRepo";
import type { SocialRepo } from "./types";

/**
 * Real data when Supabase is configured; the in-memory demo otherwise.
 * Force the demo with VITE_SOCIAL_SOURCE=mock.
 */
export const socialRepo: SocialRepo =
  supabaseConfigured && import.meta.env.VITE_SOCIAL_SOURCE !== "mock" ? supabaseRepo : mockRepo;

export * from "./types";
