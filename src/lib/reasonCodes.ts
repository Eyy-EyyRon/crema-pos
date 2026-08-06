// Fixed void/refund reason taxonomy — mirrored 1:1 in cafe-web-dashboard/lib/reasonCodes.ts
// (no shared package between the two repos, same convention as posOrder.ts).
export const REASON_CODES = [
  { code: 'customer_changed_mind', label: 'Customer Changed Mind' },
  { code: 'wrong_item_order', label: 'Wrong Item / Order' },
  { code: 'payment_issue', label: 'Payment Issue' },
  { code: 'quality_issue', label: 'Quality Issue' },
  { code: 'staff_error', label: 'Staff Error' },
  { code: 'other', label: 'Other' },
] as const;

export type ReasonCode = typeof REASON_CODES[number]['code'];

export const REASON_CODE_LABELS: Record<ReasonCode, string> = Object.fromEntries(
  REASON_CODES.map((r) => [r.code, r.label])
) as Record<ReasonCode, string>;
