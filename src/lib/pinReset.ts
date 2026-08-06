import { supabase } from './supabase';

// Files a PIN-reset request from the login screen, before any session exists — the anon-insert
// RLS policy on pin_reset_requests only allows this for a real, currently-active barista
// profile (see supabase/migrations/20260806150000_staff_invite_and_pin_reset.sql). A trigger on
// that table emails managers; a manager then resets the PIN from the Staff page.
export async function requestPinReset(profileId: string, note?: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('pin_reset_requests').insert({ profile_id: profileId, note: note?.trim() || null });
  if (error) return { error: error.message };
  return {};
}
