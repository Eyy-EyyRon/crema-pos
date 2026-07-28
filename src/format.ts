export function peso(n: number): string {
  return '₱' + n.toFixed(2);
}

export function peso0(n: number): string {
  return '₱' + n;
}
