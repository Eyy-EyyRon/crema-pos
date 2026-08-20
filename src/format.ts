export function peso(n: number): string {
  return '₱' + n.toFixed(2);
}

export function peso0(n: number): string {
  return '₱' + n;
}

/**
 * Daily ticket label shown on the queue / success / history.
 * New orders use `#0001`-style numbers (same as Order Type's "New Order · #0001").
 * Legacy `REC-…` ids drop the confusing prefix so baristas still get a readable call-out.
 */
export function formatOrderNo(no: string): string {
  if (!no) return no;
  if (no.startsWith('#')) return no;
  if (no.startsWith('REC-') || no.startsWith('rec-')) return `#${no.slice(4)}`;
  return `#${no}`;
}

/** Allocates the next daily ticket number to match OrderTypeScreen's preview. */
export function nextDailyOrderNo(todayOrderCount: number): string {
  return `#${String(Math.max(1, todayOrderCount + 1)).padStart(4, '0')}`;
}
