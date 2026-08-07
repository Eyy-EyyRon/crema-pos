import { supabase } from './supabase';
import { Customer } from '../types';

function mapRow(row: any): Customer {
  return {
    id: row.id,
    phone: row.phone,
    fullName: row.full_name ?? null,
    email: row.email ?? null,
    loyaltyPoints: Number(row.loyalty_points ?? 0),
  };
}

export async function lookupCustomerByPhone(phone: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, phone, full_name, email, loyalty_points')
    .eq('phone', phone.trim())
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export type CardLookupResult =
  | { status: 'found'; customer: Customer }
  | { status: 'not_found' }
  | { status: 'revoked' };

// Card codes are always normalized to uppercase at write time by issue_loyalty_card() (the only
// write path), so an exact match is safe here — unlike gift_cards' .ilike(), which hedges against
// legacy mixed-case rows.
export async function lookupCustomerByCardCode(code: string): Promise<CardLookupResult> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('status, customers(id, phone, full_name, email, loyalty_points)')
    .eq('code', normalized)
    .maybeSingle();
  if (error || !data) return { status: 'not_found' };
  if (data.status !== 'active') return { status: 'revoked' };
  const row: any = Array.isArray(data.customers) ? data.customers[0] : data.customers;
  if (!row) return { status: 'not_found' };
  return { status: 'found', customer: mapRow(row) };
}

export async function createCustomer(phone: string, fullName: string, email?: string | null): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ phone: phone.trim(), full_name: fullName.trim() || null, email: email?.trim() || null })
    .select('id, phone, full_name, email, loyalty_points')
    .single();
  if (error) throw error;
  return mapRow(data);
}

// Atomic earn/redeem via apply_loyalty_points() — see supabase/migrations/20260806110000_add_loyalty_program.sql.
// Returns the customer's new points balance.
export async function applyLoyaltyPoints(customerId: string, earn: number, redeem: number): Promise<number> {
  const { data, error } = await supabase.rpc('apply_loyalty_points', {
    p_customer_id: customerId,
    p_earn: earn,
    p_redeem: redeem,
  });
  if (error) throw error;
  return Number(data);
}
