import { supabase } from './supabase';

export type PosActivityType = 'shift_opened' | 'shift_closed' | 'void_requested' | 'void_approved' | 'refund_issued';

// Fire-and-forget audit trail write for the manager staff-page's Activity tab. Never throws — a
// failed log write must not block or roll back the real action it's describing, same non-fatal
// convention as the `sales` mirror-row insert in posOrder.ts::submitPosOrder.
export async function logActivity(baristaId: string, actionType: PosActivityType, description: string): Promise<void> {
  try {
    const { error } = await supabase.from('pos_activity_logs').insert({ barista_id: baristaId, action_type: actionType, description });
    if (error) console.warn('logActivity failed:', error.message);
  } catch (e) {
    console.warn('logActivity failed:', e);
  }
}
