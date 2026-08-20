import { supabase } from './supabase';
import { requirePosSession } from './posSession';

// Read-only balance check before charging a gift card — the actual debit happens atomically in
// redeemGiftCard() below (redeem_gift_card() RPC), so this is purely informational (e.g. "this
// card only has ₱120, the order is ₱180 — pick another method").
export async function checkGiftCardBalance(code: string): Promise<{ balance: number; isActive: boolean } | null> {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('balance, is_active')
    .ilike('code', code.trim())
    .maybeSingle();
  if (error || !data) return null;
  return { balance: Number(data.balance), isActive: !!data.is_active };
}

// Atomic check-and-debit via redeem_gift_card() — see supabase/migrations/20260806120000_create_gift_cards.sql.
// Returns the card's new balance; throws if the code is invalid, inactive, or has insufficient balance.
export async function redeemGiftCard(code: string, amount: number): Promise<number> {
  await requirePosSession();
  const { data, error } = await supabase.rpc('redeem_gift_card', { p_code: code.trim(), p_amount: amount });
  if (error) throw error;
  return Number(data);
}
