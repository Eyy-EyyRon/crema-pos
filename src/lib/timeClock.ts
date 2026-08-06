import { supabase } from './supabase';

// Clocks a barista in. Every login calls this unconditionally (locking the POS and logging back
// in doesn't clock out — see lockPos() in useCremaPos.ts — so a normal shift re-triggers this
// many times over). Checking for an already-open punch first, instead of always attempting the
// insert, avoids a guaranteed 409 in the network log on every single one of those re-logins; the
// unique partial index on time_clock still backstops the rare real race (two logins firing at
// once), so 23505 there is still expected and still silently ignored, not surfaced.
export async function clockIn(baristaId: string) {
  const { data: existing } = await supabase
    .from('time_clock')
    .select('id')
    .eq('barista_id', baristaId)
    .is('clock_out', null)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('time_clock').insert({ barista_id: baristaId });
  if (error && error.code !== '23505') {
    console.warn('clockIn failed:', error.message);
  }
}

// Closes whichever punch is currently open for this barista. A no-op if none
// is open.
export async function clockOut(baristaId: string) {
  const { error } = await supabase
    .from('time_clock')
    .update({ clock_out: new Date().toISOString() })
    .eq('barista_id', baristaId)
    .is('clock_out', null);
  if (error) {
    console.warn('clockOut failed:', error.message);
  }
}
