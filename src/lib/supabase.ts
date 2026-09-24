import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { supabaseRelay } from './proxy';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The Supabase client, or null when the project isn't configured
 * (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY). The app works fully offline without it.
 *
 * Chartoon shares its Supabase project with other apps, so it doesn't use Supabase Auth:
 * accounts and sessions live in its own tradingo_* tables and are reached through
 * tradingo_* database functions (see supabase/migrations). The tradingo_ prefix is the app's old
 * name; it stays so the installed server objects and saved sessions keep working.
 */
const make = (base: string) => createClient(base, key!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const relay = supabaseRelay(url);

/** Asks through app.chartoon.net's relay when it serves this project (src/lib/proxy.ts), else the project itself. */
export const supabase: SupabaseClient | null = url && key ? make(relay ?? url) : null;

/** The project's own address, for when the relay can't be reached (null when there's no relay to fall back from). */
export const supabaseDirect: SupabaseClient | null = url && key && relay ? make(url) : null;

export const cloudEnabled = supabase != null;
