import { supabase } from './supabase';

export type OpenShift = {
  id: string;
  startingCash: number;
  openedAt: string;
};

// Same `cash_drawer_shifts` table CafePOS/app/pos/index.tsx uses (columns:
// barista_id, starting_cash, opened_at, status, closed_at, actual_ending_cash).
export async function getOpenShift(baristaId: string): Promise<OpenShift | null> {
  // .order + .limit(1) before .maybeSingle() — if a barista somehow ends up with more than one
  // 'open' row (a duplicate from before the one-open-per-barista constraint below existed, or a
  // narrow insert race), .maybeSingle() alone would throw on >1 row and, since only `data` was
  // destructured here, that error went silently ignored — permanently returning null and
  // re-prompting "Open Cash Drawer" every login no matter how many times it's answered.
  const { data, error } = await supabase
    .from('cash_drawer_shifts')
    .select('id, starting_cash, opened_at')
    .eq('barista_id', baristaId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('getOpenShift failed:', error.message);
    return null;
  }
  if (!data) return null;
  return { id: data.id, startingCash: Number(data.starting_cash), openedAt: data.opened_at };
}

export async function openShift(baristaId: string, startingCash: number): Promise<OpenShift> {
  const { data, error } = await supabase
    .from('cash_drawer_shifts')
    .insert([{ barista_id: baristaId, starting_cash: startingCash }])
    .select('id, starting_cash, opened_at')
    .single();
  if (error) {
    // 23505 here means the one-open-per-barista unique index rejected this insert because an
    // open shift already exists (e.g. two rapid taps, or a login race that slipped through) —
    // that's a real, already-open shift, not a failure, so hand it back instead of surfacing a
    // raw DB error to the barista. Same "expected, not an error" convention as clockIn's 23505.
    if (error.code === '23505') {
      const existing = await getOpenShift(baristaId);
      if (existing) return existing;
    }
    throw error;
  }
  return { id: data.id, startingCash: Number(data.starting_cash), openedAt: data.opened_at };
}

export async function closeShift(shiftId: string, actualEndingCash: number): Promise<void> {
  const { error } = await supabase
    .from('cash_drawer_shifts')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      actual_ending_cash: actualEndingCash,
    })
    .eq('id', shiftId);
  if (error) throw error;
}
