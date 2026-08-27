export function formatRupees(amount: number): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const isWhole = Math.abs(abs - Math.round(abs)) < 1e-9;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: isWhole ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(isWhole ? Math.round(abs) : abs);
  return `${negative ? "-" : ""}₹${formatted}`;
}
