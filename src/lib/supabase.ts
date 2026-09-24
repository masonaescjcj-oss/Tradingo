import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;

export const cloudEnabled = supabase != null;
