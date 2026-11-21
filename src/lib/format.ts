export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatHectares(ha: number): string {
  if (ha >= 1000) {
    return `${(ha / 1000).toFixed(1)}k ha`;
  }
  return `${Math.round(ha).toLocaleString()} ha`;
}

export function formatPercent(pct: number, decimals: number = 1): string {
  return `${pct.toFixed(decimals)}%`;
}

export function formatChange(from: number, to: number): string {
  const change = to - from;
  const pctChange = from > 0 ? ((change / from) * 100).toFixed(0) : "N/A";
  const sign = change > 0 ? "+" : "";
  return `${sign}${pctChange}%`;
}
