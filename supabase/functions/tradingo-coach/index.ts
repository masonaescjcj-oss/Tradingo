// Supabase Edge Function entry (Deno). The logic lives in handler.ts so it can be tested with Node.
import { handle } from './handler.ts';

Deno.serve((req) => handle(req, Deno.env.toObject()));
