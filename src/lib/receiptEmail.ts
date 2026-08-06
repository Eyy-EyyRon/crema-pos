import { supabase } from './supabase';
import { buildReceiptHtml, ReceiptOrderInfo, ReceiptStoreInfo } from './receipt';

// Copies the send-alert/send-void-alert Brevo pattern — the HTML itself comes from
// buildReceiptHtml (the same builder printReceipt() uses), so an emailed receipt always matches
// what would have printed instead of a second, independently-maintained template.
export async function sendReceiptEmail(
  email: string,
  order: ReceiptOrderInfo,
  orderTypeLabel: string,
  store: ReceiptStoreInfo
): Promise<void> {
  const html = buildReceiptHtml(order, orderTypeLabel, store);
  const { error } = await supabase.functions.invoke('send-receipt', {
    body: { email, subject: `Your Receipt — Order ${order.no}`, html },
  });
  if (error) throw error;
}
