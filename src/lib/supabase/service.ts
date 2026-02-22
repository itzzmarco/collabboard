import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client that bypasses RLS.
 * Only use server-side for admin operations (e.g., guest board access).
 *
 * The `server-only` import at the top of this file is intentional: it causes a
 * build-time error if this module is ever imported from a Client Component,
 * ensuring the service-role key is never exposed to the client.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
