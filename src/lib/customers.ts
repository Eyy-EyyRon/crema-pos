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
