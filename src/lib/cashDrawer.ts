import { supabase } from './supabase';

export type OpenShift = {
  id: string;
  startingCash: number;
  openedAt: string;
};

// Same `cash_drawer_shifts` table CafePOS/app/pos/index.tsx uses (columns:
// barista_id, starting_cash, opened_at, status, closed_at, actual_ending_cash).
export async function getOpenShift(baristaId: string): Promise<OpenShift | null> {
  const { data } = await supabase
    .from('cash_drawer_shifts')
    .select('id, starting_cash, opened_at')
    .eq('barista_id', baristaId)
    .eq('status', 'open')
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, startingCash: Number(data.starting_cash), openedAt: data.opened_at };
}

export async function openShift(baristaId: string, startingCash: number): Promise<OpenShift> {
  const { data, error } = await supabase
    .from('cash_drawer_shifts')
    .insert([{ barista_id: baristaId, starting_cash: startingCash }])
    .select('id, starting_cash, opened_at')
    .single();
  if (error) throw error;
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
