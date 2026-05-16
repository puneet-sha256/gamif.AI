// Shard formatter: drops trailing zeros and adds thousands separators.
// 0       -> "0"
// 8.00    -> "8"
// 8.40    -> "8.4"
// 27.78   -> "27.78"
// 1234.5  -> "1,234.5"

export function formatShards(value: number | undefined | null): string {
  if (value == null || !isFinite(value)) return '0'
  const rounded = Math.round(value * 100) / 100
  // toLocaleString already drops insignificant trailing zeros when style is decimal
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
