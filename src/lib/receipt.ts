import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { formatOrderNo } from '../format';

export interface ReceiptStoreInfo {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  tin: string;
  receiptFooter: string;
}

// Looser than the live-checkout SuccessInfo type (method: 'Cash' | 'GCash')
// so a reprint from History — which can encounter any payment_method stored
// on an older order — can reuse this without fighting the stricter union.
// A real SuccessInfo still satisfies this structurally, so no call-site changes.
export interface ReceiptOrderInfo {
  no: string;
  total: number;
  method: string;
  items: { qtyName: string; lineStr: string; modsStr?: string }[];
  showChange: boolean;
  change: number;
  customerName?: string | null;
  gcashReference?: string | null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isPrintCancelled(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('dismiss') ||
    msg.includes('closed') ||
    msg.includes('printdialog') ||
    msg.includes('printing did not complete')
  );
}

// Exported so lib/receiptEmail.ts can send the exact same markup by email instead of duplicating
// this template in the send-receipt Edge Function's separate Deno runtime.
export function buildReceiptHtml(success: ReceiptOrderInfo, orderTypeLabel: string, store: ReceiptStoreInfo, orderDate: Date = new Date()): string {
  const now = orderDate;
  const itemRows = success.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.qtyName)}${it.modsStr ? `<div class="mod">${escapeHtml(it.modsStr)}</div>` : ''}</td><td class="r">${escapeHtml(it.lineStr)}</td></tr>`
    )
    .join('');
  const changeRow = success.showChange
    ? `<tr class="total"><td>Change Due</td><td class="r">&#8369;${success.change.toFixed(2)}</td></tr>`
    : '';
  const storeLines = [store.address, store.phone && `Tel: ${store.phone}`, store.tin && `TIN: ${store.tin}`]
    .filter(Boolean)
    .map((line) => `<div class="storeLine">${escapeHtml(line as string)}</div>`)
    .join('');
  const customerLine = success.customerName
    ? `<div><span>Name</span><span>${escapeHtml(success.customerName)}</span></div>`
    : '';
  const gcashRefLine = success.gcashReference
    ? `<div><span>GCash Ref#</span><span>${escapeHtml(success.gcashReference)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { margin: 12mm; }
      body { font-family: Helvetica, Arial, sans-serif; padding: 28px; color: #1a1a1a; }
      h1 { text-align: center; font-size: 22px; letter-spacing: 5px; margin: 0; text-transform: uppercase; }
      .sub { text-align: center; font-size: 11px; letter-spacing: 2px; color: #666; margin-top: 3px; }
      .storeLine { text-align: center; font-size: 11px; color: #666; margin-top: 2px; }
      .meta { margin-top: 20px; font-size: 13px; }
      .meta div { display: flex; justify-content: space-between; margin-bottom: 4px; }
      table { width: 100%; margin-top: 16px; border-top: 1px dashed #999; padding-top: 10px; font-size: 14px; border-collapse: collapse; }
      td { padding: 4px 0; }
      td.r { text-align: right; }
      .mod { font-size: 11px; color: #777; margin-top: 2px; }
      tr.total td { font-weight: bold; border-top: 1px dashed #999; padding-top: 10px; }
      .footer { text-align: center; margin-top: 26px; font-size: 12px; color: #777; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(store.storeName)}</h1>
    <div class="sub">${escapeHtml(store.tagline)}</div>
    ${storeLines}
    <div class="meta">
      <div><span>Order No.</span><span>${escapeHtml(formatOrderNo(success.no))}</span></div>
      <div><span>Date</span><span>${escapeHtml(now.toLocaleDateString())} ${escapeHtml(now.toLocaleTimeString())}</span></div>
      <div><span>Order Type</span><span>${escapeHtml(orderTypeLabel)}</span></div>
      <div><span>Payment</span><span>${escapeHtml(success.method)}</span></div>
      ${gcashRefLine}
      ${customerLine}
    </div>
    <table>
      ${itemRows}
      <tr class="total"><td>Total Paid</td><td class="r">&#8369;${success.total.toFixed(2)}</td></tr>
      ${changeRow}
    </table>
    <div class="footer">${escapeHtml(store.receiptFooter)}</div>
  </body>
</html>`;
}

/**
 * Opens the system print dialog for the receipt.
 * Web: printToFileAsync opens the browser print UI for the given HTML (printAsync would
 * print the live POS page instead). Native: printAsync shows AirPrint / Android print.
 * Closing the dialog without printing is treated as success, not an error.
 */
export async function printReceipt(success: ReceiptOrderInfo, orderTypeLabel: string, store: ReceiptStoreInfo, orderDate?: Date): Promise<void> {
  const html = buildReceiptHtml(success, orderTypeLabel, store, orderDate);
  try {
    if (Platform.OS === 'web') {
      // Opens the browser print dialog for this HTML document.
      await Print.printToFileAsync({ html });
      return;
    }
    await Print.printAsync({ html });
  } catch (e) {
    if (isPrintCancelled(e)) return;
    throw e;
  }
}
