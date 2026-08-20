import { supabase } from './supabase';

export const SESSION_MISSING_MESSAGE =
  "Your session isn't active. Please lock the POS and log back in, then try again.";

export async function requirePosSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const err = new Error(SESSION_MISSING_MESSAGE);
    (err as Error & { code?: string }).code = 'NO_SESSION';
    throw err;
  }
  return session;
}
