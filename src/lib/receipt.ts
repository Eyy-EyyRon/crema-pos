import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SuccessInfo } from '../types';

export interface ReceiptStoreInfo {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  tin: string;
  receiptFooter: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReceiptHtml(success: SuccessInfo, orderTypeLabel: string, store: ReceiptStoreInfo): string {
  const now = new Date();
  const itemRows = success.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.qtyName)}</td><td class="r">${escapeHtml(it.lineStr)}</td></tr>`
    )
    .join('');
  const changeRow = success.showChange
    ? `<tr class="total"><td>Change Due</td><td class="r">&#8369;${success.change.toFixed(2)}</td></tr>`
    : '';
  const storeLines = [store.address, store.phone && `Tel: ${store.phone}`, store.tin && `TIN: ${store.tin}`]
    .filter(Boolean)
    .map((line) => `<div class="storeLine">${escapeHtml(line as string)}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: Helvetica, Arial, sans-serif; padding: 28px; color: #1a1a1a; }
      h1 { text-align: center; font-size: 22px; letter-spacing: 5px; margin: 0; text-transform: uppercase; }
      .sub { text-align: center; font-size: 11px; letter-spacing: 2px; color: #666; margin-top: 3px; }
      .storeLine { text-align: center; font-size: 11px; color: #666; margin-top: 2px; }
      .meta { margin-top: 20px; font-size: 13px; }
      .meta div { display: flex; justify-content: space-between; margin-bottom: 4px; }
      table { width: 100%; margin-top: 16px; border-top: 1px dashed #999; padding-top: 10px; font-size: 14px; border-collapse: collapse; }
      td { padding: 4px 0; }
      td.r { text-align: right; }
      tr.total td { font-weight: bold; border-top: 1px dashed #999; padding-top: 10px; }
      .footer { text-align: center; margin-top: 26px; font-size: 12px; color: #777; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(store.storeName)}</h1>
    <div class="sub">${escapeHtml(store.tagline)}</div>
    ${storeLines}
    <div class="meta">
      <div><span>Order No.</span><span>${escapeHtml(success.no)}</span></div>
      <div><span>Date</span><span>${escapeHtml(now.toLocaleDateString())} ${escapeHtml(now.toLocaleTimeString())}</span></div>
      <div><span>Order Type</span><span>${escapeHtml(orderTypeLabel)}</span></div>
      <div><span>Payment</span><span>${escapeHtml(success.method)}</span></div>
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

/** Renders the receipt to a PDF and opens the OS print/share sheet; falls back to the direct print dialog if sharing isn't available on this device. */
export async function printReceipt(success: SuccessInfo, orderTypeLabel: string, store: ReceiptStoreInfo): Promise<void> {
  const html = buildReceiptHtml(success, orderTypeLabel, store);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Print or Share Receipt',
    });
  } else {
    await Print.printAsync({ html });
  }
}
