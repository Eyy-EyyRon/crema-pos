import { supabase } from './supabase';

// Clocks a barista in. If a re-login (or app relaunch after being killed)
// finds them already clocked in, the unique partial index on time_clock
// rejects the duplicate with 23505 — that's expected here, not an error to
// surface, since it just means the prior punch is still open.
export async function clockIn(baristaId: string) {
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
